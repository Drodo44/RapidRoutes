import { adminSupabase } from './utils/supabaseClient.js';

async function analyzeCityDuplicates() {
  console.log('🔍 Analyzing city duplicates in the database...');
  
  // Get all cities (increase limit to see more)
  const { data: allCities, error } = await adminSupabase
    .from('cities')
    .select('city, state_or_province, zip, kma_code, latitude, longitude')
    .limit(5000);
    
  if (error) {
    console.error('Error:', error);
    return;
  }
  
  console.log(`📊 Total cities in database: ${allCities.length}`);
  
  // Group by city,state to find duplicates
  const cityGroups = new Map();
  
  allCities.forEach(city => {
    const key = `${city.city}, ${city.state_or_province}`;
    if (!cityGroups.has(key)) {
      cityGroups.set(key, []);
    }
    cityGroups.get(key).push(city);
  });
  
  // Find cities with multiple entries
  const duplicates = Array.from(cityGroups.entries())
    .filter(([key, cities]) => cities.length > 1)
    .sort(([,a], [,b]) => b.length - a.length);
  
  console.log(`\n📋 Cities with multiple ZIP codes (top 15):`);
  duplicates.slice(0, 15).forEach(([cityState, entries]) => {
    console.log(`   ${cityState}: ${entries.length} entries`);
    entries.forEach((entry, i) => {
      console.log(`      ${i+1}. ZIP: ${entry.zip || 'NULL'}, KMA: ${entry.kma_code || 'NULL'}, Lat/Lon: ${entry.latitude}/${entry.longitude}`);
    });
    console.log('');
  });
  
  console.log(`🎯 SUMMARY:`);
  console.log(`   Unique city/state combinations: ${cityGroups.size}`);
  console.log(`   Cities with duplicates: ${duplicates.length}`);
  console.log(`   Total database entries: ${allCities.length}`);
  console.log(`   Potential space savings: ${allCities.length - cityGroups.size} entries could be removed`);
  
  // Check a specific city we've been testing with
  console.log(`\n🔍 Checking Maplesville, AL specifically:`);
  const maplesville = allCities.filter(city => 
    city.city.toLowerCase() === 'maplesville' && 
    city.state_or_province.toLowerCase() === 'al'
  );
  console.log(`   Found ${maplesville.length} entries for Maplesville, AL:`);
  maplesville.forEach((entry, i) => {
    console.log(`      ${i+1}. ZIP: ${entry.zip || 'NULL'}, KMA: ${entry.kma_code || 'NULL'}`);
  });
}

analyzeCityDuplicates();
