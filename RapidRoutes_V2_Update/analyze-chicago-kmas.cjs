const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

(async () => {
  // Get Chicago's nearby_cities data
  const { data: chicago } = await supabase
    .from('cities')
    .select('latitude, longitude, nearby_cities')
    .eq('city', 'Chicago')
    .eq('state_or_province', 'IL')
    .single();
  
  console.log('Chicago coordinates:', chicago.latitude, chicago.longitude);
  console.log('');
  console.log('Chicago nearby KMAs in database:');
  const kmas = chicago.nearby_cities?.kmas || {};
  Object.entries(kmas).forEach(([kma, cities]) => {
    console.log(`  ${kma}: ${cities.length} cities`);
    console.log(`    Closest: ${cities[0].city}, ${cities[0].state} (${cities[0].miles}mi)`);
    console.log(`    Farthest: ${cities[cities.length-1].city}, ${cities[cities.length-1].state} (${cities[cities.length-1].miles}mi)`);
  });
  
  // Now check what OTHER KMAs exist within 100 miles that SHOULD be there
  console.log('');
  console.log('Checking for missing KMAs within 100 miles of Chicago...');
  console.log('');
  
  // Get ALL cities with pagination
  let allCities = [];
  let from = 0;
  const pageSize = 1000;
  
  while (true) {
    const { data: batch } = await supabase
      .from('cities')
      .select('city, state_or_province, kma_code, latitude, longitude')
      .not('kma_code', 'is', null)
      .not('latitude', 'is', null)
      .range(from, from + pageSize - 1);
    
    if (!batch || batch.length === 0) break;
    allCities.push(...batch);
    from += pageSize;
    if (batch.length < pageSize) break;
  }
  
  console.log(`Loaded ${allCities.length} cities total`);
  
  // Calculate distances manually
  const R = 3959;
  const within100 = [];
  
  for (const city of allCities) {
    const dLat = (city.latitude - chicago.latitude) * Math.PI / 180;
    const dLon = (city.longitude - chicago.longitude) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(chicago.latitude * Math.PI / 180) * Math.cos(city.latitude * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const miles = R * c;
    
    if (miles <= 100 && miles > 0) {
      within100.push({ ...city, miles: Math.round(miles * 10) / 10 });
    }
  }
  
  // Group by KMA
  const kmaGroups = {};
  within100.forEach(c => {
    if (!kmaGroups[c.kma_code]) kmaGroups[c.kma_code] = [];
    kmaGroups[c.kma_code].push(c);
  });
  
  console.log('\nACTUAL KMAs WITHIN 100 MILES OF CHICAGO:');
  Object.entries(kmaGroups)
    .sort((a, b) => b[1].length - a[1].length)
    .forEach(([kma, cities]) => {
      console.log(`  ${kma}: ${cities.length} cities`);
    });
  
  console.log('');
  console.log('Total KMAs that SHOULD be stored:', Object.keys(kmaGroups).length);
  console.log('Chicago nearby_cities currently has:', Object.keys(kmas).length);
  console.log('');
  
  if (Object.keys(kmaGroups).length > Object.keys(kmas).length) {
    console.log('❌ MISSING KMAs IN CHICAGO DATA:');
    Object.keys(kmaGroups).forEach(kma => {
      if (!kmas[kma]) {
        console.log(`  - ${kma} (${kmaGroups[kma].length} cities)`);
        console.log(`    Sample: ${kmaGroups[kma][0].city}, ${kmaGroups[kma][0].state_or_province} (${kmaGroups[kma][0].miles}mi)`);
      }
    });
  } else {
    console.log('✅ All KMAs within 100 miles are stored correctly!');
  }
})();
