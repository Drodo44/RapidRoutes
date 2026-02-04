import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

console.log('=== ANALYZING GA AND NC DATA QUALITY ===\n');

for (const state of ['GA', 'NC']) {
  console.log(`\n${state} ANALYSIS:`);
  
  // Get total count
  const { count: total } = await supabase
    .from('cities')
    .select('*', { count: 'exact', head: true })
    .eq('state_or_province', state);
  
  console.log(`  Total cities: ${total}`);
  
  // Check for duplicates
  const { data: allCities } = await supabase
    .from('cities')
    .select('city, state_or_province')
    .eq('state_or_province', state);
  
  if (allCities) {
    const cityNames = {};
    allCities.forEach(c => {
      cityNames[c.city] = (cityNames[c.city] || 0) + 1;
    });
    
    const duplicates = Object.entries(cityNames).filter(([_, count]) => count > 1);
    console.log(`  Duplicate city names: ${duplicates.length}`);
    
    if (duplicates.length > 0) {
      console.log('  Top 10 duplicates:');
      duplicates.sort((a, b) => b[1] - a[1]).slice(0, 10).forEach(([city, count]) => {
        console.log(`    ${city}: ${count} entries`);
      });
    }
  }
  
  // Check for missing KMA codes
  const { count: noKma } = await supabase
    .from('cities')
    .select('*', { count: 'exact', head: true })
    .eq('state_or_province', state)
    .is('kma_code', null);
  
  console.log(`  Missing KMA codes: ${noKma} (${((noKma/total)*100).toFixed(1)}%)`);
  
  // Check for missing coordinates
  const { count: noCoords } = await supabase
    .from('cities')
    .select('*', { count: 'exact', head: true })
    .eq('state_or_province', state)
    .or('latitude.is.null,longitude.is.null');
  
  console.log(`  Missing coordinates: ${noCoords} (${((noCoords/total)*100).toFixed(1)}%)`);
  
  // Sample some cities
  const { data: sample } = await supabase
    .from('cities')
    .select('city, kma_code, latitude, longitude')
    .eq('state_or_province', state)
    .limit(10);
  
  console.log('  Sample cities:');
  sample?.forEach(c => {
    console.log(`    ${c.city}: KMA=${c.kma_code || 'NULL'}, Coords=${c.latitude || 'NULL'},${c.longitude || 'NULL'}`);
  });
}

console.log('\n\n💡 RECOMMENDATION:');
console.log('If many cities are missing KMA codes or have duplicates,');
console.log('we should clean up the data or remove low-quality entries.');
