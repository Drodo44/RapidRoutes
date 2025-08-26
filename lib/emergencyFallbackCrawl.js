// lib/emergencyFallbackCrawl.js
// EMERGENCY FALLBACK: When intelligent systems fail, use diverse city selection
import { adminSupabase } from '../utils/supabaseClient.js';

/**
 * Emergency fallback crawler that guarantees diverse city pairs
 * Used when preferred_pickups table is missing or intelligent crawl fails
 */
export async function generateEmergencyFallbackPairs({ origin, destination, equipment, preferFillTo10 }) {
  try {
    console.log(`🚨 EMERGENCY FALLBACK: ${origin.city}, ${origin.state} -> ${destination.city}, ${destination.state}`);
    
    // Get base cities
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
      zip: originCities[0].zip || ''
    } : { city: origin.city, state: origin.state, zip: '' };
    
    const baseDest = destCities?.[0] ? {
      city: destCities[0].city,
      state: destCities[0].state_or_province,
      zip: destCities[0].zip || ''
    } : { city: destination.city, state: destination.state, zip: '' };
    
    // Get diverse cities from different states for maximum diversity
    const { data: diversePickups } = await adminSupabase
      .from('cities')
      .select('city, state_or_province, zip, kma_code')
      .neq('state_or_province', baseOrigin.state)  // Different state than origin
      .not('latitude', 'is', null)
      .limit(200);
    
    const { data: diverseDeliveries } = await adminSupabase
      .from('cities')
      .select('city, state_or_province, zip, kma_code')
      .neq('state_or_province', baseDest.state)  // Different state than destination
      .not('latitude', 'is', null)
      .limit(200);
    
    console.log(`🚨 RAW DIVERSITY POOLS: ${diversePickups?.length || 0} pickups, ${diverseDeliveries?.length || 0} deliveries`);
    
    if (!diversePickups?.length || !diverseDeliveries?.length) {
      console.log('🚨 No diverse cities found, trying any cities from database...');
      
      // ULTIMATE FALLBACK: Use ANY cities from database
      const { data: allCities } = await adminSupabase
        .from('cities')
        .select('city, state_or_province, zip, kma_code')
        .not('latitude', 'is', null)
        .limit(300);
        
      console.log(`🚨 ULTIMATE FALLBACK: Found ${allCities?.length || 0} total cities`);
      
      if (!allCities?.length) {
        return { baseOrigin, baseDest, pairs: [] };
      }
      
      // Split into pickup and delivery pools
      const pickupPool = allCities.slice(0, Math.ceil(allCities.length / 2));
      const deliveryPool = allCities.slice(Math.ceil(allCities.length / 2));
      
      return await generatePairsFromPools(pickupPool, deliveryPool, preferFillTo10, baseOrigin, baseDest);
    }
    
    return await generatePairsFromPools(diversePickups, diverseDeliveries, preferFillTo10, baseOrigin, baseDest);
  } catch (error) {
    console.error('🚨 Emergency fallback error:', error);
    return { 
      baseOrigin: { city: origin.city, state: origin.state, zip: '' },
      baseDest: { city: destination.city, state: destination.state, zip: '' },
      pairs: []
    };
  }
}

/**
 * Generate diverse pairs from city pools
 */
async function generatePairsFromPools(pickupPool, deliveryPool, preferFillTo10, baseOrigin, baseDest) {
  // Shuffle for randomness
  const shuffledPickups = pickupPool.sort(() => Math.random() - 0.5);
  const shuffledDeliveries = deliveryPool.sort(() => Math.random() - 0.5);
  
  const pairs = [];
  const targetPairs = preferFillTo10 ? 5 : 3;
  const usedCombinations = new Set();
  
  console.log(`🚨 GENERATING ${targetPairs} PAIRS from ${shuffledPickups.length} pickups × ${shuffledDeliveries.length} deliveries`);
  
  let attempts = 0;
  const maxAttempts = Math.min(1000, shuffledPickups.length * shuffledDeliveries.length);
  
  for (let p = 0; p < shuffledPickups.length && pairs.length < targetPairs && attempts < maxAttempts; p++) {
    for (let d = 0; d < shuffledDeliveries.length && pairs.length < targetPairs && attempts < maxAttempts; d++) {
      attempts++;
      
      const pickup = shuffledPickups[p];
      const delivery = shuffledDeliveries[d];
      
      // Create unique key to avoid exact duplicates
      const comboKey = `${pickup.city}-${pickup.state_or_province}-${delivery.city}-${delivery.state_or_province}`;
      
      if (usedCombinations.has(comboKey)) {
        continue; // Skip exact duplicates
      }
      
      // Avoid pickup/delivery being the same city
      if (pickup.city === delivery.city && pickup.state_or_province === delivery.state_or_province) {
        continue;
      }
      
      usedCombinations.add(comboKey);
      
      pairs.push({
        pickup: {
          city: pickup.city,
          state: pickup.state_or_province,
          zip: pickup.zip || ''
        },
        delivery: {
          city: delivery.city,
          state: delivery.state_or_province,
          zip: delivery.zip || ''
        },
        score: 0.7,
        emergency: true
      });
      
      console.log(`🚨 EMERGENCY PAIR ${pairs.length}: ${pickup.city}, ${pickup.state_or_province} -> ${delivery.city}, ${delivery.state_or_province}`);
    }
  }
  
  console.log(`✅ EMERGENCY FALLBACK: Generated ${pairs.length}/${targetPairs} pairs in ${attempts} attempts`);
  
  return { baseOrigin, baseDest, pairs };
}
