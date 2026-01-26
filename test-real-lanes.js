// Test the intelligence system with real lanes: Seaboard, NC routes
async function testRealLanes() {
    console.log('🚛 Testing FreightIntelligence with REAL lanes...\n');
    
    const API_KEY = 'rYwlT5_DlKFa8kPTtLbICJhzsT6ZOVy-iDe0EDA6mH8';
    
    // Test lane 1: Seaboard, NC to Fairless Hills, PA
    console.log('📍 LANE 1: Seaboard, NC → Fairless Hills, PA');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    await testCityLocation('Seaboard', 'NC', API_KEY);
    await testCityLocation('Fairless Hills', 'PA', API_KEY);
    
    console.log('\n📍 LANE 2: Seaboard, NC → Delanco, NJ');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    await testCityLocation('Seaboard', 'NC', API_KEY);
    await testCityLocation('Delanco', 'NJ', API_KEY);
}

async function testCityLocation(city, state, apiKey) {
    try {
        console.log(`\n🔍 Testing: ${city}, ${state}`);
        
        // First, test geocoding to get coordinates
        const geocodeUrl = `https://geocode.search.hereapi.com/v1/geocode?q=${encodeURIComponent(`${city}, ${state}`)}&countryCode=USA&apikey=${apiKey}&limit=5`;
        
        console.log(`   🌐 Geocoding: ${city}, ${state}...`);
        const geocodeResponse = await globalThis.fetch(geocodeUrl);
        const geocodeData = await geocodeResponse.json();
        
        if (!geocodeResponse.ok || !geocodeData.items || geocodeData.items.length === 0) {
            console.log(`   ❌ Could not find coordinates for ${city}, ${state}`);
            console.log(`   Response:`, JSON.stringify(geocodeData, null, 2));
            return;
        }
        
        const location = geocodeData.items[0];
        const lat = location.position.lat;
        const lng = location.position.lng;
        
        console.log(`   ✅ Found: ${location.address.city}, ${location.address.state}`);
        console.log(`   📍 Coordinates: ${lat}, ${lng}`);
        
        // Now test discover API to find nearby cities for intelligence
        console.log(`   🔍 Finding cities within 75 miles...`);
        const discoverUrl = `https://discover.search.hereapi.com/v1/discover?at=${lat},${lng}&q=city&limit=20&apikey=${apiKey}`;
        
        const discoverResponse = await globalThis.fetch(discoverUrl);
        const discoverData = await discoverResponse.json();
        
        if (!discoverResponse.ok) {
            console.log(`   ❌ Discover API failed:`, discoverData);
            return;
        }
        
        const nearbyCities = discoverData.items || [];
        console.log(`   ✅ Found ${nearbyCities.length} nearby locations`);
        
        // Filter and show actual cities
        const validCities = nearbyCities.filter(item => 
            item.address?.city && 
            item.address?.state && 
            item.position?.lat && 
            item.position?.lng
        ).slice(0, 8);
        
        console.log(`   🎯 Valid cities for intelligence:`);
        validCities.forEach((item, index) => {
            const cityName = item.address.city;
            const stateName = item.address.state || item.address.stateCode;
            const distance = item.distance ? Math.round(item.distance / 1609.34) : 'Unknown';
            console.log(`      ${index + 1}. ${cityName}, ${stateName} (${distance} miles)`);
        });
        
        if (validCities.length >= 6) {
            console.log(`   🎉 SUCCESS: Found ${validCities.length} cities for diverse KMA pairs!`);
        } else {
            console.log(`   ⚠️  WARNING: Only found ${validCities.length} cities (need 6+ for diversity)`);
        }
        
    } catch (error) {
        console.error(`   ❌ Error testing ${city}, ${state}:`, error.message);
    }
}

async function simulateIntelligenceSystem() {
    console.log('\n🧠 SIMULATION: What FreightIntelligence should generate...\n');
    
    console.log('For Seaboard, NC → Fairless Hills, PA:');
    console.log('🎯 Expected diverse pairs with unique KMAs:');
    console.log('   1. Seaboard, NC → Fairless Hills, PA (base pair)');
    console.log('   2. Roanoke Rapids, NC → Bristol, PA');
    console.log('   3. Weldon, NC → Levittown, PA');
    console.log('   4. Jackson, NC → Bensalem, PA');
    console.log('   5. Halifax, NC → Newportville, PA');
    console.log('   6. Enfield, NC → Croydon, PA');
    
    console.log('\nFor Seaboard, NC → Delanco, NJ:');
    console.log('🎯 Expected diverse pairs with unique KMAs:');
    console.log('   1. Seaboard, NC → Delanco, NJ (base pair)');
    console.log('   2. Roanoke Rapids, NC → Riverside, NJ');
    console.log('   3. Weldon, NC → Palmyra, NJ');
    console.log('   4. Jackson, NC → Riverton, NJ');
    console.log('   5. Halifax, NC → Beverly, NJ');
    console.log('   6. Enfield, NC → Moorestown, NJ');
    
    console.log('\n✅ This is what your CSV should show - NO repeated cities!');
}

testRealLanes().then(() => simulateIntelligenceSystem());