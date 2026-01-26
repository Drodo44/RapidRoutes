// verify-destination-fix.js
// Script to verify the destination field mapping fix

import { adminSupabase } from './utils/supabaseClient.js';

async function verifyDestinationFieldMapping() {
  console.log('Starting destination field mapping verification test...');
  
  try {
    // 1. Create a test lane directly using adminSupabase
    const testLane = {
      origin_city: 'Columbus',
      origin_state: 'OH',
      dest_city: 'Chicago',  // Using dest_city format
      dest_state: 'IL',      // Using dest_state format
      equipment_code: 'V',
      weight_lbs: 10000,
      length_ft: 53,
      status: 'test',
      pickup_earliest: new Date().toISOString(),
      reference_id: `TEST-${Date.now()}`,
      created_at: new Date().toISOString(),
      user_id: '00000000-0000-0000-0000-000000000000' // Placeholder
    };
    
    // Insert test lane
    const { data: insertedLane, error: insertError } = await adminSupabase
      .from('lanes')
      .insert([testLane])
      .select();
      
    if (insertError) {
      console.error('Failed to insert test lane:', insertError);
      return;
    }
    
    const laneId = insertedLane[0].id;
    console.log('Inserted test lane with ID:', laneId);
    
    // 2. Fetch the lane to verify field mapping
    const { data: fetchedLane, error: fetchError } = await adminSupabase
      .from('lanes')
      .select('*')
      .eq('id', laneId)
      .single();
      
    if (fetchError) {
      console.error('Failed to fetch lane:', fetchError);
      return;
    }
    
    // 3. Verify the fields were properly mapped
    console.log('Fetched lane:', fetchedLane);
    console.log('\nField mapping verification:');
    console.log('--------------------------');
    console.log(`destination_city: ${fetchedLane.destination_city !== null ? '✅' : '❌'} (Value: ${fetchedLane.destination_city || 'null'})`);
    console.log(`destination_state: ${fetchedLane.destination_state !== null ? '✅' : '❌'} (Value: ${fetchedLane.destination_state || 'null'})`);
    console.log(`dest_city: ${fetchedLane.dest_city !== undefined ? '✅' : '❌'} (Value: ${fetchedLane.dest_city || 'undefined'})`);
    console.log(`dest_state: ${fetchedLane.dest_state !== undefined ? '✅' : '❌'} (Value: ${fetchedLane.dest_state || 'undefined'})`);
    
    // 4. Clean up test data
    const { error: deleteError } = await adminSupabase
      .from('lanes')
      .delete()
      .eq('id', laneId);
      
    if (deleteError) {
      console.warn('Warning: Failed to delete test lane:', deleteError);
    } else {
      console.log('\nTest lane deleted successfully.');
    }
    
    console.log('\nVerification test completed.');
    
    // Return summary
    return {
      success: fetchedLane.destination_city === 'Chicago' && fetchedLane.destination_state === 'IL',
      laneId,
      destination_city: fetchedLane.destination_city,
      destination_state: fetchedLane.destination_state
    };
    
  } catch (error) {
    console.error('Verification test failed with error:', error);
    return { success: false, error: error.message };
  }
}

// Run the verification
verifyDestinationFieldMapping()
  .then(result => {
    console.log('\nTEST RESULT:', result.success ? '✅ SUCCESS' : '❌ FAILURE');
    console.log(result);
    process.exit(result.success ? 0 : 1);
  })
  .catch(err => {
    console.error('Unhandled error:', err);
    process.exit(1);
  });