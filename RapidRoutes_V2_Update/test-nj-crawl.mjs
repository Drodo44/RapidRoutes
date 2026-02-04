import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Test: Find NJ cities near Millville
const millvilleLat = 39.4021;
const millvilleLon = -75.0393;
const radiusMiles = 75;

// Convert radius to lat/lon degrees (rough approximation)
const latRange = radiusMiles / 69; // 1 degree lat ≈ 69 miles
const lonRange = radiusMiles / (69 * Math.cos(millvilleLat * Math.PI / 180));

console.log('Testing NJ cities near Millville, NJ');
console.log(`Coordinates: ${millvilleLat}, ${millvilleLon}`);
console.log(`Search radius: ${radiusMiles} miles`);
console.log(`Bounding box: lat ±${latRange.toFixed(4)}, lon ±${lonRange.toFixed(4)}`);
console.log('');

try {
  const { data: cities, error } = await supabase
    .from('cities')
    .select('city, state_or_province, latitude, longitude, kma_code, kma_name')
    .not('kma_code', 'is', null)
    .gte('latitude', millvilleLat - latRange)
    .lte('latitude', millvilleLat + latRange)
    .gte('longitude', millvilleLon - lonRange)
    .lte('longitude', millvilleLon + lonRange);

  if (error) throw error;

  console.log(`✅ Found ${cities.length} cities in bounding box`);
  
  // Filter to NJ only
  const njCities = cities.filter(c => c.state_or_province === 'NJ');
  console.log(`✅ Found ${njCities.length} NJ cities`);
  
  if (njCities.length > 0) {
    // Group by KMA
    const byKma = {};
    njCities.forEach(c => {
      if (!byKma[c.kma_code]) byKma[c.kma_code] = [];
      byKma[c.kma_code].push(c.city);
    });
    
    console.log('');
    console.log('NJ cities by KMA:');
    for (const [kma, citiesInKma] of Object.entries(byKma).sort()) {
      console.log(`  ${kma}: ${citiesInKma.length} cities`);
      console.log(`    ${citiesInKma.slice(0, 8).join(', ')}`);
    }
  } else {
    console.log('❌ NO NJ CITIES FOUND - This is the problem!');
  }
  
  // Also show what states ARE in the bounding box
  const stateCount = {};
  cities.forEach(c => {
    stateCount[c.state_or_province] = (stateCount[c.state_or_province] || 0) + 1;
  });
  console.log('');
  console.log('All states in bounding box:');
  for (const [state, count] of Object.entries(stateCount).sort()) {
    console.log(`  ${state}: ${count} cities`);
  }
  
} catch (error) {
  console.error('❌ Error:', error.message);
  console.error(error.stack);
}
