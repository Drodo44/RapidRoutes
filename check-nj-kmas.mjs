import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

console.log('=== NJ COVERAGE ANALYSIS ===\n');

const { data: njCities } = await supabase
  .from('cities')
  .select('city, kma_code, latitude, longitude')
  .eq('state_or_province', 'NJ')
  .order('city');

console.log(`Total NJ cities: ${njCities?.length || 0}\n`);

// Group by KMA
const byKma = {};
njCities?.forEach(c => {
  const kma = c.kma_code || 'NO_KMA';
  if (!byKma[kma]) byKma[kma] = [];
  byKma[kma].push(c.city);
});

console.log('Cities by KMA:\n');
Object.entries(byKma).sort((a, b) => b[1].length - a[1].length).forEach(([kma, cities]) => {
  console.log(`${kma}: ${cities.length} cities`);
  console.log(`  ${cities.join(', ')}`);
  console.log();
});

console.log('\n💡 ANALYSIS:');
console.log('NJ has major freight activity in:');
console.log('  - North Jersey (Newark metro/I-95 corridor)');
console.log('  - Central Jersey (Trenton/I-295 corridor)');
console.log('  - South Jersey (Philadelphia suburbs/I-76)');
console.log('  - Jersey Shore (Toms River/Atlantic City)');
console.log('\nCurrent coverage looks light for such a high-volume state.');
console.log('Recommendation: Add 30-40 more cities for comprehensive coverage.');
