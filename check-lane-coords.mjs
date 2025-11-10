import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const { data, error } = await supabase
  .from('lanes')
  .select('origin_city, origin_state, origin_latitude, origin_longitude, dest_city, destination_city, dest_state, destination_state, dest_latitude, dest_longitude')
  .eq('id', '9080cac7-faf3-45cf-8c09-47c09e2e35e7')
  .single();

console.log('Lane coordinates:');
console.log(JSON.stringify(data, null, 2));

// Check if there are ANY MA cities in database
const { data: maCities, error: maErr } = await supabase
  .from('cities')
  .select('city, state_or_province, latitude, longitude, kma_code')
  .ilike('state_or_province', 'MA')
  .limit(20);

console.log('\nSample MA cities in database:');
console.log(JSON.stringify(maCities, null, 2));

// Check cities near New Bedford coords (41.6362, -70.9342)
if (data?.dest_latitude && data?.dest_longitude) {
  const { data: nearbyRaw } = await supabase
    .from('cities')
    .select('city, state_or_province, latitude, longitude, kma_code')
    .gte('latitude', data.dest_latitude - 2)
    .lte('latitude', data.dest_latitude + 2)
    .gte('longitude', data.dest_longitude - 2)
    .lte('longitude', data.dest_longitude + 2)
    .limit(50);
  
  console.log(`\nCities within 2 degrees of New Bedford (${data.dest_latitude}, ${data.dest_longitude}):`);
  console.log(`Found ${nearbyRaw?.length || 0} cities`);
  if (nearbyRaw && nearbyRaw.length > 0) {
    console.log(JSON.stringify(nearbyRaw.slice(0, 15), null, 2));
  }
}
