// lib/diverseCrawl.js
// FIXED: Simplified city diversity with guaranteed unique results
import { adminSupabase } from '../utils/supabaseClient';

/**
 * Generate TRULY unique crawl pairs - no more duplicates!
 */
export async function generateDiverseCrawlPairs({ 
  origin, 
  destination, 
  equipment, 
  preferFillTo10, 
  usedCities = new Set() 
}) {
  try {
    console.log(`🔧 FIXED CRAWL: ${origin.city}, ${origin.state} -> ${destination.city}, ${destination.state}`);
    
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
    
    // Get 200 diverse cities from database excluding base cities
    const { data: allCities } = await adminSupabase
      .from('cities')
      .select('city, state_or_province, zip')
      .not('city', 'ilike', origin.city)
      .not('city', 'ilike', destination.city)
      .limit(200);
    
    if (!allCities?.length) {
      console.log('No cities found, returning empty pairs');
      return { baseOrigin, baseDest, pairs: [] };
    }
    
    // Shuffle and create unique pairs
    const shuffled = allCities.sort(() => Math.random() - 0.5);
    const pairs = [];
    const targetPairs = preferFillTo10 ? 5 : 3;
    
    for (let i = 0; i < shuffled.length && pairs.length < targetPairs; i += 2) {
      if (i + 1 >= shuffled.length) break;
      
      const pickup = shuffled[i];
      const delivery = shuffled[i + 1];
      
      const pickupKey = `${pickup.city.toLowerCase()},${pickup.state_or_province.toLowerCase()}`;
      const deliveryKey = `${delivery.city.toLowerCase()},${delivery.state_or_province.toLowerCase()}`;
      
      // Skip if already used globally
      if (usedCities.has(pickupKey) || usedCities.has(deliveryKey)) {
        continue;
      }
      
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
        score: 0.8
      });
      
      // Mark as used globally
      usedCities.add(pickupKey);
      usedCities.add(deliveryKey);
    }
    
    console.log(`✅ FIXED: Generated ${pairs.length} unique pairs with ZIP codes`);
    
    return { baseOrigin, baseDest, pairs };
    
  } catch (error) {
    console.error('Fixed crawl error:', error);
    return { 
      baseOrigin: { city: origin.city, state: origin.state, zip: '' },
      baseDest: { city: destination.city, state: destination.state, zip: '' },
      pairs: [] 
    };
  }
}
