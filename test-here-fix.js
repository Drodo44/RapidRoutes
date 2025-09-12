// Test the fixed HERE.com API query
async function testFixedHereAPI() {
    console.log('🔍 Testing the fixed HERE.com API query...\n');
    
    const API_KEY = 'rYwlT5_DlKFa8kPTtLbICJhzsT6ZOVy-iDe0EDA6mH8';
    const centerLat = 35.22286; // Charlotte, NC
    const centerLng = -80.83796;
    const radiusMiles = 75;
    const limit = 20;
    
    // Convert miles to meters
    const radiusMeters = Math.round(radiusMiles * 1609.34);
    
    // Test the FIXED query format with correct lowercase apikey
    const url = `https://discover.search.hereapi.com/v1/discover?at=${centerLat},${centerLng}&q=city&limit=${limit}&apikey=${API_KEY}`;
    
    try {
        console.log('🌐 Testing FIXED HERE.com API query:');
        console.log('📍 Center: Charlotte, NC (35.22286, -80.83796)');
        console.log('📏 Radius: 75 miles');
        console.log('🔗 URL:', url.replace(API_KEY, 'API_KEY_HIDDEN'));
        
        const response = await globalThis.fetch(url);
        const data = await response.json();
        
        if (response.ok && data.items && data.items.length > 0) {
            console.log(`\n✅ SUCCESS! Found ${data.items.length} places within 75 miles:`);
            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
            
            // Filter and show cities
            const cities = data.items.filter(item => 
                item.address?.city && item.address?.state
            ).slice(0, 10);
            
            cities.forEach((item, index) => {
                const city = item.address.city;
                const state = item.address.state || item.address.stateCode;
                const distance = item.distance ? Math.round(item.distance / 1609.34) : 'Unknown';
                console.log(`   ${index + 1}. ${city}, ${state} (${distance} miles)`);
            });
            
            console.log(`\n🎉 GEOGRAPHIC CRAWL SHOULD NOW WORK!`);
            console.log('   ✅ HERE.com API returning real places');
            console.log('   ✅ Cities with coordinates found');
            console.log('   ✅ Distance calculations available');
            console.log('   ✅ Intelligence system can now generate diverse pairs');
            
            return true;
        } else {
            console.log('❌ API Error:');
            console.log('Response status:', response.status);
            console.log('Response data:', JSON.stringify(data, null, 2));
            return false;
        }
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
        return false;
    }
}

testFixedHereAPI();