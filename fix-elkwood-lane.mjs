import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(url, key);

// Correct coordinates for Elkwood, VA
const ELKWOOD_COORDS = {
  city: 'Elkwood',
  state: 'VA',
  zip: '22718',
  latitude: 38.5124,
  longitude: -77.8549,
  kma_code: 'VA_ALE'  // Alexandria Market
};

console.log('🔍 Searching for lanes with Bellwood or Elkwood as destination...\n');

// Find all lanes with Bellwood/Elkwood, VA as destination
const { data: lanes, error: searchError } = await supabase
  .from('lanes')
  .select('*')
  .or('dest_city.ilike.%bellwood%,dest_city.ilike.%elkwood%,destination_city.ilike.%bellwood%,destination_city.ilike.%elkwood%')
  .eq('dest_state', 'VA');

if (searchError) {
  console.error('❌ Search error:', searchError);
  process.exit(1);
}

if (!lanes || lanes.length === 0) {
  console.log('ℹ️ No lanes found with Bellwood/Elkwood, VA as destination');
  
  // Also check destination_state field
  const { data: lanes2 } = await supabase
    .from('lanes')
    .select('*')
    .or('dest_city.ilike.%bellwood%,dest_city.ilike.%elkwood%,destination_city.ilike.%bellwood%,destination_city.ilike.%elkwood%')
    .eq('destination_state', 'VA');
  
  if (lanes2 && lanes2.length > 0) {
    lanes.push(...lanes2);
  }
}

if (!lanes || lanes.length === 0) {
  console.log('ℹ️ No lanes found to fix');
  process.exit(0);
}

console.log(`✅ Found ${lanes.length} lane(s) to fix:\n`);

for (const lane of lanes) {
  const destCity = lane.dest_city || lane.destination_city;
  const destState = lane.dest_state || lane.destination_state;
  const currentLat = lane.dest_latitude;
  const currentLon = lane.dest_longitude;
  
  console.log(`Lane ID: ${lane.id}`);
  console.log(`  Route: ${lane.origin_city}, ${lane.origin_state} → ${destCity}, ${destState}`);
  console.log(`  Current destination coords: ${currentLat}, ${currentLon}`);
  
  // Check if coordinates are wrong (not in Virginia)
  const isWrongCoords = !currentLat || !currentLon || 
                        currentLat < 36.5 || currentLat > 39.5 ||  // VA latitude range
                        currentLon > -75 || currentLon < -83.5;    // VA longitude range
  
  if (isWrongCoords) {
    console.log(`  ⚠️  WRONG COORDINATES (not in Virginia)!`);
    console.log(`  Updating to correct Elkwood, VA coords: ${ELKWOOD_COORDS.latitude}, ${ELKWOOD_COORDS.longitude}`);
    
    // Update the lane with correct coordinates and city name
    const { error: updateError } = await supabase
      .from('lanes')
      .update({
        dest_city: ELKWOOD_COORDS.city,
        destination_city: ELKWOOD_COORDS.city,
        dest_state: ELKWOOD_COORDS.state,
        destination_state: ELKWOOD_COORDS.state,
        dest_latitude: ELKWOOD_COORDS.latitude,
        dest_longitude: ELKWOOD_COORDS.longitude,
        dest_zip: ELKWOOD_COORDS.zip
      })
      .eq('id', lane.id);
    
    if (updateError) {
      console.error(`  ❌ Update failed:`, updateError);
    } else {
      console.log(`  ✅ Successfully updated!`);
    }
  } else {
    console.log(`  ✅ Coordinates look correct (already in Virginia)`);
  }
  
  console.log('');
}

console.log('🎉 Done! Now refresh the Generate Options page to see correct Virginia cities.');
