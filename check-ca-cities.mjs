// Check CA cities for Rancho Dominguez lane
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

console.log('=== CALIFORNIA CITIES FOR RANCHO DOMINGUEZ LANE ===\n');

// Get ALL CA cities (what the new code will return)
const { data: allCACities, error } = await supabase
  .from('cities')
  .select('city, state_or_province, latitude, longitude, kma_code, kma_name')
  .eq('state_or_province', 'CA')
  .not('kma_code', 'is', null)
  .order('city');

if (error) {
  console.error('Error:', error);
  process.exit(1);
}

console.log(`Total CA cities in database: ${allCACities.length}\n`);

// Show major cities
const majorCities = [
  'Los Angeles', 'San Diego', 'San Jose', 'San Francisco', 'Fresno',
  'Sacramento', 'Long Beach', 'Oakland', 'Bakersfield', 'Anaheim',
  'Santa Ana', 'Riverside', 'Stockton', 'Irvine', 'Chula Vista',
  'Fremont', 'San Bernardino', 'Modesto', 'Fontana', 'Oxnard',
  'Moreno Valley', 'Huntington Beach', 'Glendale', 'Santa Clarita', 'Garden Grove',
  'Oceanside', 'Rancho Cucamonga', 'Santa Rosa', 'Ontario', 'Elk Grove'
];

console.log('MAJOR CA CITIES AVAILABLE:\n');
majorCities.forEach(cityName => {
  const found = allCACities.filter(c => c.city.toLowerCase() === cityName.toLowerCase());
  if (found.length > 0) {
    found.forEach(city => {
      console.log(`✅ ${city.city} - ${city.kma_code} (${city.kma_name || 'N/A'})`);
    });
  } else {
    console.log(`❌ ${cityName} - NOT IN DATABASE`);
  }
});

console.log('\n=== GROUPED BY KMA ===\n');
const byKMA = {};
allCACities.forEach(city => {
  if (!byKMA[city.kma_code]) {
    byKMA[city.kma_code] = [];
  }
  byKMA[city.kma_code].push(city.city);
});

Object.keys(byKMA).sort().forEach(kma => {
  console.log(`${kma} (${byKMA[kma].length} cities):`);
  console.log(`  ${byKMA[kma].slice(0, 10).join(', ')}${byKMA[kma].length > 10 ? '...' : ''}`);
});

console.log('\n=== SUMMARY ===');
console.log(`Total CA cities: ${allCACities.length}`);
console.log(`Unique KMAs: ${Object.keys(byKMA).length}`);
console.log(`\nDakota's Rancho Dominguez, CA lane will show ALL ${allCACities.length} of these cities for selection.`);
