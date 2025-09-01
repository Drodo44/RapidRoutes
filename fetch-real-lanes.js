import { adminSupabase } from './utils/supabaseClient.js';

async function fetchLanes() {
  const { data: lanes, error } = await adminSupabase
    .from('lanes')
    .select('*')
    .limit(10);
    
  if (error) {
    console.error('Error fetching lanes:', error);
    return;
  }
  
  console.log('Found lanes:', JSON.stringify(lanes, null, 2));
  
  // Test our implementation with these real lanes
  const { generateUniquePairs } = await import('./lib/definitiveIntelligent.fixed.js');
  
  for (const lane of lanes) {
    console.log(`\n=== Testing Lane: ${lane.origin_city}, ${lane.origin_state} -> ${lane.dest_city}, ${lane.dest_state} ===`);
    
    const origin = {
      city: lane.origin_city,
      state_or_province: lane.origin_state,
      zip: lane.origin_zip,
      kma_code: await getKmaCode(lane.origin_city, lane.origin_state)
    };
    
    const dest = {
      city: lane.dest_city,
      state_or_province: lane.dest_state,
      zip: lane.dest_zip,
      kma_code: await getKmaCode(lane.dest_city, lane.dest_state)
    };
    
    // Get coordinates
    const [originCity] = await getCityData(lane.origin_city, lane.origin_state);
    const [destCity] = await getCityData(lane.dest_city, lane.dest_state);
    
    if (!originCity || !destCity) {
      console.log('Missing city data, skipping...');
      continue;
    }
    
    origin.latitude = originCity.latitude;
    origin.longitude = originCity.longitude;
    dest.latitude = destCity.latitude;
    dest.longitude = destCity.longitude;
    
    try {
      const pairs = await generateUniquePairs({
        baseOrigin: origin,
        baseDest: dest,
        equipment: lane.equipment_code,
        minPostings: 6
      });
      
      // Verify results
      const pickupKMAs = new Set(pairs.map(p => p.kmas.pickup));
      const deliveryKMAs = new Set(pairs.map(p => p.kmas.delivery));
      
      console.log('\nResults:');
      console.log('Total pairs:', pairs.length);
      console.log('Unique pickup KMAs:', pickupKMAs.size);
      console.log('Unique delivery KMAs:', deliveryKMAs.size);
      
      // Distance checks
      const maxPickupDist = Math.max(...pairs.map(p => p.distances.pickup));
      const maxDeliveryDist = Math.max(...pairs.map(p => p.distances.delivery));
      
      console.log('\nDistance checks:');
      console.log('Max pickup distance:', maxPickupDist.toFixed(1), 'miles');
      console.log('Max delivery distance:', maxDeliveryDist.toFixed(1), 'miles');
      
      // Band distribution
      const pickupBands = pairs.map(p => p.bands.pickup);
      const deliveryBands = pairs.map(p => p.bands.delivery);
      
      console.log('\nBand Distribution:');
      console.log('Pickup bands:', [...new Set(pickupBands)].sort((a,b) => a-b));
      console.log('Delivery bands:', [...new Set(deliveryBands)].sort((a,b) => a-b));
      
    } catch (error) {
      console.error('Failed to generate pairs:', error);
    }
  }
}

async function getKmaCode(city, state) {
  const { data: cities, error } = await adminSupabase
    .from('cities')
    .select('kma_code')
    .eq('city', city)
    .eq('state_or_province', state)
    .limit(1);
    
  if (error || !cities.length) {
    console.error('Error getting KMA code:', error);
    return null;
  }
  
  return cities[0].kma_code;
}

async function getCityData(city, state) {
  const { data: cities, error } = await adminSupabase
    .from('cities')
    .select('*')
    .eq('city', city)
    .eq('state_or_province', state)
    .limit(1);
    
  if (error) {
    console.error('Error getting city data:', error);
    return [];
  }
  
  return cities;
}

fetchLanes();
