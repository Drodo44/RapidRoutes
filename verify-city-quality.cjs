// Verify enterprise city data quality after recomputation
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function verifyCityData() {
  console.log('🔍 VERIFYING ENTERPRISE CITY DATA QUALITY\n');
  console.log('=' .repeat(60));
  
  // Chicago
  const chicagoQuery = await supabase
    .from('cities')
    .select('city, state_or_province, nearby_cities')
    .eq('city', 'Chicago')
    .eq('state_or_province', 'IL')
    .limit(1);
  
  console.log('\nChicago query result:', chicagoQuery.error ? 'ERROR' : 'SUCCESS');
  if (chicagoQuery.error) {
    console.log('Error:', chicagoQuery.error);
  }
  
  const chicagoData = chicagoQuery.data;
  
  if (chicagoData && chicagoData.length > 0) {
    const chicago = chicagoData[0];
    const kmas = chicago.nearby_cities?.kmas || {};
    const kmaList = Object.keys(kmas);
    const totalCities = Object.values(kmas).reduce((sum, arr) => sum + arr.length, 0);
    
    console.log('\n🏙️  CHICAGO, IL');
    console.log('   KMAs:', kmaList.length, '-', kmaList.join(', '));
    console.log('   Total cities:', totalCities);
    console.log('   Computed:', new Date(chicago.created_at).toLocaleString());
    console.log('   Expected: 844 cities in 6 KMAs');
    console.log('   Status:', totalCities >= 800 ? '✅ EXCELLENT' : totalCities >= 500 ? '⚠️  GOOD' : '❌ INCOMPLETE');
    
    // Show breakdown
    Object.entries(kmas).forEach(([kma, cities]) => {
      console.log(`      ${kma}: ${cities.length} cities`);
    });
  }
  
  // Dallas
  const { data: dallasData } = await supabase
    .from('cities')
    .select('city, state_or_province, nearby_cities, created_at')
    .ilike('city', 'Dallas')
    .ilike('state_or_province', 'TX')
    .limit(1);
  
  if (dallasData && dallasData.length > 0) {
    const dallas = dallasData[0];
    const kmas = dallas.nearby_cities?.kmas || {};
    const kmaList = Object.keys(kmas);
    const totalCities = Object.values(kmas).reduce((sum, arr) => sum + arr.length, 0);
    
    console.log('\n🏙️  DALLAS, TX');
    console.log('   KMAs:', kmaList.length, '-', kmaList.join(', '));
    console.log('   Total cities:', totalCities);
    console.log('   Computed:', new Date(dallas.created_at).toLocaleString());
    console.log('   Expected: 200+ cities in 5+ KMAs');
    console.log('   Status:', totalCities >= 200 ? '✅ EXCELLENT' : totalCities >= 100 ? '⚠️  GOOD' : '❌ INCOMPLETE');
    
    Object.entries(kmas).forEach(([kma, cities]) => {
      console.log(`      ${kma}: ${cities.length} cities`);
    });
  }
  
  // Fitzgerald
  const { data: fitzData } = await supabase
    .from('cities')
    .select('city, state_or_province, nearby_cities, created_at')
    .ilike('city', 'Fitzgerald')
    .ilike('state_or_province', 'GA')
    .limit(1);
  
  if (fitzData && fitzData.length > 0) {
    const fitz = fitzData[0];
    const kmas = fitz.nearby_cities?.kmas || {};
    const kmaList = Object.keys(kmas);
    const totalCities = Object.values(kmas).reduce((sum, arr) => sum + arr.length, 0);
    
    console.log('\n🏙️  FITZGERALD, GA');
    console.log('   KMAs:', kmaList.length, '-', kmaList.join(', '));
    console.log('   Total cities:', totalCities);
    console.log('   Computed:', new Date(fitz.created_at).toLocaleString());
    console.log('   Expected: 274 cities in 3 KMAs');
    console.log('   Status:', totalCities >= 270 ? '✅ EXCELLENT' : totalCities >= 200 ? '⚠️  GOOD' : '❌ INCOMPLETE');
    
    Object.entries(kmas).forEach(([kma, cities]) => {
      console.log(`      ${kma}: ${cities.length} cities`);
    });
  }
  
  // New York
  const { data: nycData } = await supabase
    .from('cities')
    .select('city, state_or_province, nearby_cities, created_at')
    .ilike('city', 'New York')
    .ilike('state_or_province', 'NY')
    .limit(1);
  
  if (nycData && nycData.length > 0) {
    const nyc = nycData[0];
    const kmas = nyc.nearby_cities?.kmas || {};
    const kmaList = Object.keys(kmas);
    const totalCities = Object.values(kmas).reduce((sum, arr) => sum + arr.length, 0);
    
    console.log('\n🏙️  NEW YORK, NY');
    console.log('   KMAs:', kmaList.length, '-', kmaList.join(', '));
    console.log('   Total cities:', totalCities);
    console.log('   Computed:', new Date(nyc.created_at).toLocaleString());
    console.log('   Expected: 400+ cities in 6+ KMAs');
    console.log('   Status:', totalCities >= 400 ? '✅ EXCELLENT' : totalCities >= 250 ? '⚠️  GOOD' : '❌ INCOMPLETE');
    
    Object.entries(kmas).forEach(([kma, cities]) => {
      console.log(`      ${kma}: ${cities.length} cities`);
    });
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('✅ VERIFICATION COMPLETE\n');
}

verifyCityData().catch(console.error);
