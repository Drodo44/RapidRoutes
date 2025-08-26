// lib/emergencyUniqueCrawl.js
// Emergency unique city crawler to prevent massive duplication
import { adminSupabase } from '../utils/supabaseClient.js';

/**
 * Emergency crawler that guarantees unique cities
 * Much simpler than the complex freight intelligence crawler
 */
export async function generateEmergencyUniquePairs(origin, dest, equipment, usedCities = new Set()) {
  try {
    console.log(`🚨 EMERGENCY CRAWL: ${origin.city}, ${origin.state} -> ${dest.city}, ${dest.state}`);
    
    // Get 50 random cities from different states to ensure diversity
    const { data: cities, error } = await adminSupabase
      .from('cities')
      .select('city, state_or_province, zip')
      .neq('state_or_province', origin.state) // Different from origin state
      .neq('state_or_province', dest.state)   // Different from dest state
      .limit(100);
    
    if (error || !cities?.length) {
      console.log('Emergency: No cities found, using fallback');
      return { 
        pairs: [], 
        baseOrigin: { city: origin.city, state: origin.state, zip: '' },
        baseDest: { city: dest.city, state: dest.state, zip: '' }
      };
    }
    
    // Shuffle cities for randomness
    const shuffled = cities.sort(() => Math.random() - 0.5);
    
    const pairs = [];
    const targetPairs = 5;
    
    for (let i = 0; i < shuffled.length && pairs.length < targetPairs; i += 2) {
      if (i + 1 >= shuffled.length) break;
      
      const pickup = shuffled[i];
      const delivery = shuffled[i + 1];
      
      const pickupKey = `${pickup.city.toLowerCase()},${pickup.state_or_province.toLowerCase()}`;
      const deliveryKey = `${delivery.city.toLowerCase()},${delivery.state_or_province.toLowerCase()}`;
      
      // Skip if already used
      if (usedCities.has(pickupKey) || usedCities.has(deliveryKey)) {
        continue;
      }
      
      // Add to pairs
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
        score: 0.5
      });
      
      // Mark as used
      usedCities.add(pickupKey);
      usedCities.add(deliveryKey);
    }
    
    console.log(`🚨 EMERGENCY: Generated ${pairs.length} unique pairs`);
    
    return {
      pairs,
      baseOrigin: { city: origin.city, state: origin.state, zip: '' },
      baseDest: { city: dest.city, state: dest.state, zip: '' }
    };
    
  } catch (error) {
    console.error('Emergency crawl error:', error);
    return { 
      pairs: [], 
      baseOrigin: { city: origin.city, state: origin.state, zip: '' },
      baseDest: { city: dest.city, state: dest.state, zip: '' }
    };
  }
}
