// Fix Bristol, PA by adding ZIP3 190 to zip3_kma_geo table
// Bristol is in the Philadelphia market (KMA: PHL)
// ZIP 19007 -> ZIP3 190

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function fixBristolZip3() {
  console.log('🔧 Adding ZIP3 190 (Bristol, PA area) to zip3_kma_geo table...\n');
  
  // Philadelphia coordinates (approximate center of the metro area)
  const philadelphiaLat = 39.9526;
  const philadelphiaLon = -75.1652;
  const kmaCode = 'PHL';
  
  // Check if ZIP3 190 already exists
  const { data: existing, error: checkError } = await supabase
    .from('zip3_kma_geo')
    .select('*')
    .eq('zip3', '190')
    .maybeSingle();
  
  if (checkError) {
    console.error('❌ Error checking for existing ZIP3:', checkError);
    return;
  }
  
  if (existing) {
    console.log('✅ ZIP3 190 already exists in table:');
    console.log(JSON.stringify(existing, null, 2));
    
    // Update Bristol city record with coordinates
    console.log('\n📍 Updating Bristol, PA city record with coordinates...');
    const { data: bristolUpdate, error: updateError } = await supabase
      .from('cities')
      .update({ 
        latitude: philadelphiaLat, 
        longitude: philadelphiaLon 
      })
      .eq('city', 'Bristol')
      .eq('state_or_province', 'PA')
      .select();
    
    if (updateError) {
      console.error('❌ Error updating Bristol city:', updateError);
    } else {
      console.log('✅ Updated Bristol city with coordinates:', bristolUpdate);
    }
    return;
  }
  
  // Insert ZIP3 190
  console.log('📝 Inserting ZIP3 190 into zip3_kma_geo...');
  const { data: inserted, error: insertError } = await supabase
    .from('zip3_kma_geo')
    .insert([
      {
        zip3: '190',
        latitude: philadelphiaLat,
        longitude: philadelphiaLon,
        kma_code: kmaCode
      }
    ])
    .select();
  
  if (insertError) {
    console.error('❌ Error inserting ZIP3:', insertError);
    return;
  }
  
  console.log('✅ Successfully added ZIP3 190:');
  console.log(JSON.stringify(inserted, null, 2));
  
  // Now update Bristol city record with coordinates
  console.log('\n📍 Updating Bristol, PA city record with coordinates...');
  const { data: bristolUpdate, error: updateError } = await supabase
    .from('cities')
    .update({ 
      latitude: philadelphiaLat, 
      longitude: philadelphiaLon 
    })
    .eq('city', 'Bristol')
    .eq('state_or_province', 'PA')
    .select();
  
  if (updateError) {
    console.error('❌ Error updating Bristol city:', updateError);
  } else {
    console.log('✅ Updated Bristol city with coordinates:');
    console.log(JSON.stringify(bristolUpdate, null, 2));
  }
  
  console.log('\n🎉 Fix complete! Bristol, PA should now work for lane creation.');
}

fixBristolZip3();
