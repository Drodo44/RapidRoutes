import { adminSupabase } from './utils/supabaseClient.js';

console.log('Checking for MA cities...');
const { data: maCities, error: maError } = await adminSupabase
  .from('cities')
  .select('city, state_or_province, kma_code')
  .eq('state_or_province', 'MA')
  .limit(5);

console.log('MA result:', { count: maCities?.length || 0, error: maError?.message });
if (maCities?.length > 0) console.log('Sample MA cities:', maCities);

console.log('\nChecking distinct states (first 50 rows)...');
const { data: allCities } = await adminSupabase
  .from('cities')
  .select('state_or_province')
  .limit(5000);

if (allCities) {
  const stateCounts = {};
  allCities.forEach(c => {
    stateCounts[c.state_or_province] = (stateCounts[c.state_or_province] || 0) + 1;
  });
  console.log('State counts:', stateCounts);
}
