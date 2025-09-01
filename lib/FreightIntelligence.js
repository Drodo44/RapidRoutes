/**
 * FREIGHT INTELLIGENCE SYSTEM
 * Production-grade intelligence system for freight brokerage automation
 */

import axios from 'axios';
import { config } from 'dotenv';
import { adminSupabase } from '../utils/supabaseClient.js';

config();

// Global constants
const API_RATE_LIMIT_DELAY = 100; // ms between API calls
const MAX_RETRIES = 3;
const EARTH_RADIUS_MILES = 3959;

/**
 * FreightIntelligence class for managing freight brokerage intelligence operations
 */
export class FreightIntelligence {
    constructor() {
        this.supabase = adminSupabase;
        this.apiCallCount = 0;
        this.cacheHits = 0;
    }

    /**
     * Generate a unique hash for a city pair
     * @param {string} originCity - Origin city name
     * @param {string} originState - Origin state code
     * @param {string} destCity - Destination city name
     * @param {string} destState - Destination state code
     * @returns {string} Uppercase hash of the city pair
     */
    generateCityPairHash(originCity, originState, destCity, destState) {
        return `${originCity}_${originState}_${destCity}_${destState}`.toUpperCase();
    }

    /**
     * Check if a city pair exists in the database
     * @param {string} originCity - Origin city name
     * @param {string} originState - Origin state code
     * @param {string} destCity - Destination city name
     * @param {string} destState - Destination state code
     * @returns {Promise<Object|null>} City pair data or null if not found
     */
    async getCityPair(originCity, originState, destCity, destState) {
        try {
            const hash = this.generateCityPairHash(originCity, originState, destCity, destState);
            
            const { data, error } = await this.supabase
                .from('freight_intelligence')
                .select('*')
                .eq('city_pair_hash', hash)
                .single();

            if (error && error.code !== 'PGRST116') { // PGRST116 is "not found"
                console.error('Database lookup error:', error);
                return null;
            }

            if (data) {
                this.cacheHits++;
            }

            return data;
        } catch (error) {
            console.error('Error in getCityPair:', error);
            return null;
        }
    }

    /**
     * Find cities using HERE API with robust error handling and caching
     * @param {number} lat - Latitude of center point
     * @param {number} lon - Longitude of center point
     * @param {number} [radius=75] - Search radius in miles
     * @returns {Promise<Array<Object>>} Array of city objects with coordinates and distances
     */
    async findAndCacheCitiesNearby(lat, lon, radius = 75) {
        try {
            if (!lat || !lon || isNaN(lat) || isNaN(lon)) {
                throw new Error('Invalid coordinates provided');
            }
            
            this.apiCallCount++;
            
            const points = this.generateSearchGrid(lat, lon, radius, 5);
            const allCities = new Map();
            
            const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

            for (const point of points) {
                try {
                    const response = await axios.get('https://revgeocode.search.hereapi.com/v1/revgeocode', {
                        params: {
                            apiKey: process.env.HERE_API_KEY,
                            at: `${point.lat},${point.lon}`,
                            lang: 'en-US'
                        }
                    });

                    if (response.data?.items) {
                        response.data.items
                            .filter(item => (
                                item.address &&
                                item.address.city &&
                                item.address.countryCode === 'USA' &&
                                item.address.state &&
                                !item.address.city.toLowerCase().includes('township') &&
                                !item.address.city.toLowerCase().includes('county')
                            ))
                            .forEach(item => {
                                const key = `${item.address.city}|${item.address.state}`;
                                if (!allCities.has(key)) {
                                    allCities.set(key, {
                                        city: item.address.city,
                                        state: item.address.stateCode || item.address.state,
                                        county: item.address.county,
                                        distance: this.calculateDistance(lat, lon, item.position.lat, item.position.lng),
                                        lat: item.position.lat,
                                        lon: item.position.lng
                                    });
                                }
                            });
                    }
                    await delay(API_RATE_LIMIT_DELAY);
                } catch (error) {
                    console.error('HERE API Error for point:', point, error.response?.data || error.message);
                    continue;
                }
            }

            return Array.from(allCities.values())
                .sort((a, b) => a.distance - b.distance)
                .filter(city => city.distance <= radius);
        } catch (error) {
            console.error('Error in findAndCacheCitiesNearby:', error);
            return [];
        }
    }

