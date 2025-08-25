// remove-test-lanes.js
import { adminSupabase } from './utils/supabaseClient.js';

async function removeTestLanes() {
  try {
    console.log('🧪 REMOVING TEST LANES...');
    
    // Find and delete test lanes
    const { data: testLanes, error: selectError } = await adminSupabase
      .from('lanes')
      .select('id, origin_city, origin_state, dest_city, dest_state')
      .or('origin_city.ilike.%test%,dest_city.ilike.%test%,origin_city.eq.Dallas,dest_city.eq.Chicago,origin_city.eq.Los Angeles,dest_city.eq.Las Vegas');
    
    if (selectError) throw selectError;
    
    if (testLanes.length === 0) {
      console.log('✅ No test lanes found');
      process.exit(0);
    }
    
    console.log(`Found ${testLanes.length} test lanes:`);
    testLanes.forEach(lane => {
      console.log(`  - ${lane.id}: ${lane.origin_city}, ${lane.origin_state} → ${lane.dest_city}, ${lane.dest_state}`);
    });
    
    // Delete them
    const { error: deleteError } = await adminSupabase
      .from('lanes')
      .delete()
      .in('id', testLanes.map(l => l.id));
    
    if (deleteError) throw deleteError;
    
    console.log(`✅ Successfully removed ${testLanes.length} test lanes`);
    
  } catch (error) {
    console.error('❌ Error removing test lanes:', error.message);
  }
  
  process.exit(0);
}

removeTestLanes();
