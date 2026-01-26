const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 3959; // Earth radius in miles
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

(async () => {
  // Get Fitzgerald coordinates
  const { data: fitz } = await supabase
    .from('cities')
    .select('latitude, longitude')
    .eq('city', 'Fitzgerald')
    .eq('state_or_province', 'GA')
    .single();
  
  console.log('Fitzgerald, GA:', fitz);
  
  // Get ALL cities with coordinates (paginated)
  let allCities = [];
  let from = 0;
  const pageSize = 1000;
  
  while (true) {
    const { data, error } = await supabase
      .from('cities')
      .select('city, state_or_province, latitude, longitude, kma_code, kma_name')
      .not('latitude', 'is', null)
      .not('longitude', 'is', null)
      .range(from, from + pageSize - 1);
    
    if (error) {
      console.error('Error:', error);
      break;
    }
    
    if (!data || data.length === 0) break;
    
    allCities.push(...data);
    from += pageSize;
    
    if (data.length < pageSize) break; // Last page
  }
  
  console.log(`\nTotal cities loaded: ${allCities.length}`);
  
  // Calculate distances for all cities
  const nearbyCities = allCities
    .map(c => {
      const miles = calculateDistance(fitz.latitude, fitz.longitude, c.latitude, c.longitude);
      return { ...c, miles: Math.round(miles * 10) / 10 };
    })
    .filter(c => c.miles <= 100 && c.miles > 0)
    .filter(c => !(c.city === 'Fitzgerald' && c.state_or_province === 'GA')) // Exclude self
    .sort((a, b) => a.miles - b.miles);
  
  console.log(`\nFound ${nearbyCities.length} cities within 100 miles of Fitzgerald, GA`);
  
  // Show first 30
  console.log('\nFirst 30 closest cities:');
  nearbyCities.slice(0, 30).forEach((c, i) => {
    console.log(`  ${i+1}. ${c.miles}mi: ${c.city}, ${c.state_or_province} (${c.kma_code || 'NO_KMA'} - ${c.kma_name || 'Unknown'})`);
  });
  
  // Group by KMA
  const byKMA = {};
  nearbyCities.forEach(c => {
    const kma = c.kma_code || 'NO_KMA';
    if (!byKMA[kma]) byKMA[kma] = [];
    byKMA[kma].push(c);
  });
  
  console.log(`\n\nKMA BREAKDOWN:`);
  Object.entries(byKMA)
    .sort((a, b) => b[1].length - a[1].length)
    .forEach(([kma, cities]) => {
      console.log(`  ${kma}: ${cities.length} cities`);
    });
  
  console.log(`\n\nTOTAL: ${nearbyCities.length} cities within 100 miles`);
  console.log(`\nBut database only has 3 cities stored for Fitzgerald!`);
  console.log(`This is a ${Math.round((nearbyCities.length - 3) / nearbyCities.length * 100)}% data loss!`);
})();
