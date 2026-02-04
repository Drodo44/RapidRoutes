import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

console.log('=== CHECKING MA CITIES IN DATABASE ===\n');

const { data: maCities, count } = await supabase
  .from('cities')
  .select('*', { count: 'exact' })
  .eq('state_or_province', 'MA');

console.log(`Total MA cities: ${count}`);
console.log('\nFirst 20 MA cities:');
maCities.slice(0, 20).forEach(c => {
  console.log(`  ${c.city}, ${c.state_or_province} - KMA: ${c.kma_code} - Lat/Lon: ${c.latitude}, ${c.longitude}`);
});

// Test the exact query that post-options.js uses
console.log('\n=== TESTING POST-OPTIONS QUERY ===');
const states = ['MA', 'NH', 'ME', 'VT', 'RI', 'CT', 'NY'];
const { data: neData } = await supabase
  .from("cities")
  .select("id, city, state_or_province, latitude, longitude, zip, kma_code")
  .in('state_or_province', states);

console.log(`\nQuery: .in('state_or_province', ${JSON.stringify(states)})`);
console.log(`Result: ${neData?.length || 0} cities`);

if (neData) {
  const breakdown = {};
  neData.forEach(c => {
    breakdown[c.state_or_province] = (breakdown[c.state_or_province] || 0) + 1;
  });
  console.log('\nBreakdown:');
  Object.entries(breakdown).sort((a,b) => b[1] - a[1]).forEach(([state, count]) => {
    console.log(`  ${state}: ${count} cities`);
  });
}
