// Test HERE API city search functionality
import axios from 'axios';

const HERE_API_KEY = process.env.HERE_API_KEY;

async function testHEREApi() {
    console.log('🌍 Testing HERE API Integration');
    console.log('=' .repeat(60));
    
    // Verify API key
    console.log('\n📝 API Key Check:');
    console.log(`API Key present: ${HERE_API_KEY ? '✅' : '❌'}`);
    console.log(`API Key length: ${HERE_API_KEY?.length || 0} characters`);
    
    // Test coordinates (Atlanta area)
    const testPoints = [
        {
            name: 'Atlanta Metro',
            lat: 33.7490,
            lng: -84.3880,
            radius: Math.round(75 * 1609.34) // 75 miles in meters, rounded to integer
        },
        {
            name: 'Charlotte Region',
            lat: 35.2271,
            lng: -80.8431,
            radius: Math.round(75 * 1609.34)
        }
    ];
    
    for (const point of testPoints) {
        console.log(`\n🔍 Testing location: ${point.name}`);
        
        try {
            // Format coordinates to 4 decimal places for consistency
            const lat = point.lat.toFixed(4);
            const lng = point.lng.toFixed(4);
            
            const response = await axios.get('https://discover.search.hereapi.com/v1/discover', {
                params: {
                    apiKey: HERE_API_KEY,
                    limit: 100,
                    q: 'city-town-village',
                    lang: 'en',
                    in: `circle:${lat},${lng};r=${point.radius}`
                },
                headers: {
                    'Accept': 'application/json'
                }
            });
            
            // Analyze results
            const cities = response.data.items;
            console.log(`✅ API call successful!`);
            console.log(`Found ${cities.length} cities/places`);
            
            // Show sample results
            console.log('\nSample cities found:');
            cities.slice(0, 5).forEach(city => {
                const distance = getDistance(
                    point.lat, 
                    point.lng,
                    city.position.lat,
                    city.position.lng
                );
                console.log(`• ${city.title} (${distance.toFixed(1)} miles)`);
            });
            
            // Check coverage
            const uniqueCities = new Set(cities.map(c => c.title));
            console.log(`\nUnique cities/places: ${uniqueCities.size}`);
            
        } catch (error) {
            console.error('❌ API Error:', error.response?.data || error.message);
            console.log('\nDebug Info:');
            console.log('URL:', error.config?.url);
            console.log('Params:', error.config?.params);
            console.log('Headers:', error.config?.headers);
        }
    }
}

// Helper function to calculate distance in miles
function getDistance(lat1, lon1, lat2, lon2) {
    const R = 3963; // Earth's radius in miles
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
    return deg * Math.PI / 180;
}

// Run the test
testHEREApi().catch(console.error);
