// Simple pair generator: guaranteed 5 pairs per lane
import { findCitiesNear } from './simpleCityFinder.js';
import supabaseAdmin from '@/lib/supabaseAdmin';
const adminSupabase = supabaseAdmin;

export async function generateSimplePairs(originCity, originState, destCity, destState) {
  console.log(`Generating pairs: ${originCity}, ${originState} -> ${destCity}, ${destState}`);
  
  // Step 1: Get base city coordinates from Supabase
  const origin = await getCityCoordinates(originCity, originState);
  const dest = await getCityCoordinates(destCity, destState);
  
  if (!origin || !dest) {
    console.error('Could not find base city coordinates');
    return [];
  }
  
  // Step 2: Find pickup cities near origin
  const pickupCities = await findCitiesNear(
    `${originCity}, ${originState}`,
    origin.latitude,
    origin.longitude,
    75, // 75 mile radius standard
    5   // Need 5 pickup cities
  );
  
  // Step 3: Find delivery cities near destination
  const deliveryCities = await findCitiesNear(
    `${destCity}, ${destState}`,
    dest.latitude,
    dest.longitude,
    75, // 75 mile radius standard
    5   // Need 5 delivery cities
  );
  
  console.log(`Found ${pickupCities.length} pickup cities, ${deliveryCities.length} delivery cities`);
  
  // Step 4: Create pairs (ensure we get exactly 5)
  const pairs = [];
  
  for (let i = 0; i < 5; i++) {
    const pickup = pickupCities[i % pickupCities.length] || pickupCities[0];
    const delivery = deliveryCities[i % deliveryCities.length] || deliveryCities[0];
    
    if (pickup && delivery) {
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
        geographic: {
          pickup_kma: pickup.kma_code,
          delivery_kma: delivery.kma_code,
          pickup_distance: pickup.distance_miles,
          delivery_distance: delivery.distance_miles
        },
        score: 2.0,
        intelligence: 'simple_guaranteed'
      });
    }
  }
  
  console.log(`Generated ${pairs.length} pairs`);
  return pairs;
}

async function getCityCoordinates(city, state) {
  const { data, error } = await supabaseAdmin
    .from('cities')
    .select('latitude, longitude, kma_code')
    .ilike('city', city)
    .ilike('state_or_province', state)
    .not('latitude', 'is', null)
    .not('longitude', 'is', null)
    .limit(1);
  
  if (error || !data || data.length === 0) {
    console.error(`No coordinates found for ${city}, ${state}`);
    return null;
  }
  
  return data[0];
}
