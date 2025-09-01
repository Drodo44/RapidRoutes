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

        const radius = 75 * 1609.34; // 75 miles in meters

        try {
            const response = await axios.get('https://discover.search.hereapi.com/v1/discover', {
                params: {
                    apiKey: HERE_API_KEY,
                    q: 'city',
                    'in': `circle:${location.lat},${location.lng};r=${Math.round(radius)}`,
                    limit: 100,
                    lang: 'en'
                },
                headers: {
                    'Accept-Language': 'en-US'
                }
            });

            if (response.data && response.data.items) {
                // Filter for actual cities
                const cities = response.data.items.filter(item => {
                    // Must be in the US with a state code
                    if (!item.address || !item.address.stateCode || item.address.countryCode !== 'USA') {
                        return false;
                    }

                    // Check the title and category
                    const title = item.title.toLowerCase();
                    return title.includes('city') || 
                           title.includes('town') || 
                           title.endsWith('ville') ||
                           title.endsWith('burg') ||
                           title.endsWith('ton');
                });

                console.log(`Found ${cities.length} potential cities\n`);
                
                cities.forEach(item => {
                    const distance = calculateDistance(
                        location.lat, location.lng,
                        item.position.lat,
                        item.position.lng
                    );

                    if (distance <= 75) { // Verify within 75 miles
                        console.log(`• ${item.title}`);
                        console.log(`  State: ${item.address.stateCode}`);
                        console.log(`  Distance: ${distance.toFixed(1)} miles`);
                        console.log(`  Coordinates: ${item.position.lat}, ${item.position.lng}\n`);
                    }
                });

                // Analyze state coverage
                const stateCount = new Map();
                cities.forEach(item => {
                    const state = item.address.stateCode;
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
