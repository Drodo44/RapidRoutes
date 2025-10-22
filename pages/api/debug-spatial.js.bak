// Test spatial query from within a Next.js API route
export default async function handler(req, res) {
  const { adminSupabase } = await import('../../utils/supabaseClient.js');

  // Haversine formula for distance calculation
  function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 3959; // Earth's radius in miles
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c;
    return distance;
  }

  try {
    console.log('🔍 DEBUGGING SPATIAL QUERY ISSUE');
    
    // Test with Seaboard, NC
    console.log('\n=== Testing Seaboard, NC ===');
    const { data: seaboardData } = await adminSupabase
      .from('cities')
      .select('city, state_or_province, latitude, longitude, kma_code')
      .ilike('city', 'Seaboard')
      .eq('state_or_province', 'NC')
      .limit(1);
      
    if (!seaboardData?.[0]) {
      console.error('❌ Seaboard, NC not found in database');
      return res.status(404).json({ error: 'Base city not found' });
    }
    
    const baseOrigin = seaboardData[0];
    console.log('📍 Base Origin:', baseOrigin);
    
    // Query all cities for inspection
    console.log('\n🔍 Querying ALL cities with coordinates and KMA codes...');
    const { data: allCities } = await adminSupabase
      .from('cities')
      .select('city, state_or_province, latitude, longitude, kma_code')
      .not('latitude', 'is', null)
      .not('longitude', 'is', null)
      .not('kma_code', 'is', null)
      .limit(100);
      
    console.log(`📊 Total cities with coordinates and KMA: ${allCities?.length || 0}`);
    
    if (allCities?.length > 0) {
      console.log('📋 First few cities:', allCities.slice(0, 5).map(c => 
        `${c.city}, ${c.state_or_province} (${c.kma_code})`
      ));
      
      // DEBUG: Check for unique cities
      const uniqueCities = new Set(allCities.map(c => `${c.city}, ${c.state_or_province}`));
      console.log(`📊 UNIQUE CITIES: ${uniqueCities.size} unique out of ${allCities.length} total`);
      
      // Show diverse sample
      const diverseSample = [];
      const seenCities = new Set();
      for (let city of allCities) {
        const key = `${city.city}, ${city.state_or_province}`;
        if (!seenCities.has(key)) {
          seenCities.add(key);
          diverseSample.push(`${city.city}, ${city.state_or_province} (${city.kma_code})`);
          if (diverseSample.length >= 10) break;
        }
      }
      console.log('📋 DIVERSE SAMPLE:', diverseSample);
    }
    
    // Now test the distance filtering
    const citiesWithDistance = (allCities || [])
      .filter(city => city.kma_code !== baseOrigin.kma_code) // Different KMA
      .map(city => {
        const distance = calculateDistance(
          parseFloat(baseOrigin.latitude), parseFloat(baseOrigin.longitude),
          parseFloat(city.latitude), parseFloat(city.longitude)
        );
        return { ...city, distance_miles: distance };
      })
      .filter(city => city.distance_miles <= 100)
      .sort((a, b) => a.distance_miles - b.distance_miles);
      
    console.log(`\n📊 Cities within 100 miles of Seaboard, NC (different KMA): ${citiesWithDistance.length}`);
    
    if (citiesWithDistance.length > 0) {
      console.log('🎯 Closest candidates:');
      citiesWithDistance.slice(0, 10).forEach(city => {
        console.log(`  ${city.city}, ${city.state_or_province} (${city.kma_code}) - ${city.distance_miles.toFixed(1)} miles`);
      });
    }
    
    // Test the exact query logic from definitiveIntelligent.js
    console.log('\n🔍 Testing exact query logic from definitiveIntelligent.js...');
    const { data: pickupCandidates, error: pickupError } = await adminSupabase
      .from('cities')
      .select(`
        city, 
        state_or_province, 
        zip, 
        latitude, 
        longitude, 
        kma_code, 
        kma_name
      `)
      .not('latitude', 'is', null)
      .not('longitude', 'is', null)
      .not('kma_code', 'is', null)
      .neq('kma_code', baseOrigin.kma_code)
      .limit(200);
      
    console.log(`📊 Query result: ${pickupCandidates?.length || 0} candidates`);
    if (pickupError) {
      console.error('❌ Query error:', pickupError);
    }
    
    if (pickupCandidates?.length > 0) {
      console.log('📋 Sample query results:', pickupCandidates.slice(0, 3).map(c => 
        `${c.city}, ${c.state_or_province} (${c.kma_code})`
      ));
    }

    return res.status(200).json({
      message: 'Debug complete - check server logs',
      baseOrigin,
      totalCitiesWithData: allCities?.length || 0,
      candidatesFromQuery: pickupCandidates?.length || 0,
      candidatesWithin100Miles: citiesWithDistance.length,
      sampleResults: citiesWithDistance.slice(0, 5)
    });

  } catch (error) {
    console.error('Debug error:', error);
    return res.status(500).json({ error: error.message });
  }
}
