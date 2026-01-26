// Direct API debug script for testing the intelligence-pairing API
// Run with: node direct-api-debug.js

async function testApiDirectly() {
  console.log('🧪 Testing intelligence-pairing API directly');
  
  const testPayload = {
    originCity: 'Atlanta',
    originState: 'GA',
    destCity: 'Chicago', 
    destState: 'IL',
    originLatitude: 33.7490,
    originLongitude: -84.3880,
    destLatitude: 41.8781,
    destLongitude: -87.6298,
    radius: 75,
    test_mode: true,
  };
  
  try {
    const localUrl = process.env.API_URL || 'http://localhost:3000/api/intelligence-pairing';
    console.log(`🌐 Making request to ${localUrl}`);
    
    const response = await fetch(localUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testPayload),
    });
    
    console.log(`🔄 Response status: ${response.status}`);
    
    const data = await response.json();
    
    console.log('📥 Response headers:', Object.fromEntries([...response.headers]));
    console.log('📥 Response metadata:', data.metadata);
    
    // Critical checks
    console.log('🔍 CRITICAL CHECK - pairs array:', {
      hasPairs: !!data.pairs,
      pairsLength: data.pairs?.length || 0,
      hasCityPairs: !!data.cityPairs,
      cityPairsLength: data.cityPairs?.length || 0,
      firstPairStructure: data.pairs?.[0] ? Object.keys(data.pairs[0]) : [],
      success: data.success,
      emergency: data.metadata?.emergency || false
    });
    
    // Check KMA diversity
    if (data.pairs && data.pairs.length > 0) {
      const originKmas = new Set(data.pairs.map(pair => pair.origin?.kma_code).filter(Boolean));
      const destKmas = new Set(data.pairs.map(pair => pair.destination?.kma_code).filter(Boolean));
      
      console.log('🧩 KMA Diversity Check:', {
        uniqueOriginKmas: originKmas.size,
        uniqueDestKmas: destKmas.size,
        originKmas: [...originKmas],
        destKmas: [...destKmas],
        sufficientDiversity: originKmas.size >= 6 && destKmas.size >= 6
      });
    }
    
    if (!data.pairs || !data.cityPairs || data.pairs.length === 0 || data.cityPairs.length === 0) {
      console.error('❌ FATAL ERROR: No pairs returned from API');
      process.exit(1);
    }
    
    console.log('✅ API test completed successfully');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

testApiDirectly();
