// Test HERE.com city discovery with proper parameters
import axios from 'axios';
import { config } from 'dotenv';

config();

const HERE_API_KEY = process.env.HERE_API_KEY;

async function findCitiesNearby(lat, lon, radius) {
    try {
        // Convert radius from miles to meters
        const radiusMeters = Math.round(radius * 1609.34);
        
        // Use geocode endpoint for better city-level results
        const response = await axios.get('https://geocode.search.hereapi.com/v1/geocode', {
            params: {
                apiKey: HERE_API_KEY,
                qq: `city;country=USA;state=${getStateFromCoords(lat, lon)}`,
                in: `circle:${lat},${lon};r=${radiusMeters}`,
                limit: 100,
                lang: 'en-US'
            }
        });

        if (!response.data || !response.data.items) {
            throw new Error('No results found');
        }

        // Filter and clean results
        const cities = response.data.items
            .filter(item => {
                return (
                    // Ensure we only get city-level results
                    item.resultType === 'locality' &&
                    item.localityType === 'city' &&
                    item.address &&
                    item.address.city &&
                    item.address.countryCode === 'USA' &&
                    item.address.state
                );
            })
            .map(item => ({
                city: item.address.city,
                state: item.address.state,
                county: item.address.county,
                distance: calculateDistance(lat, lon, item.position.lat, item.position.lng),
                confidence: item.scoring?.confidence || 0
            }))
            // Sort by confidence and distance
            .sort((a, b) => {
                if (b.confidence !== a.confidence) {
                    return b.confidence - a.confidence;
                }
                return a.distance - b.distance;
            });

        return cities;
    } catch (error) {
        console.error('HERE API Error:', error.response?.data || error.message);
        throw error;
    }
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

// Helper function to get state from coordinates
function getStateFromCoords(lat, lon) {
    // Rough state boundaries - can be expanded
    if (lat > 33.7 && lat < 36.5 && lon > -84.3 && lon < -75.4) {
        return 'NC';
    }
    if (lat > 30.3 && lat < 35.0 && lon > -85.6 && lon < -81.3) {
        return 'GA';
    }
    // Add more states as needed
    return '';  // Empty string means no state filter
}

// Test cases
async function runTests() {
    console.log('🌎 Testing HERE.com City Discovery (Geocoding Method)');
    console.log('='.repeat(60));

    const testCases = [
        {
            name: 'Charlotte Metro Area',
            lat: 35.2271,
            lon: -80.8431,
            radius: 75,
            state: 'NC'
        },
        {
            name: 'Statesville Region',
            lat: 35.7842,
            lon: -80.8713,
            radius: 75,
            state: 'NC'
        },
        {
            name: 'Rural Manufacturing Hub',
            lat: 34.9207,
            lon: -81.0251,
            radius: 75,
            state: 'SC'
        }
    ];

    for (const test of testCases) {
        console.log(`\n📍 Testing: ${test.name}`);
        console.log(`Location: ${test.lat}, ${test.lon}`);
        console.log(`Radius: ${test.radius} miles`);
        console.log(`Target State: ${test.state}`);

        try {
            const cities = await findCitiesNearby(test.lat, test.lon, test.radius);
            
            console.log('\nCities found:');
            cities.forEach(city => {
                console.log(`• ${city.city}, ${city.state}${city.county ? ` (${city.county})` : ''} - ${city.distance.toFixed(1)} miles`);
            });

            // Analysis
            console.log('\nResults Analysis:');
            console.log(`Total cities found: ${cities.length}`);
            const uniqueStates = new Set(cities.map(c => c.state));
            console.log(`States covered: ${Array.from(uniqueStates).join(', ')}`);
            const uniqueCounties = new Set(cities.filter(c => c.county).map(c => c.county));
            console.log(`Counties covered: ${Array.from(uniqueCounties).join(', ')}`);
            
            // Distance analysis
            const distances = cities.map(c => c.distance);
            const avgDistance = distances.reduce((a, b) => a + b, 0) / distances.length;
            console.log(`Average distance: ${avgDistance.toFixed(1)} miles`);
            
        } catch (error) {
            console.error(`Error testing ${test.name}:`, error.message);
        }
    }
}

// Run the tests
runTests().catch(console.error);
