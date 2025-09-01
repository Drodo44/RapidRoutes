// Test HERE.com city discovery using autosuggest endpoint
import axios from 'axios';
import { config } from 'dotenv';

config();

const HERE_API_KEY = process.env.HERE_API_KEY;

async function findCitiesNearby(lat, lon, radius) {
    try {
        // Use autosuggest endpoint with municipality filter
        const response = await axios.get('https://autosuggest.search.hereapi.com/v1/autosuggest', {
            params: {
                apiKey: HERE_API_KEY,
                at: `${lat},${lon}`,
                limit: 100,
                lang: 'en-US',
                // Query specifically for cities/municipalities
                q: 'city',
                // Specific types for municipalities
                types: 'city,municipality',
                // Geographic filters
                in: `countryCode:USA`,
                politicalView: 'USA'
            }
        });

        if (!response.data || !response.data.items) {
            throw new Error('No results found');
        }

        // Filter and clean results
        const cities = response.data.items
            .filter(item => {
                return (
                    item.address &&
                    item.address.city &&
                    item.address.countryCode === 'USA' &&
                    item.address.state &&
                    // Only include actual cities
                    (item.resultType === 'locality' || 
                     item.resultType === 'administrativeArea') &&
                    // Filter out non-city results
                    !item.title.includes('Street') &&
                    !item.title.includes('Road') &&
                    !item.title.includes('Ave') &&
                    !item.title.includes('Highway')
                );
            })
            .map(item => ({
                city: item.address.city,
                state: item.address.stateCode || item.address.state,
                county: item.address.county,
                distance: calculateDistance(lat, lon, item.position.lat, item.position.lng),
                type: item.resultType,
                title: item.title,
                highlights: item.highlights
            }))
            // Remove duplicates
            .filter((city, index, self) => 
                index === self.findIndex(c => 
                    c.city === city.city && 
                    c.state === city.state
                )
            )
            // Sort by distance
            .sort((a, b) => a.distance - b.distance)
            // Limit to actual cities within radius
            .filter(city => city.distance <= radius);

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

// Test cases
async function runTests() {
    console.log('🌎 Testing HERE.com City Discovery (Autosuggest Method)');
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
                console.log(`• ${city.title}`);
                console.log(`  Location: ${city.city}, ${city.state}${city.county ? ` (${city.county})` : ''}`);
                console.log(`  Distance: ${city.distance.toFixed(1)} miles`);
                console.log(`  Type: ${city.type}`);
            });

            // Analysis
            console.log('\nResults Analysis:');
            console.log(`Total cities found: ${cities.length}`);
            const uniqueStates = new Set(cities.map(c => c.state));
            console.log(`States covered: ${Array.from(uniqueStates).join(', ')}`);
            const uniqueCounties = new Set(cities.filter(c => c.county).map(c => c.county));
            console.log(`Counties covered: ${Array.from(uniqueCounties).join(', ')}`);
            
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
