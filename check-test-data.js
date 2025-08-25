// check-test-data.js
import { adminSupabase } from './utils/supabaseClient.js';

async function checkTestData() {
  try {
    console.log('Checking for test data in lanes...');
    
    const { data: lanes, error } = await adminSupabase
      .from('lanes')
      .select('id, origin_city, origin_state, dest_city, dest_state, status, created_at')
      .order('created_at', { ascending: false })
      .limit(20);
    
    if (error) throw error;
    
    console.log('Recent lanes:');
    lanes.forEach(lane => {
      const isTest = lane.origin_city?.toLowerCase().includes('test') || 
                    lane.dest_city?.toLowerCase().includes('test') ||
                    lane.origin_city?.toLowerCase().includes('sample') || 
                    lane.dest_city?.toLowerCase().includes('sample');
      
      console.log(`${isTest ? '🧪 TEST: ' : '✅ '}${lane.origin_city}, ${lane.origin_state} → ${lane.dest_city}, ${lane.dest_state} (${lane.status})`);
    });
    
    // Look for test cities specifically
    const testLanes = lanes.filter(lane => 
      lane.origin_city?.toLowerCase().includes('test') || 
      lane.dest_city?.toLowerCase().includes('test') ||
      lane.origin_city?.toLowerCase().includes('sample') || 
      lane.dest_city?.toLowerCase().includes('sample')
    );
    
    if (testLanes.length > 0) {
      console.log(`\n🧪 Found ${testLanes.length} test lanes:`);
      testLanes.forEach(lane => {
        console.log(`   ID: ${lane.id} - ${lane.origin_city}, ${lane.origin_state} → ${lane.dest_city}, ${lane.dest_state}`);
      });
    } else {
      console.log('\n✅ No obvious test data found');
    }
    
  } catch (error) {
    console.error('Error checking test data:', error.message);
  }
  
  process.exit(0);
}

checkTestData();
