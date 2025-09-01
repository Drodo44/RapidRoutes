// Test HERE.com city discovery using reverse geocoding + chain search
import axios from 'axios';
import { config } from 'dotenv';

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

// Test cases
async function runTests() {
    console.log('🌎 Testing HERE.com City Discovery (Grid Search Method)');
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
                console.log(`• ${city.city}, ${city.state}`);
                console.log(`  Distance: ${city.distance.toFixed(1)} miles`);
                if (city.county) {
                    console.log(`  County: ${city.county}`);
                }
                console.log(`  Coordinates: ${city.position.lat}, ${city.position.lng}`);
            });

            // Analysis
            console.log('\nResults Analysis:');
            console.log(`Total cities found: ${cities.length}`);
            const uniqueStates = new Set(cities.map(c => c.state));
            console.log(`States covered: ${Array.from(uniqueStates).join(', ')}`);
            const uniqueCounties = new Set(cities.filter(c => c.county).map(c => c.county));
            if (uniqueCounties.size > 0) {
                console.log(`Counties covered: ${Array.from(uniqueCounties).join(', ')}`);
            }
            
            // Distance distribution
            const distances = cities.map(c => c.distance);
            if (distances.length > 0) {
                const avgDistance = distances.reduce((a, b) => a + b, 0) / distances.length;
                console.log(`Average distance: ${avgDistance.toFixed(1)} miles`);
                console.log(`Distance range: ${Math.min(...distances).toFixed(1)} - ${Math.max(...distances).toFixed(1)} miles`);
            }
            
        } catch (error) {
            console.error(`Error testing ${test.name}:`, error.message);
        }
    }
}

// Run the tests
runTests().catch(console.error);
