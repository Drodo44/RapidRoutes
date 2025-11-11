import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

console.log('=== VERIFYING NEW ENGLAND CITIES IN DATABASE ===\n');

const states = ['MA', 'NH', 'VT', 'ME', 'RI', 'CT'];

for (const state of states) {
  const { data, error } = await supabase
    .from('cities')
    .select('city, state_or_province, kma_code')
    .eq('state_or_province', state)
    .limit(5);
  
  if (error) {
    console.log(`❌ ${state}: Error -`, error.message);
  } else {
    console.log(`✅ ${state}: ${data.length} cities found`);
    if (data.length > 0) {
      console.log(`   Sample: ${data.map(c => c.city).join(', ')}`);
    }
  }
}

// Check Boston specifically
console.log('\n=== CHECKING BOSTON ===');
const { data: boston } = await supabase
  .from('cities')
  .select('*')
  .eq('city', 'Boston')
  .eq('state_or_province', 'MA')
  .single();

if (boston) {
  console.log(`✅ Boston found: ${boston.latitude}, ${boston.longitude}, KMA: ${boston.kma_code}`);
  console.log(`   Distance from New Bedford (41.6356, -70.9279): ~${Math.round(haversine(41.6356, -70.9279, boston.latitude, boston.longitude))} miles`);
} else {
  console.log('❌ Boston not found');
}

function haversine(lat1, lon1, lat2, lon2) {
  const R = 3959; // Earth radius in miles
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}
