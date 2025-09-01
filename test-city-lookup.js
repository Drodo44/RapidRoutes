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
            // Use lookup endpoint with structured filtering
            const response = await axios.get('https://lookup.search.hereapi.com/v1/lookup', {
                params: {
                    apiKey: HERE_API_KEY,
                    at: `${location.lat},${location.lng}`,
                    limit: 100,
                    lang: 'en',
                    locationId: `here:cm:namedplace:${location.name.split(' ')[0].toLowerCase()}`,
                    show: 'boundaries'
                }
            });

            if (response.data && response.data.items) {
                console.log(`Found ${response.data.items.length} results\n`);
                
                response.data.items.forEach(item => {
                    const distance = calculateDistance(
                        location.lat, location.lng,
                        item.position.lat,
                        item.position.lng
                    );

                    if (distance <= 75) {
                        console.log(`• ${item.title}`);
                        if (item.address) {
                            console.log(`  Location: ${item.address.city || ''}, ${item.address.stateCode || ''}`);
                        }
                        console.log(`  Distance: ${distance.toFixed(1)} miles`);
                        console.log(`  Type: ${item.resultType}`);
                        console.log(`  ID: ${item.id}\n`);
                    }
                });
            }

        } catch (error) {
            if (error.response?.data) {
                console.error(`Error for ${location.name}:`, error.response.data);
            } else {
                console.error(`Error for ${location.name}:`, error.message);
            }
            
            // If lookup fails, try the discover endpoint
            try {
                console.log('\nTrying discover endpoint as fallback...');
                
                const response = await axios.get('https://discover.search.hereapi.com/v1/discover', {
                    params: {
                        apiKey: HERE_API_KEY,
                        at: `${location.lat},${location.lng}`,
                        limit: 100,
                        lang: 'en',
                        q: 'municipality'
                    }
                });

                if (response.data && response.data.items) {
                    // Filter for actual cities
                    const cities = response.data.items.filter(item => 
                        item.resultType === 'place' &&
                        item.address &&
                        item.address.stateCode &&
                        !item.title.toLowerCase().includes('street') &&
                        !item.title.toLowerCase().includes('road')
                    );

                    console.log(`Found ${cities.length} potential cities\n`);
                    
                    cities.forEach(item => {
                        const distance = calculateDistance(
                            location.lat, location.lng,
                            item.position.lat,
                            item.position.lng
                        );

                        if (distance <= 75) {
                            console.log(`• ${item.title}`);
                            console.log(`  State: ${item.address.stateCode}`);
                            console.log(`  Distance: ${distance.toFixed(1)} miles\n`);
                        }
                    });
                }
            } catch (fallbackError) {
                console.error('Fallback attempt also failed:', fallbackError.message);
            }
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
