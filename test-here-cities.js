import axios from 'axios';

const HERE_API_KEY = process.env.HERE_API_KEY;

async function testHereCitySearch() {
    // Test coordinates (Charlotte, NC area)
    const lat = 35.2271;
    const lng = -80.8431;
    const radius = 75 * 1609.34; // 75 miles in meters

    try {
        // Use browse instead of discover endpoint
        const response = await axios.get('https://browse.search.hereapi.com/v1/browse', {
            params: {
                apiKey: HERE_API_KEY,
                at: `${lat},${lng}`,
                limit: 100,
                categories: '100-1000-0000',  // Focus on cities first
                radius: Math.round(radius),
                lang: 'en',
                politicalView: 'USA'
            }
        });

        console.log('🌍 HERE API City Search Results:');
        console.log('='.repeat(60));

        if (response.data && response.data.items) {
            console.log(`Found ${response.data.items.length} cities/towns\n`);
            
            response.data.items
                .filter(item => 
                    // Filter out non-city results
                    item.categories.some(cat => 
                        cat.id.startsWith('city') || 
                        cat.id.startsWith('town') || 
                        cat.id.startsWith('village')
                    )
                )
                .forEach(item => {
                    // Calculate distance in miles
                    const distance = calculateDistance(
                        lat, lng,
                        item.position.lat,
                        item.position.lng
                    );

                    console.log(`• ${item.title} (${distance.toFixed(1)} miles)`);
                    console.log(`  Type: ${item.categories[0].name}`);
                    console.log(`  Location: ${item.address.city}, ${item.address.stateCode}`);
                    console.log(`  Coordinates: ${item.position.lat}, ${item.position.lng}\n`);
                });
        }

    } catch (error) {
        if (error.response) {
            console.error('HERE API Error:', {
                status: error.response.status,
                data: error.response.data
            });
        } else {
            console.error('HERE API Error:', error.message);
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

// Run the test
testHereCitySearch().catch(console.error);
