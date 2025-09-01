// Test HERE.com city discovery with actual TQL lanes
import axios from 'axios';
import { config } from 'dotenv';
import { adminSupabase } from './utils/supabaseClient.js';

config();

const HERE_API_KEY = process.env.HERE_API_KEY;

async function findCitiesNearby(lat, lon, radius) {
    try {
        // First, get the city at the given coordinates
        const reverseGeocode = await axios.get('https://revgeocode.search.hereapi.com/v1/revgeocode', {
            params: {
                apiKey: HERE_API_KEY,
                at: `${lat},${lon}`,
                lang: 'en-US'
            }
        });

        if (!reverseGeocode.data || !reverseGeocode.data.items || reverseGeocode.data.items.length === 0) {
            throw new Error('Could not determine base city');
        }

        const baseCity = reverseGeocode.data.items[0];
        console.log('\nBase location:', baseCity.address.city, baseCity.address.state);

        // Generate a grid of points around the center point
        const points = generateSearchGrid(lat, lon, radius, 5);
        console.log(`Generated ${points.length} search points`);

        // Search from each point
        const allCities = new Map(); // Use map to deduplicate
        
        for (const point of points) {
            const response = await axios.get('https://revgeocode.search.hereapi.com/v1/revgeocode', {
                params: {
                    apiKey: HERE_API_KEY,
                    at: `${point.lat},${point.lon}`,
                    lang: 'en-US'
                }
            });

            if (response.data && response.data.items) {
                response.data.items
                    .filter(item => {
                        return (
                            item.address &&
                            item.address.city &&
                            item.address.countryCode === 'USA' &&
                            item.address.state &&
                            // Additional validation
                            !item.address.city.toLowerCase().includes('township') &&
                            !item.address.city.toLowerCase().includes('county')
                        );
                    })
                    .forEach(item => {
                        const key = `${item.address.city}|${item.address.state}`;
                        if (!allCities.has(key)) {
                            allCities.set(key, {
                                city: item.address.city,
                                state: item.address.stateCode || item.address.state,
                                county: item.address.county,
                                distance: calculateDistance(lat, lon, item.position.lat, item.position.lng),
                                position: item.position
                            });
                        }
                    });
            }
        }

        // Convert to array and sort by distance
        const cities = Array.from(allCities.values())
            .sort((a, b) => a.distance - b.distance)
            // Limit to cities within radius
            .filter(city => city.distance <= radius);

        return cities;
    } catch (error) {
        console.error('HERE API Error:', error.response?.data || error.message);
        throw error;
    }
}

// Generate a grid of points to search from
function generateSearchGrid(centerLat, centerLon, radius, points) {
    const result = [{lat: centerLat, lon: centerLon}]; // Center point
    const radiusInDegrees = radius / 69; // Rough conversion from miles to degrees

    // Generate points in a grid pattern
    for (let i = 1; i <= points; i++) {
        const angle = (2 * Math.PI * i) / points;
        const distance = radiusInDegrees * (i / points);
        
        result.push({
            lat: centerLat + distance * Math.cos(angle),
            lon: centerLon + distance * Math.sin(angle)
        });
        
        if (i > 1) {
            // Add points at half radius too
            result.push({
                lat: centerLat + (distance/2) * Math.cos(angle),
                lon: centerLon + (distance/2) * Math.sin(angle)
            });
        }
    }

    return result;
}

// Helper function to calculate distance in miles
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 3959; // Earth's radius in miles
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a = 
        Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * 
        Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
}

function toRad(deg) {
    return deg * (Math.PI/180);
}

// Test with actual TQL lanes
async function runTQLTests() {
    console.log('🌎 Testing HERE.com City Discovery with TQL Lanes');
    console.log('='.repeat(60));

    try {
        // Get actual TQL lanes
        const { data: lanes, error } = await adminSupabase
            .from('lanes')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(5);

        if (error) throw error;

        console.log(`Testing ${lanes.length} recent TQL lanes`);

        for (const lane of lanes) {
            // Get origin city details
            const { data: originCity } = await adminSupabase
                .from('cities')
                .select('*')
                .eq('city', lane.origin_city)
                .eq('state_or_province', lane.origin_state)
                .single();

            // Get destination city details
            const { data: destCity } = await adminSupabase
                .from('cities')
                .select('*')
                .eq('city', lane.dest_city)
                .eq('state_or_province', lane.dest_state)
                .single();

            if (!originCity || !destCity) {
                console.error('Could not find city data for lane:', lane);
                continue;
            }

            console.log(`\n📍 Testing Lane: ${lane.origin_city}, ${lane.origin_state} → ${lane.dest_city}, ${lane.dest_state}`);
            console.log(`Equipment: ${lane.equipment_code}`);
            console.log(`Status: ${lane.status}`);

            // Test origin area
            console.log('\nORIGIN AREA CITIES:');
            const originCities = await findCitiesNearby(originCity.latitude, originCity.longitude, 75);
            
            console.log('\nCities found near origin:');
            originCities.forEach(city => {
                console.log(`• ${city.city}, ${city.state}`);
                console.log(`  Distance: ${city.distance.toFixed(1)} miles`);
                if (city.county) {
                    console.log(`  County: ${city.county}`);
                }
            });

            // Test destination area
            console.log('\nDESTINATION AREA CITIES:');
            const destCities = await findCitiesNearby(destCity.latitude, destCity.longitude, 75);
            
            console.log('\nCities found near destination:');
            destCities.forEach(city => {
                console.log(`• ${city.city}, ${city.state}`);
                console.log(`  Distance: ${city.distance.toFixed(1)} miles`);
                if (city.county) {
                    console.log(`  County: ${city.county}`);
                }
            });

            // Analysis
            console.log('\nLane Analysis:');
            console.log(`Origin cities found: ${originCities.length}`);
            console.log(`Destination cities found: ${destCities.length}`);
            console.log(`Total potential city pairs: ${originCities.length * destCities.length}`);
            
            const originStates = new Set(originCities.map(c => c.state));
            const destStates = new Set(destCities.map(c => c.state));
            console.log(`Origin states covered: ${Array.from(originStates).join(', ')}`);
            console.log(`Destination states covered: ${Array.from(destStates).join(', ')}`);
        }

    } catch (error) {
        console.error('Error running TQL tests:', error);
    }
}

// Run the tests with actual TQL lanes
runTQLTests().catch(console.error);
