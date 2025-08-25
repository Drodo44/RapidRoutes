// test-db-state.js
// Quick test to check database state
const API_BASE = 'http://localhost:3000/api';

async function testDatabaseState() {
  try {
    console.log('🔍 Testing database state...');
    
    // Test lanes API
    const lanesResponse = await fetch(`${API_BASE}/lanes`);
    if (!lanesResponse.ok) {
      console.error('❌ Lanes API failed:', lanesResponse.status);
      return;
    }
    
    const lanes = await lanesResponse.json();
    console.log(`📊 Found ${lanes.length} lanes in database`);
    
    // Check for test lanes
    const testLanes = lanes.filter(lane => 
      lane.comment?.toLowerCase().includes('test') || 
      lane.commodity?.toLowerCase().includes('test') ||
      ['Los Angeles', 'Dallas', 'Augusta', 'Maplesville', 'McDavid'].includes(lane.origin_city)
    );
    
    if (testLanes.length > 0) {
      console.log(`⚠️  Found ${testLanes.length} test lanes:`);
      testLanes.forEach(lane => {
        console.log(`   - ${lane.origin_city} -> ${lane.dest_city} (ref: ${lane.reference_id || 'none'}) - ${lane.comment || 'no comment'}`);
      });
    } else {
      console.log('✅ No test lanes found');
    }
    
    // Check reference ID format
    const lanesWithRefIds = lanes.filter(lane => lane.reference_id);
    console.log(`🔗 ${lanesWithRefIds.length} lanes have reference IDs`);
    
    const badRefIds = lanesWithRefIds.filter(lane => 
      !lane.reference_id.match(/^RR\d{5}$/)
    );
    
    if (badRefIds.length > 0) {
      console.log(`⚠️  Found ${badRefIds.length} lanes with incorrect reference ID format:`);
      badRefIds.forEach(lane => {
        console.log(`   - ${lane.reference_id} (should be RR#####)`);
      });
    } else {
      console.log('✅ All reference IDs are in correct RR##### format');
    }
    
  } catch (error) {
    console.error('❌ Database test failed:', error.message);
  }
}

// Run if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  testDatabaseState();
}

export default testDatabaseState;
