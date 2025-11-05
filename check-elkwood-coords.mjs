import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(url, key);

// Check Bellwood, VA
const { data: bellwood } = await supabase
  .from('cities')
  .select('city, state_or_province, latitude, longitude, kma_code')
  .ilike('city', 'bellwood')
  .eq('state_or_province', 'VA')
  .limit(5);

console.log('Bellwood, VA results:', bellwood);

// Check Elkwood, VA
const { data: elkwood } = await supabase
  .from('cities')
  .select('city, state_or_province, latitude, longitude, kma_code')
  .ilike('city', 'elkwood')
  .eq('state_or_province', 'VA')
  .limit(5);

console.log('Elkwood, VA results:', elkwood);

// Check what Texas coordinates might be near
if (bellwood && bellwood.length > 0) {
  const lat = bellwood[0].latitude;
  const lon = bellwood[0].longitude;
  console.log('\nBellwood coords:', { lat, lon });
  
  // Check if these are actually Texas coordinates
  if (lat >= 25 && lat <= 37 && lon <= -93 && lon >= -107) {
    console.log('⚠️ WARNING: These coordinates are in TEXAS, not Virginia!');
  }
}
