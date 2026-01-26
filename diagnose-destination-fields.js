// diagnose-destination-fields.js
// Script to diagnose issues with destination fields in existing lanes

import { adminSupabase } from './utils/supabaseClient.js';

async function diagnoseDestinationFields() {
  try {
    console.log('Starting destination fields diagnostic...');
    
    // 1. Check for lanes with missing destination_city/destination_state
    const { data: missingDestFields, error: queryError } = await adminSupabase
      .from('lanes')
      .select('id, origin_city, origin_state, destination_city, destination_state, dest_city, dest_state, status, created_at')
      .or('destination_city.is.null,destination_state.is.null')
      .order('created_at', { ascending: false })
      .limit(50);
      
    if (queryError) {
      console.error('Failed to query lanes:', queryError);
      return { success: false, error: queryError };
    }
    
    // 2. Analyze the results
    console.log(`\nFound ${missingDestFields.length} lanes with missing destination fields:`);
    
    // Group by pattern of missing fields
    const patterns = {};
    missingDestFields.forEach(lane => {
      const pattern = [
        lane.destination_city === null ? 'null' : 'present',
        lane.destination_state === null ? 'null' : 'present',
        lane.dest_city ? 'present' : 'null',
        lane.dest_state ? 'present' : 'null'
      ].join('-');
      
      if (!patterns[pattern]) {
        patterns[pattern] = [];
      }
      patterns[pattern].push(lane.id);
    });
    
    // Print summary of patterns
    console.log('\nField patterns (destination_city-destination_state-dest_city-dest_state):');
    Object.entries(patterns).forEach(([pattern, laneIds]) => {
      console.log(`- ${pattern}: ${laneIds.length} lanes`);
      console.log(`  Example lane IDs: ${laneIds.slice(0, 3).join(', ')}${laneIds.length > 3 ? '...' : ''}`);
    });
    
    // 3. Check for potential data discrepancies (where dest_* fields exist but destination_* are null)
    const discrepancies = missingDestFields.filter(
      lane => (lane.destination_city === null && lane.dest_city) || 
             (lane.destination_state === null && lane.dest_state)
    );
    
    if (discrepancies.length > 0) {
      console.log(`\n⚠️ Found ${discrepancies.length} lanes with field discrepancies:`);
      discrepancies.slice(0, 5).forEach(lane => {
        console.log(`- Lane ${lane.id}: destination_city=${lane.destination_city}, dest_city=${lane.dest_city}, destination_state=${lane.destination_state}, dest_state=${lane.dest_state}`);
      });
      
      // 4. Fix recommendations
      console.log('\n🔧 Recommended fixes:');
      console.log('1. Update lane creation in API to map dest_city/dest_state to destination_city/destination_state');
      console.log('2. Run database migration to update existing records:');
      console.log(`
UPDATE lanes 
SET 
  destination_city = dest_city 
WHERE 
  destination_city IS NULL AND dest_city IS NOT NULL;

UPDATE lanes 
SET 
  destination_state = dest_state 
WHERE 
  destination_state IS NULL AND dest_state IS NOT NULL;
      `);
    } else {
      console.log('\n✅ No field discrepancies found (where dest_* fields exist but destination_* are null).');
    }
    
    return { 
      success: true, 
      missingCount: missingDestFields.length, 
      discrepancyCount: discrepancies.length,
      patterns
    };
    
  } catch (error) {
    console.error('Diagnostic failed with error:', error);
    return { success: false, error: error.message };
  }
}

// Run the diagnostic
diagnoseDestinationFields()
  .then(result => {
    console.log('\nDIAGNOSTIC COMPLETE');
    console.log(result);
    process.exit(0);
  })
  .catch(err => {
    console.error('Unhandled error:', err);
    process.exit(1);
  });