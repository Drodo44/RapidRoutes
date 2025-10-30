const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkCity() {
  console.log('Checking Elkwood, VA and Dudley, GA...\n');
  
  // Check Elkwood, VA
  const { data: elkwood, error: elkError } = await supabase
    .from('cities')
    .select('id, city, state_or_province, zip, latitude, longitude, kma_code, kma_name')
    .ilike('city', 'Elkwood')
    .eq('state_or_province', 'VA')
    .single();
    
  if (elkError) {
    console.error('Error fetching Elkwood:', elkError);
  } else {
    console.log('Elkwood, VA:', JSON.stringify(elkwood, null, 2));
  }
  
  // Check Dudley, GA
  const { data: dudley, error: dudError } = await supabase
    .from('cities')
    .select('id, city, state_or_province, zip, latitude, longitude, kma_code, kma_name')
    .ilike('city', 'Dudley')
    .eq('state_or_province', 'GA')
    .single();
    
  if (dudError) {
    console.error('Error fetching Dudley:', dudError);
  } else {
    console.log('\nDudley, GA:', JSON.stringify(dudley, null, 2));
  }
  
  if (elkwood) {
    console.log('\n\n=== Checking cities within 75 miles of Elkwood, VA ===');
    
    const latDelta = 75 / 69;
    const lonDelta = 75 / (Math.cos((elkwood.latitude * Math.PI) / 180) * 69);
    
    const { data: nearby, error: nearbyError } = await supabase
      .from('cities')
      .select('city, state_or_province, kma_code, kma_name, latitude, longitude')
      .gt('latitude', elkwood.latitude - latDelta)
      .lt('latitude', elkwood.latitude + latDelta)
      .gt('longitude', elkwood.longitude - lonDelta)
      .lt('longitude', elkwood.longitude + lonDelta)
      .limit(200);
      
    if (nearbyError) {
      console.error('Error fetching nearby:', nearbyError);
    } else {
      // Calculate actual distances
      const withDistance = nearby.map(c => {
        const dist = Math.sqrt(
          Math.pow((c.latitude - elkwood.latitude) * 69, 2) +
          Math.pow((c.longitude - elkwood.longitude) * 69 * Math.cos(elkwood.latitude * Math.PI / 180), 2)
        );
        return { ...c, distance: dist };
      });
      
      // Filter by distance
      const within75 = withDistance.filter(c => c.distance <= 75);
      
      // Separate by state
      const vaCities = within75.filter(c => c.state_or_province === 'VA');
      const txCities = within75.filter(c => c.state_or_province === 'TX');
      const otherStates = within75.filter(c => c.state_or_province !== 'VA' && c.state_or_province !== 'TX');
      
      console.log(`\nTotal cities within 75 miles: ${within75.length}`);
      console.log(`  VA cities: ${vaCities.length}`);
      console.log(`  TX cities: ${txCities.length}`);
      console.log(`  Other states: ${otherStates.length}`);
      
      if (vaCities.length > 0) {
        const vaKmas = [...new Set(vaCities.map(c => c.kma_code))].filter(Boolean);
        console.log(`\nVA KMAs: ${vaKmas.join(', ')}`);
        console.log('\nFirst 10 VA cities:');
        vaCities.slice(0, 10).forEach(c => {
          console.log(`  ${c.city}, ${c.state_or_province} - KMA: ${c.kma_code || 'null'} - ${c.distance.toFixed(1)} mi`);
        });
      }
      
      if (txCities.length > 0) {
        console.log(`\n⚠️  WARNING: Found ${txCities.length} TX cities within 75 miles!`);
        console.log('These should NOT appear for a VA destination:\n');
        txCities.slice(0, 10).forEach(c => {
          console.log(`  ${c.city}, ${c.state_or_province} - KMA: ${c.kma_code || 'null'} - ${c.distance.toFixed(1)} mi`);
        });
      }
    }
  }
}

checkCity().then(() => process.exit(0)).catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
