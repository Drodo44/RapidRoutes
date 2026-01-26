import { adminSupabase } from './utils/supabaseClient.js';
import { calculateDistance } from './lib/distanceCalculator.js';

async function main() {
  // Get the coordinates for Leola, PA (destination city)
  const { data: originCity } = await adminSupabase
    .from('cities')
    .select('city, state_or_province, latitude, longitude, kma_code')
    .ilike('city', 'Leola')
    .ilike('state_or_province', 'PA')
    .limit(1);

  if (!originCity?.[0]) {
    console.log('Origin city not found');
    process.exit(1);
  }

  const baseCity = originCity[0];
  console.log(`🏢 Base city: ${baseCity.city}, ${baseCity.state_or_province} (KMA: ${baseCity.kma_code})`);
  console.log(`📍 Coordinates: ${baseCity.latitude}, ${baseCity.longitude}`);

  // Find all cities within 100 miles with KMA codes
  const { data: allCities } = await adminSupabase
    .from('cities')
    .select('*')
    .not('latitude', 'is', null)
    .not('longitude', 'is', null)
    .not('kma_code', 'is', null);

  console.log(`🔍 Checking ${allCities.length} cities with KMA codes...`);

  const nearbyCities = allCities
    .map(city => ({
      ...city,
      distance: calculateDistance(baseCity.latitude, baseCity.longitude, city.latitude, city.longitude)
    }))
    .filter(city => city.distance <= 100)
    .sort((a, b) => a.distance - b.distance);

  console.log(`📊 Found ${nearbyCities.length} cities within 100 miles:`);

  // Group by KMA
  const byKMA = {};
  nearbyCities.forEach(city => {
    if (!byKMA[city.kma_code]) {
      byKMA[city.kma_code] = [];
    }
    byKMA[city.kma_code].push(city);
  });

  console.log(`🌐 Unique KMAs: ${Object.keys(byKMA).length}`);
  console.log('KMA breakdown:');
  Object.entries(byKMA).forEach(([kma, cities]) => {
    const closest = cities[0];
    console.log(`  ${kma}: ${cities.length} cities (closest: ${closest.city}, ${closest.state_or_province} - ${closest.distance.toFixed(1)}mi)`);
  });

  // Check what the old geographic crawl threshold would need to be
  console.log('\n🎯 Analysis for geographic crawl:');
  console.log(`   With current 6 KMA requirement: ${Object.keys(byKMA).length >= 6 ? 'PASS' : 'FAIL'}`);
  console.log(`   With 4 KMA requirement: ${Object.keys(byKMA).length >= 4 ? 'PASS' : 'FAIL'}`);
  console.log(`   With 3 KMA requirement: ${Object.keys(byKMA).length >= 3 ? 'PASS' : 'FAIL'}`);
}

main().then(() => process.exit(0)).catch(err => {
  console.error(err);
  process.exit(1);
});