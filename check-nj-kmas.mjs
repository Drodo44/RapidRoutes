import supabase from './lib/supabaseAdmin.js';

async function checkNJKMAs() {
  // Sewell, NJ coordinates (approximate)
  const sewellLat = 39.7640;
  const sewellLon = -75.0979;
  
  const { data, error } = await supabase
    .from('cities')
    .select('city, state_or_province, kma_code, latitude, longitude')
    .gte('latitude', sewellLat - 3)
    .lte('latitude', sewellLat + 3)
    .gte('longitude', sewellLon - 3)
    .lte('longitude', sewellLon + 3)
    .not('kma_code', 'is', null)
    .limit(1000);
    
  if (error) {
    console.error('Error:', error);
    return;
  }
  
  // Group by KMA
  const kmaGroups = {};
  data.forEach(city => {
    if (!kmaGroups[city.kma_code]) {
      kmaGroups[city.kma_code] = [];
    }
    kmaGroups[city.kma_code].push(city);
  });
  
  console.log('KMAs found near Sewell, NJ:');
  Object.keys(kmaGroups).sort().forEach(kma => {
    const sample = kmaGroups[kma][0];
    console.log(`  ${kma}: ${kmaGroups[kma].length} cities (e.g., ${sample.city}, ${sample.state_or_province})`);
  });
  
  console.log(`\nTotal unique KMAs: ${Object.keys(kmaGroups).length}`);
}

checkNJKMAs().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
