// Test HERE.com city discovery using browse endpoint
import axios from 'axios';
import { config } from 'dotenv';

config();

const HERE_API_KEY = process.env.HERE_API_KEY;

async function findCitiesNearby(lat, lon, radius) {
    try {
        // Convert radius from miles to meters
        const radiusMeters = Math.round(radius * 1609.34);
        
        // Use browse endpoint which supports circle search
        const response = await axios.get('https://browse.search.hereapi.com/v1/browse', {
            params: {
                apiKey: HERE_API_KEY,
                at: `${lat},${lon}`,
                categories: 'city-town-village',
                limit: 100,
                lang: 'en-US',
                // Specify circle area for search
                in: `circle:${lat},${lon};r=${radiusMeters}`
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
                    // Ensure it's actually a city
                    item.categories?.some(cat => 
                        cat.id.startsWith('city') || 
                        cat.id.startsWith('municipality')
                    )
                );
            })
            .map(item => ({
                city: item.address.city,
                state: item.address.state,
                county: item.address.county,
                distance: item.distance / 1609.34, // Convert meters to miles
                population: item.population,
                categories: item.categories.map(c => c.name)
            }))
            // Remove duplicates
            .filter((city, index, self) => 
                index === self.findIndex(c => 
                    c.city === city.city && 
                    c.state === city.state
                )
            )
            // Sort by distance
            .sort((a, b) => a.distance - b.distance);

        return cities;
    } catch (error) {
        console.error('HERE API Error:', error.response?.data || error.message);
        throw error;
    }
}

// Test cases
async function runTests() {
    console.log('🌎 Testing HERE.com City Discovery (Browse Method)');
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
                console.log(`• ${city.city}, ${city.state}${city.county ? ` (${city.county})` : ''}`);
                console.log(`  Distance: ${city.distance.toFixed(1)} miles`);
                if (city.population) {
                    console.log(`  Population: ${city.population.toLocaleString()}`);
                }
                if (city.categories?.length > 0) {
                    console.log(`  Type: ${city.categories.join(', ')}`);
                }
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
            const avgDistance = distances.reduce((a, b) => a + b, 0) / distances.length;
            console.log(`Average distance: ${avgDistance.toFixed(1)} miles`);
            console.log(`Distance range: ${Math.min(...distances).toFixed(1)} - ${Math.max(...distances).toFixed(1)} miles`);
            
        } catch (error) {
            console.error(`Error testing ${test.name}:`, error.message);
        }
    }
}

// Run the tests
runTests().catch(console.error);
