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
      .order('city', { ascending: true });
    
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
  function getCityFromUnusedKma(kmaMap, usedKmas, requiredUnique = 6, attempts = 0) {
    const availableKmas = Object.keys(kmaMap).filter(kma => !usedKmas.has(kma));
    const maxAttempts = 3;
    
    if (availableKmas.length === 0) {
      if (attempts < maxAttempts) {
        console.log(`⚠️ No unused KMAs left, expanding search (attempt ${attempts + 1}/${maxAttempts})`);
        usedKmas.clear();
        return getCityFromUnusedKma(kmaMap, usedKmas, requiredUnique, attempts + 1);
      } else {
        throw new Error(`Failed to find sufficient unique KMAs after ${maxAttempts} attempts`);
      }
    }
    
    // Strategic KMA selection for diversity
    const kma = availableKmas[Math.floor(Math.random() * availableKmas.length)];
    const cities = kmaMap[kma];
    
    if (!cities?.length) {
      throw new Error(`No cities found for KMA: ${kma}`);
    }
    
    // Pick random city from that KMA
    const city = cities[Math.floor(Math.random() * cities.length)];
    
    // Mark KMA as used
    usedKmas.add(kma);
    
    console.log(`📍 Selected: ${city.city}, ${city.state} (KMA: ${kma} - ${city.kma_name})`);
    console.log(`   KMAs used: ${usedKmas.size}/${requiredUnique} required`);
    
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
    
    // Separate tracking for pickup and delivery KMAs
    const pickupKmas = new Set();
    const deliveryKmas = new Set();
    
    // Mark base KMAs as used if they exist
    if (baseOrigin.kma_code) pickupKmas.add(baseOrigin.kma_code);
    if (baseDest.kma_code) deliveryKmas.add(baseDest.kma_code);
    
    // Generate exactly 6 pairs with unique KMAs per DAT spec
    const pairs = [];
    const REQUIRED_KMAS = 6;
    
    // Generate pairs until we have at least 6 unique KMAs on each side
    // More than 6 is great - just no duplicates allowed!
    while (pickupKmas.size < REQUIRED_KMAS || deliveryKmas.size < REQUIRED_KMAS) {
      
      const pickup = getCityFromUnusedKma(kmaMap, pickupKmas, REQUIRED_KMAS);
      const delivery = getCityFromUnusedKma(kmaMap, deliveryKmas, REQUIRED_KMAS);
      
      pairs.push({
        pickup: {
          city: pickup.city,
          state: pickup.state,
          zip: pickup.zip,
          kma_code: pickup.kma_code,
          kma_name: pickup.kma_name
        },
        delivery: {
          city: delivery.city,
          state: delivery.state,
          zip: delivery.zip,
          kma_code: delivery.kma_code,
          kma_name: delivery.kma_name
        },
        score: 1.0 // Perfect score for validated KMA diversity
      });
      
      // Once we have at least 6 unique KMAs, we can break
      // But if we can find more unique KMAs, that's even better!
      if (pickupKmas.size >= REQUIRED_KMAS && deliveryKmas.size >= REQUIRED_KMAS) {
        console.log('✅ Achieved DAT-spec KMA diversity (or better!):');
        console.log(`   Pickup KMAs (${pickupKmas.size}): ${Array.from(pickupKmas).join(', ')}`);
        console.log(`   Delivery KMAs (${deliveryKmas.size}): ${Array.from(deliveryKmas).join(', ')}`);
        break;
      }
    }
    
    if (pickupKmas.size < REQUIRED_KMAS || deliveryKmas.size < REQUIRED_KMAS) {
      throw new Error(`Failed to achieve minimum KMA diversity: P${pickupKmas.size}/D${deliveryKmas.size} (need at least ${REQUIRED_KMAS})`);
    }
    
  console.log(`📋 Generated pairs with ${pickupKmas.size}/${deliveryKmas.size} unique KMAs (exceeding DAT minimum of 6):`);
  pairs.forEach((pair, i) => {
    console.log(`  PAIR ${i+1}: ${pair.pickup.city}, ${pair.pickup.state} (${pair.pickup.kma_code}) -> ${pair.delivery.city}, ${pair.delivery.state} (${pair.delivery.kma_code})`);
  });    return { baseOrigin, baseDest, pairs };
    
  } catch (error) {
    console.error('KMA-diverse crawl error:', error);
    return { 
      baseOrigin: { city: origin.city, state: origin.state, zip: '' },
      baseDest: { city: destination.city, state: destination.state, zip: '' },
      pairs: [] 
    };
  }
}
