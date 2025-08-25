// lib/intelligentCrawl.js
// BROKER-INTELLIGENT: Uses your preferred pickup markets + diverse deliveries
import { adminSupabase } from '../utils/supabaseClient';

/**
 * Get broker's preferred pickup cities ordered by frequency
 */
async function getPreferredPickups() {
  const { data: preferredPickups, error } = await adminSupabase
    .from('preferred_pickups')
    .select('*')
    .eq('active', true)
    .order('frequency_score', { ascending: false });
  
  if (error) {
    console.error('Error loading preferred pickups:', error);
    return [];
  }
  
  console.log(`📍 Loaded ${preferredPickups?.length || 0} preferred pickup locations`);
  return preferredPickups || [];
}

/**
 * Get diverse delivery cities from different KMAs
 */
async function getDiverseDeliveries(excludeKmas = []) {
  const { data: deliveryCities, error } = await adminSupabase
    .from('cities')
    .select('city, state_or_province, zip, kma_code, kma_name')
    .not('kma_code', 'is', null)
    .not('kma_code', 'in', `(${excludeKmas.join(',')})`)
    .not('latitude', 'is', null)
    .limit(500);
  
  if (error) {
    console.error('Error loading delivery cities:', error);
    return [];
  }
  
  return deliveryCities || [];
}

/**
 * INTELLIGENT CRAWL: Your frequent pickups + diverse delivery markets
 */
export async function generateIntelligentCrawlPairs({ 
  origin, 
  destination, 
  equipment, 
  preferFillTo10, 
  usedCities = new Set() 
}) {
  try {
    console.log(`🧠 INTELLIGENT CRAWL: ${origin.city}, ${origin.state} -> ${destination.city}, ${destination.state}`);
    
    // Get your preferred pickup locations
    const preferredPickups = await getPreferredPickups();
    
    // Get base cities from database
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
    
    // Track used KMAs to ensure delivery diversity
    const usedKmas = new Set();
    if (baseOrigin.kma_code) usedKmas.add(baseOrigin.kma_code);
    if (baseDest.kma_code) usedKmas.add(baseDest.kma_code);
    
    // Get diverse delivery cities
    const deliveryCities = await getDiverseDeliveries([...usedKmas]);
    
    // Shuffle delivery cities for randomness
    const shuffledDeliveries = deliveryCities.sort(() => Math.random() - 0.5);
    
    // Filter preferred pickups by equipment if specified
    let availablePickups = preferredPickups;
    if (equipment) {
      availablePickups = preferredPickups.filter(pickup => 
        !pickup.equipment_preference || 
        pickup.equipment_preference.includes(equipment)
      );
    }
    
    // If no equipment-specific pickups, use all
    if (availablePickups.length === 0) {
      availablePickups = preferredPickups;
    }
    
    // Generate pairs: Your frequent pickups → Diverse deliveries
    const pairs = [];
    const targetPairs = preferFillTo10 ? 5 : 3;
    
    for (let i = 0; i < targetPairs && i < availablePickups.length; i++) {
      const pickup = availablePickups[i];
      
      // Find delivery city from different KMA
      let delivery = null;
      for (const city of shuffledDeliveries) {
        if (!usedKmas.has(city.kma_code)) {
          delivery = city;
          usedKmas.add(city.kma_code);
          break;
        }
      }
      
      // Fallback to any delivery if no diverse KMA found
      if (!delivery && shuffledDeliveries.length > 0) {
        delivery = shuffledDeliveries[i % shuffledDeliveries.length];
      }
      
      if (delivery) {
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
          score: 0.95, // High score for broker intelligence
          intelligence: {
            pickup_frequency: pickup.frequency_score,
            pickup_kma: pickup.kma_code,
            delivery_kma: delivery.kma_code,
            equipment_match: pickup.equipment_preference?.includes(equipment) || false
          }
        });
        
        console.log(`💡 INTELLIGENT PAIR ${i+1}: ${pickup.city}, ${pickup.state_or_province} (freq: ${pickup.frequency_score}, KMA: ${pickup.kma_code}) -> ${delivery.city}, ${delivery.state_or_province} (KMA: ${delivery.kma_code})`);
      }
    }
    
    console.log(`✅ INTELLIGENT: Generated ${pairs.length} broker-optimized pairs using ${usedKmas.size} different KMAs`);
    
    return { baseOrigin, baseDest, pairs };
    
  } catch (error) {
    console.error('Intelligent crawl error:', error);
    return { 
      baseOrigin: { city: origin.city, state: origin.state, zip: '' },
      baseDest: { city: destination.city, state: destination.state, zip: '' },
      pairs: [] 
    };
  }
}
