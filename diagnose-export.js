import { adminSupabase } from './utils/supabaseClient.js';

async function diagnoseBrokenExport() {
  console.log('🚨 DIAGNOSING THE BLANK CSV ISSUE\n');
  
  try {
    // Check what lanes exist
    const { data: allLanes, error } = await adminSupabase
      .from('lanes')
      .select('id, origin_city, origin_state, dest_city, dest_state, equipment_code, status, created_at')
      .order('created_at', { ascending: false })
      .limit(10);
      
    if (error) {
      console.error('❌ Database error:', error.message);
      return;
    }
    
    console.log(`📊 Found ${allLanes?.length || 0} total lanes in database`);
    
    if (!allLanes || allLanes.length === 0) {
      console.log('🚨 PROBLEM 1: NO LANES IN DATABASE AT ALL');
      console.log('   Need to create lanes before exporting');
      return;
    }
    
    // Show recent lanes
    console.log('\n📋 Recent lanes:');
    allLanes.forEach((lane, i) => {
      console.log(`  ${i+1}. ${lane.origin_city}, ${lane.origin_state} → ${lane.dest_city}, ${lane.dest_state}`);
      console.log(`     Status: ${lane.status} | Equipment: ${lane.equipment_code} | ID: ${lane.id}`);
    });
    
    // Count by status
    const statusCounts = {};
    allLanes.forEach(lane => {
      statusCounts[lane.status] = (statusCounts[lane.status] || 0) + 1;
    });
    
    console.log('\n📊 Status breakdown:');
    Object.entries(statusCounts).forEach(([status, count]) => {
      console.log(`  • ${status}: ${count} lanes`);
    });
    
    // Check what the export API would find
    const pendingCount = statusCounts['pending'] || 0;
    console.log(`\n🔍 Export API analysis:`);
    console.log(`   Default query: status = 'pending'`);
    console.log(`   Pending lanes found: ${pendingCount}`);
    
    if (pendingCount === 0) {
      console.log('\n🚨 PROBLEM 2: NO PENDING LANES');
      console.log('   The export API looks for pending lanes by default');
      console.log('   Your lanes have different statuses');
      console.log('   SOLUTIONS:');
      console.log('   A) Use export URL with ?all=1 parameter');  
      console.log('   B) Change lane statuses to "pending"');
      console.log('   C) Fix the export API to handle your actual statuses');
    }
    
    // Test the actual export API query that's failing
    console.log('\n🧪 Testing actual export query...');
    const { data: exportQuery } = await adminSupabase
      .from('lanes')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(10);
      
    console.log(`   Export query result: ${exportQuery?.length || 0} lanes`);
    
    if (!exportQuery || exportQuery.length === 0) {
      console.log('🚨 CONFIRMED: Export query finds nothing!');
      console.log('   This is why your CSV is blank - no data to export');
    }
    
  } catch (error) {
    console.error('💥 Error during diagnosis:', error.message);
  }
}

diagnoseBrokenExport();
