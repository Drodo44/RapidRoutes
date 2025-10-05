import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const adminSupabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function checkLanes() {
  console.log('Checking lanes table structure and data...\n');
  
  // Get all lanes
  const { data, error } = await adminSupabase
    .from('lanes')
    .select('id, status, lane_status, created_at')
    .order('created_at', { ascending: false })
    .limit(10);
  
  if (error) {
    console.error('Error:', error);
    return;
  }
  
  if (!data || data.length === 0) {
    console.log('No lanes found');
    return;
  }
  
  console.log(`Found ${data.length} lanes (showing latest 10):\n`);
  
  // Check which field exists
  const hasStatus = data[0].hasOwnProperty('status');
  const hasLaneStatus = data[0].hasOwnProperty('lane_status');
  
  console.log('Field check:');
  console.log(`  - 'status' field exists: ${hasStatus}`);
  console.log(`  - 'lane_status' field exists: ${hasLaneStatus}\n`);
  
  // Show values
  data.forEach((lane, idx) => {
    console.log(`${idx + 1}. Lane ${lane.id.substring(0, 8)}...`);
    console.log(`   status: ${lane.status || 'null'}`);
    console.log(`   lane_status: ${lane.lane_status || 'null'}`);
    console.log(`   created_at: ${lane.created_at}`);
    console.log('');
  });
  
  // Count by status
  const { data: allLanes } = await adminSupabase
    .from('lanes')
    .select('status, lane_status');
    
  if (allLanes) {
    const statusCounts = {};
    const laneStatusCounts = {};
    
    allLanes.forEach(l => {
      const s = l.status || 'null';
      const ls = l.lane_status || 'null';
      statusCounts[s] = (statusCounts[s] || 0) + 1;
      laneStatusCounts[ls] = (laneStatusCounts[ls] || 0) + 1;
    });
    
    console.log('Status field counts:', statusCounts);
    console.log('Lane_status field counts:', laneStatusCounts);
  }
}

checkLanes();
