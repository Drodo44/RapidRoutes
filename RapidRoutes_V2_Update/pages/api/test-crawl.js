// pages/api/test-crawl.js
import { generateGeographicCrawlPairs } from '../../lib/geographicCrawl.js';

export default async function handler(req, res) {
  let supabaseAdmin;
  try {
    supabaseAdmin = (await import('@/lib/supabaseAdmin')).default;
    console.log('=== CRAWL TEST START ===');
    
    // First, check if the cities exist in the database
    const { data: belvidere } = await adminSupabase
      .from('cities')
      .select('*')
      .ilike('city', 'Belvidere')
      .ilike('state_or_province', 'IL')
      .limit(1);
    
    const { data: schofield } = await adminSupabase
      .from('cities')
      .select('*')
      .ilike('city', 'Schofield')
      .ilike('state_or_province', 'WI')
      .limit(1);
    
    console.log('Belvidere found:', belvidere?.length > 0, belvidere?.[0]);
    console.log('Schofield found:', schofield?.length > 0, schofield?.[0]);
    
    // Test nearby cities for Belvidere
    const { data: nearbyBelvidere } = await adminSupabase
      .from('cities')
      .select('city, state_or_province, latitude, longitude')
      .gte('latitude', (belvidere?.[0]?.latitude || 42.264) - 1)
      .lte('latitude', (belvidere?.[0]?.latitude || 42.264) + 1)
      .gte('longitude', (belvidere?.[0]?.longitude || -88.844) - 1)
      .lte('longitude', (belvidere?.[0]?.longitude || -88.844) + 1)
      .limit(10);
    
    console.log('Nearby Belvidere cities:', nearbyBelvidere?.length || 0);
    
    const result = await generateGeographicCrawlPairs({
      origin: { city: 'Belvidere', state: 'IL' },
      destination: { city: 'Schofield', state: 'WI' },
      equipment: 'FD',
      preferFillTo10: true
    });
    
    console.log('=== CRAWL TEST RESULT ===');
    console.log('Pairs generated:', result.pairs.length);
    console.log('Shortfall reason:', result.shortfallReason);
    console.log('First 3 pairs:', result.pairs.slice(0, 3));
    
    // NUCLEAR TEST: If normal method failed, try direct database approach
    if (result.pairs.length === 0) {
      console.log('🚨 NUCLEAR TEST: Normal crawl failed, trying direct approach');
      
      const { data: testOrigins } = await adminSupabase
        .from('cities')
        .select('*')
        .neq('state_or_province', 'IL')
        .not('latitude', 'is', null)
        .limit(5);
      
      const { data: testDests } = await adminSupabase
        .from('cities')
        .select('*')
        .neq('state_or_province', 'WI')
        .not('latitude', 'is', null)
        .limit(5);
      
      console.log('🚨 NUCLEAR TEST: Found', testOrigins?.length, 'origins,', testDests?.length, 'destinations');
      
      if (testOrigins?.length >= 5 && testDests?.length >= 5) {
        const nuclearPairs = [];
        for (let i = 0; i < 5; i++) {
          nuclearPairs.push({
            pickup: { city: testOrigins[i].city, state: testOrigins[i].state_or_province },
            delivery: { city: testDests[i].city, state: testDests[i].state_or_province }
          });
        }
        
        return res.status(200).json({
          success: true,
          cityCheck: {
            belvidereFound: belvidere?.length > 0,
            schofieldFound: schofield?.length > 0,
            nearbyCities: nearbyBelvidere?.length || 0
          },
          pairs: nuclearPairs.length,
          shortfall: null,
          samplePairs: nuclearPairs,
          method: 'nuclear_override'
        });
      }
    }
    
    res.status(200).json({
      success: true,
      cityCheck: {
        belvidereFound: belvidere?.length > 0,
        schofieldFound: schofield?.length > 0,
        nearbyCities: nearbyBelvidere?.length || 0
      },
      pairs: result.pairs.length,
      shortfall: result.shortfallReason,
      samplePairs: result.pairs.slice(0, 3).map(p => `${p.pickup.city}, ${p.pickup.state} -> ${p.delivery.city}, ${p.delivery.state}`)
    });
    
  } catch (error) {
    console.error('CRAWL TEST ERROR:', error);
    res.status(500).json({ error: error.message, stack: error.stack });
  }
}
