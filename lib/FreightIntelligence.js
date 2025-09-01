/**
 * FREIGHT INTELLIGENCE SYSTEM
 * Production-grade intelligence system for freight brokerage automation
 */

import axios from 'axios';
import { config } from 'dotenv';
import { adminSupabase } from '../utils/supabaseClient.js';
import { monitor } from './monitoring/logger.js';

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
        this.cityPairCache = new Map();
    }

    /**
     * Get usage statistics
     * @returns {Object} Object containing API calls and cache hits
     */
    getUsageStats() {
        return {
            apiCalls: this.apiCallCount,
            cacheHits: this.cacheHits
        };
    }

    /**
     * Generate unique city pairs ensuring KMA diversity
     * @param {Array} pickupCities - Array of potential pickup cities
     * @param {Array} deliveryCities - Array of potential delivery cities
     * @returns {Array} Array of unique city pairs
     */
    generateUniquePairs(pickupCities, deliveryCities) {
        const pairs = [];
        const usedPickupKmas = new Set();
        const usedDeliveryKmas = new Set();

        // Sort cities by market score and distance
        const sortedPickups = [...pickupCities].sort((a, b) => 
            (b.market_score || 0) - (a.market_score || 0) || a.distance - b.distance
        );
        const sortedDeliveries = [...deliveryCities].sort((a, b) => 
            (b.market_score || 0) - (a.market_score || 0) || a.distance - b.distance
        );

        for (const pickup of sortedPickups) {
            if (usedPickupKmas.has(pickup.kma_code)) continue;

            for (const delivery of sortedDeliveries) {
                if (usedDeliveryKmas.has(delivery.kma_code)) continue;

                pairs.push({
                    pickup: {
                        city: pickup.city,
                        state: pickup.state_or_province,
                        distance: pickup.distance,
                        kma: pickup.kma_code,
                        latitude: pickup.latitude,
                        longitude: pickup.longitude
                    },
                    delivery: {
                        city: delivery.city,
                        state: delivery.state_or_province,
                        distance: delivery.distance,
                        kma: delivery.kma_code,
                        latitude: delivery.latitude,
                        longitude: delivery.longitude
                    }
                });

                usedPickupKmas.add(pickup.kma_code);
                usedDeliveryKmas.add(delivery.kma_code);
                break;
            }

            // Keep generating pairs until we have at least 6, try for up to 11
            if (pairs.length >= 11) break; // Stop at maximum
            if (pairs.length >= 6) {
                // Check if we can find more diverse pairs
                const remainingPickups = sortedPickups.filter(p => !usedPickupKmas.has(p.kma_code));
                const remainingDeliveries = sortedDeliveries.filter(d => !usedDeliveryKmas.has(d.kma_code));
                
                // Stop if we can't make more diverse pairs
                if (!remainingPickups.length || !remainingDeliveries.length) break;
            }
        }

        // Validation of minimum requirement
        if (pairs.length < 6) {
            console.error(`Failed to generate minimum pairs. Found: ${pairs.length}. Required: 6`);
            console.error('Used KMAs - Pickup:', Array.from(usedPickupKmas));
            console.error('Used KMAs - Delivery:', Array.from(usedDeliveryKmas));
            throw new Error(`Could not generate minimum required 6 pairs with KMA diversity. Found: ${pairs.length}`);
        }

        return pairs;
    }

    /**
     * Score pairs using market data and equipment-specific factors
     * @param {Array} pairs - Array of city pairs to score
     * @param {string} equipment - Equipment code
     * @returns {Promise<Array>} Scored and sorted pairs
     */
    async scorePairsWithMarketData(pairs, equipment) {
        const scoredPairs = [];

        for (const pair of pairs) {
            const score = await this.calculateMarketScore(pair, equipment);
            scoredPairs.push({
                ...pair,
                score,
                geographic: {
                    pickup_distance: pair.pickup.distance,
                    delivery_distance: pair.delivery.distance,
                    pickup_kma: pair.pickup.kma,
                    delivery_kma: pair.delivery.kma
                }
            });
        }

        return scoredPairs.sort((a, b) => b.score - a.score);
    }

    /**
     * Calculate comprehensive market score for a pair
     * @param {Object} pair - City pair to score
     * @param {string} equipment - Equipment code
     * @returns {Promise<number>} Score between 0 and 1
     */
    async calculateMarketScore(pair, equipment) {
        const [pickupMarket, deliveryMarket] = await Promise.all([
            this.getMarketData(pair.pickup.kma, equipment),
            this.getMarketData(pair.delivery.kma, equipment)
        ]);

        const distanceScore = (
            (75 - pair.pickup.distance) / 75 * 0.3 +
            (75 - pair.delivery.distance) / 75 * 0.3
        );

        const marketScore = (
            (pickupMarket?.market_strength || 0.5) * 0.2 +
            (deliveryMarket?.market_strength || 0.5) * 0.2
        );

        return Math.min(1, Math.max(0, distanceScore + marketScore));
    }

    /**
     * Get market data for KMA and equipment type
     * @param {string} kma - KMA code
     * @param {string} equipment - Equipment code
     * @returns {Promise<Object>} Market data
     */
    async getMarketData(kma, equipment) {
        const { data } = await this.supabase
            .from('market_data')
            .select('*')
            .eq('kma_code', kma)
            .eq('equipment_code', equipment)
            .single();

        return data;
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
     * Generate diverse city pairs for a lane with market intelligence
     * @param {Object} params - Parameters for diverse pair generation
     * @param {Object} params.origin - Origin city object
     * @param {Object} params.destination - Destination city object
     * @param {string} params.equipment - Equipment code
     * @param {boolean} [params.preferFillTo10=false] - Whether to prefer 10 pairs
     * @param {Set} [params.usedCities=new Set()] - Set of already used cities
     * @returns {Promise<Array>} Array of scored and filtered pairs
     */
    async generateDiversePairs({
        origin,
        destination,
        equipment,
        preferFillTo10 = false,
        usedCities = new Set()
    }) {
        try {
            // Get cities from database
            const { data: originCity } = await this.supabase
                .from('cities')
                .select('*')
                .eq('city', origin.city)
                .eq('state_or_province', origin.state)
                .single();

            const { data: destCity } = await this.supabase
                .from('cities')
                .select('*')
                .eq('city', destination.city)
                .eq('state_or_province', destination.state)
                .single();

            if (!originCity || !destCity) {
                throw new Error('Could not find base cities');
            }

            // Find diverse nearby cities within 75-mile radius
            const pickupCities = await this.findDiverseNearbyCities(originCity, 75);
            const deliveryCities = await this.findDiverseNearbyCities(destCity, 75);

            // Filter out already used cities
            const filteredPickups = pickupCities.filter(city => 
                !usedCities.has(`${city.city}${city.state_or_province}`)
            );
            const filteredDeliveries = deliveryCities.filter(city => 
                !usedCities.has(`${city.city}${city.state_or_province}`)
            );

            // Generate minimum of 6 pairs, up to 10 if preferFillTo10 is true
            const targetPairs = preferFillTo10 ? 10 : 6;
            const pairs = this.generateUniquePairs(filteredPickups, filteredDeliveries)
                .slice(0, targetPairs);

            // Score the pairs with market intelligence
            const scoredPairs = await this.scorePairsWithMarketData(pairs, equipment);

            // Add used cities to the set
            scoredPairs.forEach(pair => {
                usedCities.add(`${pair.pickup.city}${pair.pickup.state}`);
                usedCities.add(`${pair.delivery.city}${pair.delivery.state}`);
            });

            return scoredPairs;
        } catch (error) {
            console.error('Error generating diverse pairs:', error);
            throw error;
        }
    }

    /**
     * Generate unique lane pairs ensuring KMA diversity and distance requirements
     * @param {Object} lane - Lane object with origin and destination details
     * @returns {Promise<Object>} Object containing pairs and base cities
     */
    async generateLanePairs(lane) {
        const operationId = `generate_pairs_${lane.id}_${Date.now()}`;
        monitor.startOperation(operationId, {
            lane_id: lane.id,
            origin: `${lane.origin_city}, ${lane.origin_state}`,
            destination: `${lane.dest_city}, ${lane.dest_state}`,
            equipment: lane.equipment_code
        });

        try {
            // Get base cities from database
            const { data: originCity } = await this.supabase
                .from('cities')
                .select('*')
                .eq('city', lane.origin_city)
                .eq('state_or_province', lane.origin_state_or_province)
                .single();

            const { data: destCity } = await this.supabase
                .from('cities')
                .select('*')
                .eq('city', lane.dest_city)
                .eq('state_or_province', lane.dest_state_or_province)
                .single();

            if (!originCity || !destCity) {
                throw new Error('Could not find base cities');
            }

            // Validate base city coordinates
            if (!originCity?.latitude || !originCity?.longitude || !destCity?.latitude || !destCity?.longitude) {
                throw new Error('Base cities must have valid coordinates');
            }

            // Find nearby cities with KMA diversity
            const pickupCities = await this.findDiverseNearbyCities(originCity, 75);
            const deliveryCities = await this.findDiverseNearbyCities(destCity, 75);

            // Generate unique pairs with market intelligence
            const pairs = this.generateUniquePairs(pickupCities, deliveryCities);

            // Score and sort the pairs
            const scoredPairs = await this.scorePairsWithMarketData(pairs, lane.equipment_code);

            const result = {
                pairs: scoredPairs.slice(0, Math.max(6, scoredPairs.length)),
                baseOrigin: originCity,
                baseDest: destCity
            };

            monitor.endOperation(operationId, {
                pairs_count: result.pairs.length,
                unique_kmas: new Set(result.pairs.map(p => p.pickup.kma)).size,
                success: true
            });

            // Monitor memory usage
            await monitor.monitorMemory();

            return result;
        } catch (error) {
            monitor.endOperation(operationId, { success: false, error: error.message });
            await monitor.logError(error, 'Error generating lane pairs', {
                lane_id: lane.id,
                equipment: lane.equipment_code
            });
            throw error;
        }
    }

    /**
     * Find cities nearby with unique KMA codes
     * @param {Object} baseCity - Base city object with coordinates
     * @param {number} radius - Search radius in miles
     * @returns {Promise<Array>} Array of cities with unique KMA codes
     */
    async findDiverseNearbyCities(baseCity, radius) {
        if (!baseCity?.latitude || !baseCity?.longitude) {
            throw new Error('Base city must have valid coordinates');
        }

        const { data: cities, error } = await this.supabase
            .from('cities')
            .select('*')
            .not('latitude', 'is', null)
            .not('longitude', 'is', null)
            .neq('latitude', 0)
            .neq('longitude', 0);
            
        // Calculate distances and filter by radius
        const withinRadius = cities
            .map(city => ({
                ...city,
                distance: this.calculateDistance(
                    baseCity.latitude, baseCity.longitude,
                    city.latitude, city.longitude
                )
            }))
            .filter(city => city.distance <= radius && city.distance > 0);

        // Group by KMA and take best city from each
        const kmaGroups = new Map();
        
        withinRadius.forEach(city => {
            if (!kmaGroups.has(city.kma_code) || 
                city.market_score > kmaGroups.get(city.kma_code).market_score) {
                kmaGroups.set(city.kma_code, city);
            }
        });

        return Array.from(kmaGroups.values());
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
        // Validate coordinates first
        if ([lat1, lon1, lat2, lon2].some(coord => !coord || isNaN(coord) || coord === undefined)) {
            throw new Error(`Invalid coordinates: ${lat1}, ${lon1}, ${lat2}, ${lon2}`);
        }

        try {
            const dLat = this.toRad(lat2 - lat1);
            const dLon = this.toRad(lon2 - lon1);
            const a = 
                Math.sin(dLat/2) * Math.sin(dLat/2) +
                Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) * 
                Math.sin(dLon/2) * Math.sin(dLon/2);
            const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
            return parseFloat((EARTH_RADIUS_MILES * c).toFixed(1));
        } catch (error) {
            throw new Error(`Distance calculation failed: ${error.message}`);
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
