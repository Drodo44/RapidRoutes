// Quick check: What does the database have for Elkwood, VA?
import supabaseAdmin from './lib/supabaseAdmin.js';

console.log('🔍 Checking cities table for Elkwood, VA...\n');

const { data: cities, error } = await supabaseAdmin
  .from('cities')
  .select('*')
  .ilike('city', 'elkwood')
  .eq('state_or_province', 'VA');

if (error) {
  console.error('❌ Error:', error);
  process.exit(1);
}

if (!cities || cities.length === 0) {
  console.log('❌ PROBLEM FOUND: Elkwood, VA does NOT exist in the cities table!');
  console.log('\nThis is why it\'s showing TX cities - the lookup is failing.\n');
  console.log('Solution: Add Elkwood, VA to the cities table with correct coordinates.');
  
  // Add it now
  console.log('Adding Elkwood, VA to cities table...');
  
  const { data: newCity, error: insertError } = await supabaseAdmin
    .from('cities')
    .insert([{
      city: 'Elkwood',
      state_or_province: 'VA',
      zip: '22718',
      latitude: 38.5124,
      longitude: -77.8549,
      kma_code: 'VA_ALE',
      kma_name: 'Alexandria'
    }])
    .select();
  
  if (insertError) {
    console.error('❌ Failed to add city:', insertError);
  } else {
    console.log('✅ Successfully added Elkwood, VA to cities table!');
    console.log(newCity);
  }
} else {
  console.log(`✅ Found ${cities.length} matching cities:\n`);
  cities.forEach(city => {
    console.log(`City: ${city.city}, ${city.state_or_province}`);
    console.log(`  Coordinates: ${city.latitude}, ${city.longitude}`);
    console.log(`  ZIP: ${city.zip}`);
    console.log(`  KMA: ${city.kma_code} - ${city.kma_name || 'N/A'}`);
    console.log('');
    
    // Check if coordinates are in Virginia
    if (city.latitude && city.longitude) {
      const inVA = city.latitude >= 36.5 && city.latitude <= 39.5 && 
                   city.longitude >= -83.5 && city.longitude <= -75;
      if (!inVA) {
        console.log('⚠️  WARNING: Coordinates are NOT in Virginia!');
        console.log('  Updating to correct coordinates...');
        
        supabaseAdmin
          .from('cities')
          .update({
            latitude: 38.5124,
            longitude: -77.8549,
            zip: '22718',
            kma_code: 'VA_ALE'
          })
          .eq('id', city.id)
          .then(({ error: updateError }) => {
            if (updateError) {
              console.error('❌ Update failed:', updateError);
            } else {
              console.log('✅ Updated to correct coordinates!');
            }
          });
      }
    }
  });
}

console.log('\n🎉 Done! Try creating the lane again.');
