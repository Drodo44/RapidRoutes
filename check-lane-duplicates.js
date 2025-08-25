// check-lane-duplicates.js
import { adminSupabase } from './utils/supabaseClient.js';

async function checkDuplicates() {
  try {
    console.log('Checking for duplicate lanes...');
    
    const { data: lanes, error } = await adminSupabase
      .from('lanes')
      .select('id, origin_city, origin_state, dest_city, dest_state, status, created_at')
      .in('status', ['pending', 'posted'])
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    
    console.log(`Found ${lanes.length} active lanes`);
    
    // Group by origin/destination
    const groups = new Map();
    lanes.forEach(lane => {
      const key = `${lane.origin_city},${lane.origin_state}->${lane.dest_city},${lane.dest_state}`;
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key).push(lane);
    });
    
    console.log('\nChecking for duplicates:');
    let duplicatesFound = 0;
    
    groups.forEach((laneGroup, route) => {
      if (laneGroup.length > 1) {
        console.log(`🔄 DUPLICATE: ${route} (${laneGroup.length} lanes)`);
        laneGroup.forEach(lane => {
          console.log(`   - ID ${lane.id} (${lane.status}) - ${lane.created_at}`);
        });
        duplicatesFound++;
      }
    });
    
    if (duplicatesFound === 0) {
      console.log('✅ No duplicate lanes found');
    } else {
      console.log(`❌ Found ${duplicatesFound} duplicate routes`);
    }
    
  } catch (error) {
    console.error('Error checking duplicates:', error.message);
  }
  
  process.exit(0);
}

checkDuplicates();
