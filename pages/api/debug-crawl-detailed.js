// pages/api/debug-crawl-detailed.js
import { adminSupabase } from '../../utils/supabaseClient';
import { generateGeographicCrawlPairs } from '../../lib/geographicCrawl';

export default async function handler(req, res) {
  console.log('🔍 DETAILED CRAWL DEBUG - Starting analysis...');
  
  try {
    // Test sample lane data (same as real lanes)
    const testOrigin = { city: 'New York', state: 'NY' };
    const testDestination = { city: 'Los Angeles', state: 'CA' };
    const testEquipment = 'FD';
    
    console.log('📍 Testing with:', { testOrigin, testDestination, testEquipment });
    
    // Step 1: Check if we can get preferred pickups
    console.log('🔍 Step 1: Checking preferred pickups...');
    const { data: preferredPickups, error: prefError } = await adminSupabase
      .from('preferred_pickups')
      .select('*')
      .eq('user_id', 'default_user')
      .eq('active', true)
      .order('frequency_score', { ascending: false });
    
    console.log('📋 Preferred pickups result:', { 
      count: preferredPickups?.length || 0, 
      error: prefError?.message || null 
    });
    
    // Step 2: Test the intelligent crawl generation
    console.log('🔍 Step 2: Testing intelligent crawl generation...');
    const crawlResult = await generateIntelligentCrawlPairs({
      origin: testOrigin,
      destination: testDestination,
      equipment: testEquipment,
      preferFillTo10: true,
      usedCities: new Set(),
      userId: 'default_user'
    });
    
    console.log('🎯 Crawl result:', {
      pairsCount: crawlResult.pairs?.length || 0,
      hasBaseOrigin: !!crawlResult.baseOrigin,
      hasBaseDest: !!crawlResult.baseDest,
      usedCitiesCount: crawlResult.usedCities?.size || 0
    });
    
    // Step 3: Check HERE API availability
    console.log('🔍 Step 3: Checking HERE API configuration...');
    const hasHereApiKey = !!process.env.HERE_API_KEY;
    
    // Step 4: Test direct database queries for nearby cities
    console.log('🔍 Step 4: Testing direct database spatial queries...');
    const { data: originCities, error: originError } = await adminSupabase
      .from('cities')
      .select('city, state_or_province, latitude, longitude, kma_code')
      .ilike('city', testOrigin.city)
      .ilike('state_or_province', testOrigin.state)
      .not('latitude', 'is', null)
      .limit(10);
      
    const { data: destCities, error: destError } = await adminSupabase
      .from('cities')
      .select('city, state_or_province, latitude, longitude, kma_code')
      .ilike('city', testDestination.city)
      .ilike('state_or_province', testDestination.state)
      .not('latitude', 'is', null)
      .limit(10);
      
    console.log('🏙️ Origin cities found:', originCities?.length || 0);
    console.log('🏙️ Dest cities found:', destCities?.length || 0);
    
    // Step 5: Test distance calculation if we have base cities
    let nearbyTest = null;
    if (originCities && originCities.length > 0) {
      const baseOrigin = originCities[0];
      console.log('🔍 Step 5: Testing nearby city search...');
      
      const { data: nearbyCities, error: nearbyError } = await adminSupabase
        .from('cities')
        .select('city, state_or_province, latitude, longitude, kma_code')
        .not('latitude', 'is', null)
        .not('longitude', 'is', null)
        .limit(100);
        
      if (nearbyCities) {
        // Calculate distances manually
        const withinRange = nearbyCities.filter(city => {
          const distance = calculateDistance(
            baseOrigin.latitude, baseOrigin.longitude,
            city.latitude, city.longitude
          );
          return distance <= 75 && distance > 0;
        });
        
        nearbyTest = {
          totalCities: nearbyCities.length,
          withinRange: withinRange.length,
          error: nearbyError?.message || null
        };
      }
    }
    
    res.status(200).json({
      success: true,
      timestamp: new Date().toISOString(),
      steps: {
        preferredPickups: {
          count: preferredPickups?.length || 0,
          error: prefError?.message || null
        },
        crawlGeneration: {
          pairsGenerated: crawlResult.pairs?.length || 0,
          hasBaseOrigin: !!crawlResult.baseOrigin,
          hasBaseDest: !!crawlResult.baseDest,
          usedCitiesCount: crawlResult.usedCities?.size || 0
        },
        hereApi: {
          configured: hasHereApiKey
        },
        databaseQueries: {
          originCities: originCities?.length || 0,
          destCities: destCities?.length || 0,
          originError: originError?.message || null,
          destError: destError?.message || null
        },
        nearbySearch: nearbyTest
      },
      rawCrawlResult: crawlResult
    });
    
  } catch (error) {
    console.error('❌ Detailed debug failed:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      stack: error.stack
    });
  }
}

// Haversine formula for calculating distance between two points
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 3959; // Earth's radius in miles
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c; // Distance in miles
}
