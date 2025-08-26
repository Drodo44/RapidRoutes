import { adminSupabase } from './utils/supabaseClient.js';

async function testGeographicSearch() {
  console.log('🔍 Testing geographic search around Maplesville, AL...');
  
  // Get base city data
  const { data: originData } = await adminSupabase
    .from('cities')
    .select('city, state_or_province, zip, latitude, longitude, kma_code, kma_name')
    .ilike('city', 'Maplesville')
    .ilike('state_or_province', 'AL')
    .limit(1);
  
  if (!originData?.[0]) {
    console.log('❌ Could not find Maplesville, AL');
    return;
  }
  
  const baseCity = originData[0];
  console.log(`📍 Base: ${baseCity.city}, ${baseCity.state_or_province} (KMA: ${baseCity.kma_code}) at ${baseCity.latitude}, ${baseCity.longitude}`);
  
  // Get ALL cities within 75 miles WITHOUT any filtering
  const latRange = 75 / 69;
  const lonRange = 75 / (69 * Math.cos(baseCity.latitude * Math.PI / 180));
  
  const { data: allNearby, error } = await adminSupabase
    .from('cities')
    .select('city, state_or_province, zip, latitude, longitude, kma_code, kma_name')
    .gte('latitude', baseCity.latitude - latRange)
    .lte('latitude', baseCity.latitude + latRange)
    .gte('longitude', baseCity.longitude - lonRange) 
    .lte('longitude', baseCity.longitude + lonRange)
    .not('latitude', 'is', null)
    .not('longitude', 'is', null)
    .not('kma_code', 'is', null)
    .neq('city', baseCity.city) // Don't include the same city
    .limit(500);
  
  if (error) {
    console.error('❌ Error:', error);
    return;
  }
  
  console.log(`\n🗺️ Found ${allNearby.length} cities within rough lat/lng bounds`);
  
  // Calculate actual distances
  function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 3959;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }
  
  const within75Miles = allNearby
    .map(city => ({
      ...city,
      distance: calculateDistance(baseCity.latitude, baseCity.longitude, city.latitude, city.longitude)
    }))
    .filter(city => city.distance <= 75)
    .sort((a, b) => a.distance - b.distance);
  
  console.log(`\n✅ ${within75Miles.length} cities actually within 75 miles:`);
  
  // Group by KMA
  const byKMA = {};
  within75Miles.forEach(city => {
    if (!byKMA[city.kma_code]) byKMA[city.kma_code] = [];
    byKMA[city.kma_code].push(city);
  });
  
  console.log(`\n📊 Cities by KMA (excluding base KMA ${baseCity.kma_code}):`);
  Object.entries(byKMA)
    .filter(([kma]) => kma !== baseCity.kma_code)
    .sort(([,a], [,b]) => b.length - a.length)
    .slice(0, 10)
    .forEach(([kma, cities]) => {
      console.log(`   KMA ${kma}: ${cities.length} cities (closest: ${cities[0].city}, ${cities[0].state_or_province} - ${Math.round(cities[0].distance)}mi)`);
    });
  
  const differentKMAs = within75Miles.filter(c => c.kma_code !== baseCity.kma_code);
  console.log(`\n🎯 CONCLUSION: We have ${differentKMAs.length} cities in different KMAs within 75 miles`);
  console.log('   There should be NO need for synthetic pairs!');
  
  // Show first 20 closest cities with different KMAs
  console.log(`\n📋 First 20 closest cities with different KMAs:`);
  differentKMAs.slice(0, 20).forEach((city, i) => {
    console.log(`   ${i+1}. ${city.city}, ${city.state_or_province} - ${Math.round(city.distance)}mi (KMA: ${city.kma_code})`);
  });
}

testGeographicSearch();
