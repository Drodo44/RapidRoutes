import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkCityStates() {
  // Check Boston area cities
  const { data: boston, error: bostonErr } = await supabase
    .from('cities')
    .select('city, state, state_or_province, kma_code')
    .or('city.ilike.%Boston%,city.ilike.%Worcester%,city.ilike.%Springfield%')
    .limit(10);
  
  console.log('=== MA Cities Sample ===');
  console.log(JSON.stringify(boston, null, 2));
  
  // Check NYC area
  const { data: nyc, error: nycErr } = await supabase
    .from('cities')
    .select('city, state, state_or_province, kma_code')
    .or('city.ilike.%Brooklyn%,city.ilike.%Queens%')
    .limit(5);
  
  console.log('\n=== NYC Cities Sample ===');
  console.log(JSON.stringify(nyc, null, 2));
  
  // Check what's near New Bedford
  const { data: lane } = await supabase
    .from('lanes')
    .select('dest_latitude, dest_longitude')
    .eq('id', '9080cac7-faf3-45cf-8c09-47c09e2e35e7')
    .single();
  
  if (lane) {
    const { data: nearby } = await supabase
      .from('cities')
      .select('city, state, state_or_province, kma_code, latitude, longitude')
      .gte('latitude', lane.dest_latitude - 1)
      .lte('latitude', lane.dest_latitude + 1)
      .gte('longitude', lane.dest_longitude - 1)
      .lte('longitude', lane.dest_longitude + 1)
      .limit(20);
    
    console.log('\n=== Cities near New Bedford, MA ===');
    console.log(JSON.stringify(nearby, null, 2));
  }
}

checkCityStates().catch(console.error);
