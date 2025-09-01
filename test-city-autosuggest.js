import axios from 'axios';

const HERE_API_KEY = process.env.HERE_API_KEY;

async function testCityDiscovery() {
    // Test with actual TQL route coordinates
    const testLocations = [
        {
            name: "Charlotte Area",
            lat: 35.2271,
            lng: -80.8431
        },
        {
            name: "Atlanta Area",
            lat: 33.7490,
            lng: -84.3880
        }
    ];

    for (const location of testLocations) {
        console.log(`\n🌍 Testing ${location.name}`);
        console.log('='.repeat(60));

        try {
            // Use autosuggest with structured query
            const response = await axios.get('https://autosuggest.search.hereapi.com/v1/autosuggest', {
                params: {
                    apiKey: HERE_API_KEY,
                    at: `${location.lat},${location.lng}`,
                    limit: 100,
                    lang: 'en',
                    types: 'city,place',
                    q: `cities near ${location.name}`
                }
            });

            if (response.data && response.data.items) {
                // Filter for actual cities
                const cities = response.data.items.filter(item => {
                    // Must be a city result
                    if (!item.resultType || !['city', 'place'].includes(item.resultType)) {
                        return false;
                    }

                    // Must have proper address data
                    if (!item.address || !item.address.state || !item.address.city) {
                        return false;
                    }

                    return true;
                });

                console.log(`Found ${cities.length} verified cities\n`);
                
                cities.forEach(item => {
                    const distance = calculateDistance(
                        location.lat, location.lng,
                        item.position.lat,
                        item.position.lng
                    );

                    if (distance <= 75) { // Verify within 75 miles
                        console.log(`• ${item.address.city}, ${item.address.state}`);
                        console.log(`  Type: ${item.resultType}`);
                        console.log(`  Distance: ${distance.toFixed(1)} miles`);
                        console.log(`  Coordinates: ${item.position.lat}, ${item.position.lng}\n`);
                    }
                });

                // Analyze state coverage
                const stateCount = new Map();
                cities.forEach(item => {
                    const state = item.address.state;
                    stateCount.set(state, (stateCount.get(state) || 0) + 1);
                });

                console.log('\n📊 State Coverage:');
                for (const [state, count] of stateCount.entries()) {
                    console.log(`${state}: ${count} cities`);
                }
            }

        } catch (error) {
            console.error(`Error for ${location.name}:`, 
                error.response?.data || error.message);
        }
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

function toRad(degrees) {
    return degrees * Math.PI / 180;
}

// Run the improved city discovery test
testCityDiscovery().catch(console.error);
