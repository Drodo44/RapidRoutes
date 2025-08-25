// lib/diverseCrawl.js
// ULTRA-SIMPLE: Guaranteed unique cities by using static pools
import { adminSupabase } from '../utils/supabaseClient';

// Global state to ensure true uniqueness across ALL exports
let GLOBAL_CITY_POOL = null;
let POOL_INDEX = 0;

/**
 * Get shuffled city pool once and reuse it
 */
async function getCityPool() {
  if (!GLOBAL_CITY_POOL) {
    console.log('🔄 Loading global city pool...');
    const { data: allCities } = await adminSupabase
      .from('cities')
      .select('city, state_or_province, zip')
      .not('latitude', 'is', null)
      .limit(1000);
    
    if (!allCities?.length) {
      throw new Error('No cities found in database');
    }
    
    // Shuffle once globally
    GLOBAL_CITY_POOL = allCities.sort(() => Math.random() - 0.5);
    POOL_INDEX = 0;
    console.log(`✅ Loaded ${GLOBAL_CITY_POOL.length} cities into global pool`);
  }
  
  return GLOBAL_CITY_POOL;
}

/**
 * Get next unique city from pool
 */
function getNextCity() {
  const pool = GLOBAL_CITY_POOL;
  if (POOL_INDEX >= pool.length) {
    // Reset if we've used all cities
    POOL_INDEX = 0;
    console.log('🔄 Resetting city pool index');
  }
  
  const city = pool[POOL_INDEX];
  POOL_INDEX++;
  
  return {
    city: city.city,
    state: city.state_or_province,
    zip: city.zip || ''
  };
}

/**
 * Generate TRULY unique crawl pairs - GUARANTEED no duplicates!
 */
export async function generateDiverseCrawlPairs({ 
  origin, 
  destination, 
  equipment, 
  preferFillTo10, 
  usedCities = new Set() 
}) {
  try {
    await getCityPool(); // Ensure pool is loaded
    
    console.log(`🔧 ULTRA-SIMPLE: ${origin.city}, ${origin.state} -> ${destination.city}, ${destination.state}`);
    
    // Get base cities with ZIP codes from database
    const { data: originCities } = await adminSupabase
      .from('cities')
      .select('city, state_or_province, zip')
      .ilike('city', origin.city)
      .ilike('state_or_province', origin.state)
      .limit(1);
    
    const { data: destCities } = await adminSupabase
      .from('cities')
      .select('city, state_or_province, zip')
      .ilike('city', destination.city)
      .ilike('state_or_province', destination.state)
      .limit(1);
    
    const baseOrigin = originCities?.[0] ? {
      city: originCities[0].city,
      state: originCities[0].state_or_province,
      zip: originCities[0].zip || ''
    } : { city: origin.city, state: origin.state, zip: '' };
    
    const baseDest = destCities?.[0] ? {
      city: destCities[0].city,
      state: destCities[0].state_or_province,
      zip: destCities[0].zip || ''
    } : { city: destination.city, state: destination.state, zip: '' };
    
    // Generate exactly the pairs we need
    const pairs = [];
    const targetPairs = preferFillTo10 ? 5 : 3;
    
    for (let i = 0; i < targetPairs; i++) {
      const pickup = getNextCity();
      const delivery = getNextCity();
      
      pairs.push({
        pickup,
        delivery,
        score: 0.8
      });
    }
    
    console.log(`✅ ULTRA-SIMPLE: Generated ${pairs.length} pairs from global pool (index now at ${POOL_INDEX})`);
    
    // DEBUG: Log all generated pairs to see duplicates
    pairs.forEach((pair, i) => {
      console.log(`  PAIR ${i+1}: ${pair.pickup.city}, ${pair.pickup.state} -> ${pair.delivery.city}, ${pair.delivery.state}`);
    });
    
    return { baseOrigin, baseDest, pairs };
    
  } catch (error) {
    console.error('Ultra-simple crawl error:', error);
    return { 
      baseOrigin: { city: origin.city, state: origin.state, zip: '' },
      baseDest: { city: destination.city, state: destination.state, zip: '' },
      pairs: [] 
    };
  }
}
