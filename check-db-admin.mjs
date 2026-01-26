import supabaseAdmin from './lib/supabaseAdmin.js';

console.log('=== CHECKING DATABASE FOR NEW ENGLAND CITIES ===\n');

console.log('1. Checking for MA cities...');
const { data: maCities, error: maError } = await supabaseAdmin
  .from('cities')
  .select('city, state_or_province, kma_code, latitude, longitude')
  .eq('state_or_province', 'MA')
  .limit(5);

console.log(`   Found ${maCities?.length || 0} MA cities`);
if (maError) console.log('   Error:', maError.message);
if (maCities?.length > 0) {
  console.log('   Sample:', maCities.map(c => `${c.city}, ${c.state_or_province}`).join('; '));
}

console.log('\n2. Checking for Boston specifically...');
const { data: boston } = await supabaseAdmin
  .from('cities')
  .select('*')
  .ilike('city', 'boston')
  .limit(3);
console.log(`   Found ${boston?.length || 0} Boston entries`);
if (boston?.length > 0) console.log('   ', boston[0]);

console.log('\n3. Checking distinct state values (sample of 10000)...');
const { data: sample } = await supabaseAdmin
  .from('cities')
  .select('state_or_province')
  .limit(10000);

if (sample) {
  const unique = [...new Set(sample.map(s => s.state_or_province))].sort();
  console.log('   Distinct states:', unique.join(', '));
}
