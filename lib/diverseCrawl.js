// lib/diverseCrawl.js
// KMA-INTELLIGENT: Different freight markets for maximum reach
import { adminSupabase } from '../utils/supabaseClient.js';

// Global KMA tracking to ensure freight market diversity
let USED_KMAS = new Set();
let KMA_CITY_MAP = null;

/**
 * Load cities grouped by KMA for freight intelligence
 */
async function getKmaCityMap() {
  if (!KMA_CITY_MAP) {
    console.log('�️ Loading KMA city map for freight intelligence...');
    const { data: allCities } = await adminSupabase
      .from('cities')
      .select('city, state_or_province, zip, kma_code, kma_name')
      .not('kma_code', 'is', null)
      .not('latitude', 'is', null)
      .limit(2000);
    
    if (!allCities?.length) {
      throw new Error('No KMA cities found in database');
    }
    
    // Group cities by KMA
    KMA_CITY_MAP = {};
    allCities.forEach(city => {
      const kma = city.kma_code;
      if (!KMA_CITY_MAP[kma]) {
        KMA_CITY_MAP[kma] = [];
      }
      KMA_CITY_MAP[kma].push({
        city: city.city,
        state: city.state_or_province,
        zip: city.zip || '',
        kma_code: city.kma_code,
        kma_name: city.kma_name
      });
    });
    
    const kmaCount = Object.keys(KMA_CITY_MAP).length;
    console.log(`✅ Loaded ${kmaCount} KMAs with cities for freight diversity`);
  }
  
  return KMA_CITY_MAP;
}

/**
 * Get city from a DIFFERENT KMA than already used
 */
function getCityFromUnusedKma(kmaMap, usedKmas) {
  const availableKmas = Object.keys(kmaMap).filter(kma => !usedKmas.has(kma));
  
  if (availableKmas.length === 0) {
    // Reset if we've used all KMAs
    console.log('🔄 Resetting KMA usage - all markets covered');
    usedKmas.clear();
    return getCityFromUnusedKma(kmaMap, usedKmas);
  }
  
  // Pick random unused KMA
  const kma = availableKmas[Math.floor(Math.random() * availableKmas.length)];
  const cities = kmaMap[kma];
  
  // Pick random city from that KMA
  const city = cities[Math.floor(Math.random() * cities.length)];
  
  // Mark KMA as used
  usedKmas.add(kma);
  
  console.log(`📍 Selected: ${city.city}, ${city.state} (KMA: ${kma} - ${city.kma_name})`);
  
  return city;
}

/**
 * Generate KMA-diverse crawl pairs for maximum freight coverage
 */
export async function generateDiverseCrawlPairs({ 
  origin, 
  destination, 
  equipment, 
  preferFillTo10, 
  usedCities = new Set() 
}) {
  try {
    const kmaMap = await getKmaCityMap();
    
    console.log(`�️ KMA-INTELLIGENT CRAWL: ${origin.city}, ${origin.state} -> ${destination.city}, ${destination.state}`);
    
    // Get base cities with ZIP codes and KMA info
    const { data: originCities } = await adminSupabase
      .from('cities')
      .select('city, state_or_province, zip, kma_code, kma_name')
      .ilike('city', origin.city)
      .ilike('state_or_province', origin.state)
      .limit(1);
    
    const { data: destCities } = await adminSupabase
      .from('cities')
      .select('city, state_or_province, zip, kma_code, kma_name')
      .ilike('city', destination.city)
      .ilike('state_or_province', destination.state)
      .limit(1);
    
    const baseOrigin = originCities?.[0] ? {
      city: originCities[0].city,
      state: originCities[0].state_or_province,
      zip: originCities[0].zip || '',
      kma_code: originCities[0].kma_code
    } : { city: origin.city, state: origin.state, zip: '', kma_code: null };
    
    const baseDest = destCities?.[0] ? {
      city: destCities[0].city,
      state: destCities[0].state_or_province,
      zip: destCities[0].zip || '',
      kma_code: destCities[0].kma_code
    } : { city: destination.city, state: destination.state, zip: '', kma_code: null };
    
    // Track KMAs for this export to ensure diversity
    const localUsedKmas = new Set();
    
    // Mark base KMAs as used if they exist
    if (baseOrigin.kma_code) localUsedKmas.add(baseOrigin.kma_code);
    if (baseDest.kma_code) localUsedKmas.add(baseDest.kma_code);
    
    // Generate pairs from DIFFERENT KMAs
    const pairs = [];
    const targetPairs = preferFillTo10 ? 5 : 3;
    
    for (let i = 0; i < targetPairs; i++) {
      const pickup = getCityFromUnusedKma(kmaMap, localUsedKmas);
      const delivery = getCityFromUnusedKma(kmaMap, localUsedKmas);
      
      pairs.push({
        pickup: {
          city: pickup.city,
          state: pickup.state,
          zip: pickup.zip
        },
        delivery: {
          city: delivery.city,
          state: delivery.state,
          zip: delivery.zip
        },
        score: 0.9 // High score for KMA diversity
      });
    }
    
    console.log(`✅ KMA-DIVERSE: Generated ${pairs.length} pairs across ${localUsedKmas.size} different freight markets`);
    
    // DEBUG: Log all generated pairs with KMA info
    pairs.forEach((pair, i) => {
      console.log(`  PAIR ${i+1}: ${pair.pickup.city}, ${pair.pickup.state} -> ${pair.delivery.city}, ${pair.delivery.state}`);
    });
    
    return { baseOrigin, baseDest, pairs };
    
  } catch (error) {
    console.error('KMA-diverse crawl error:', error);
    return { 
      baseOrigin: { city: origin.city, state: origin.state, zip: '' },
      baseDest: { city: destination.city, state: destination.state, zip: '' },
      pairs: [] 
    };
  }
}