    /**
     * Generate an optimized grid of points for geographic search
     * @param {number} centerLat - Center latitude
     * @param {number} centerLon - Center longitude
     * @param {number} radius - Search radius in miles
     * @param {number} points - Number of points to generate
     * @returns {Array<Object>} Array of {lat, lon} coordinate pairs
     */
    generateSearchGrid(centerLat, centerLon, radius, points) {
        try {
            const result = [{lat: centerLat, lon: centerLon}];
            const radiusInDegrees = radius / 69; // Approximate degrees per mile at mid-latitudes

            for (let i = 1; i <= points; i++) {
                const angle = (2 * Math.PI * i) / points;
                const distance = radiusInDegrees * (i / points);
                
                result.push({
                    lat: centerLat + distance * Math.cos(angle),
                    lon: centerLon + distance * Math.sin(angle)
                });
                
                if (i > 1) {
                    result.push({
                        lat: centerLat + (distance/2) * Math.cos(angle),
                        lon: centerLon + (distance/2) * Math.sin(angle)
                    });
                }
            }

            return result;
        } catch (error) {
            console.error('Error generating search grid:', error);
            return [{lat: centerLat, lon: centerLon}];
        }
    }

    /**
     * Calculate great-circle distance between two points
     * @param {number} lat1 - First point latitude
     * @param {number} lon1 - First point longitude
     * @param {number} lat2 - Second point latitude
     * @param {number} lon2 - Second point longitude
     * @returns {number} Distance in miles
     */
    calculateDistance(lat1, lon1, lat2, lon2) {
        try {
            if ([lat1, lon1, lat2, lon2].some(coord => !coord || isNaN(coord))) {
                throw new Error('Invalid coordinates for distance calculation');
            }

            const dLat = this.toRad(lat2 - lat1);
            const dLon = this.toRad(lon2 - lon1);
            const a = 
                Math.sin(dLat/2) * Math.sin(dLat/2) +
                Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) * 
                Math.sin(dLon/2) * Math.sin(dLon/2);
            const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
            return parseFloat((EARTH_RADIUS_MILES * c).toFixed(1));
        } catch (error) {
            console.error('Error calculating distance:', error);
            return 0;
        }
    }

    /**
     * Convert degrees to radians
     * @param {number} deg - Angle in degrees
     * @returns {number} Angle in radians
     */
    toRad(deg) {
        try {
            if (typeof deg !== 'number' || isNaN(deg)) {
                throw new Error('Invalid degree value');
            }
            return deg * (Math.PI/180);
        } catch (error) {
            console.error('Error converting to radians:', error);
            return 0;
        }
    }

    /**
     * Store or update a city pair in the database
     * @param {string} originCity - Origin city name
     * @param {string} originState - Origin state code
     * @param {string} destCity - Destination city name
     * @param {string} destState - Destination state code
     * @param {Array<Object>} originCities - List of origin city alternatives
     * @param {Array<Object>} destCities - List of destination city alternatives
     * @param {string} equipment - Equipment type code
     * @returns {Promise<Object|null>} Stored city pair data or null if operation failed
     */
    async storeCityPair(originCity, originState, destCity, destState, originCities, destCities, equipment) {
        try {
            if (!originCity || !originState || !destCity || !destState) {
                throw new Error('Missing required city/state data');
            }

            if (!Array.isArray(originCities) || !Array.isArray(destCities) || 
                originCities.length === 0 || destCities.length === 0) {
                throw new Error('Invalid cities data');
            }

            const hash = this.generateCityPairHash(originCity, originState, destCity, destState);
            
            let baseMiles = 0;
            try {
                baseMiles = this.calculateDistance(
                    parseFloat(originCities[0].lat),
                    parseFloat(originCities[0].lon),
                    parseFloat(destCities[0].lat),
                    parseFloat(destCities[0].lon)
                );
            } catch (error) {
                console.error('Distance calculation error:', error);
            }

            const cleanOriginCities = originCities.map(city => ({
                city: city.city,
                state: city.state,
                county: city.county || null,
                distance: parseFloat(city.distance.toFixed(1)),
                coordinates: {
                    lat: parseFloat(city.lat),
                    lon: parseFloat(city.lon)
                }
            }));

            const cleanDestCities = destCities.map(city => ({
                city: city.city,
                state: city.state,
                county: city.county || null,
                distance: parseFloat(city.distance.toFixed(1)),
                coordinates: {
                    lat: parseFloat(city.lat),
                    lon: parseFloat(city.lon)
                }
            }));

            const cityPairData = {
                city_pair_hash: hash,
                origin_data: {
                    base_city: originCity,
                    base_state: originState,
                    surrounding_cities: cleanOriginCities
                },
                dest_data: {
                    base_city: destCity,
                    base_state: destState,
                    surrounding_cities: cleanDestCities
                },
                equipment_patterns: {
                    [equipment]: 1
                },
                states_crossed: [...new Set([originState, destState])],
                distance_miles: baseMiles,
                metadata: {
                    total_origin_cities: cleanOriginCities.length,
                    total_dest_cities: cleanDestCities.length,
                    potential_pairs: cleanOriginCities.length * cleanDestCities.length,
                    origin_states: [...new Set(cleanOriginCities.map(c => c.state))],
                    dest_states: [...new Set(cleanDestCities.map(c => c.state))]
                }
            };

            const { data, error } = await this.supabase
                .from('freight_intelligence')
                .upsert([cityPairData], {
                    onConflict: 'city_pair_hash',
                    returning: true
                });

            if (error) {
                console.error('Error storing city pair:', error);
                return null;
            }

            return data[0];
        } catch (error) {
            console.error('Error in storeCityPair:', error);
            return null;
        }
    }

    /**
     * Update usage statistics for a city pair with retry logic
     * @param {string} cityPairHash - Hash identifying the city pair
     * @param {string} equipment - Equipment type code
     * @param {number} [retries=3] - Number of retry attempts
     * @returns {Promise<Object|null>} Updated city pair data or null if update failed
     */
    async updateUsage(cityPairHash, equipment, retries = MAX_RETRIES) {
        try {
            const { data: current } = await this.supabase
                .from('freight_intelligence')
                .select('usage_frequency, equipment_patterns')
                .eq('city_pair_hash', cityPairHash)
                .single();

            if (!current && retries > 0) {
                await new Promise(resolve => setTimeout(resolve, 1000));
                return this.updateUsage(cityPairHash, equipment, retries - 1);
            }

            if (!current) return null;

            const newEquipmentPatterns = { ...current.equipment_patterns };
            newEquipmentPatterns[equipment] = (newEquipmentPatterns[equipment] || 0) + 1;

            const { data, error } = await this.supabase
                .from('freight_intelligence')
                .update({
                    usage_frequency: (current.usage_frequency || 0) + 1,
                    equipment_patterns: newEquipmentPatterns,
                    last_used: new Date().toISOString()
                })
                .eq('city_pair_hash', cityPairHash)
                .select()
                .single();

            if (error) {
                console.error('Error updating usage:', error);
                if (retries > 0) {
                    await new Promise(resolve => setTimeout(resolve, 1000));
                    return this.updateUsage(cityPairHash, equipment, retries - 1);
                }
                return null;
            }

            return data;
        } catch (error) {
            console.error('Error in updateUsage:', error);
            if (retries > 0) {
                await new Promise(resolve => setTimeout(resolve, 1000));
                return this.updateUsage(cityPairHash, equipment, retries - 1);
            }
            return null;
        }
    }

    /**
     * Get current statistics about the intelligence system
     * @returns {Object} Statistics including API calls and cache performance
     */
    getStats() {
        return {
            apiCalls: this.apiCallCount,
            cacheHits: this.cacheHits,
            cacheHitRate: this.apiCallCount ? 
                ((this.cacheHits / (this.cacheHits + this.apiCallCount)) * 100).toFixed(1) + '%' : 
                '0%'
        };
    }
}
