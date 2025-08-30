import fetch from 'node-fetch';

async function debugSpecificLanes() {
  console.log('🔍 DEBUGGING INDIVIDUAL LANE GENERATION');
  console.log('=====================================');
  
  try {
    // Get pending lanes
    const lanesResponse = await fetch('http://localhost:3000/api/lanes');
    const lanes = await lanesResponse.json();
    const pendingLanes = lanes.filter(l => l.status === 'pending');
    
    console.log(`📊 Found ${pendingLanes.length} pending lanes\n`);
    
    let totalRows = 0;
    let problemLanes = [];
    
    // Test first 5 lanes individually  
    for (let i = 0; i < Math.min(5, pendingLanes.length); i++) {
      const lane = pendingLanes[i];
      console.log(`🧪 Lane ${i+1}: ${lane.origin_city}, ${lane.origin_state} → ${lane.dest_city}, ${lane.dest_state}`);
      
      try {
        const response = await fetch(`http://localhost:3000/api/exportDatCsv?laneId=${lane.id}&fill=1`);
        const csv = await response.text();
        
        const lines = csv.split('\n').filter(l => l.trim());
        const dataRows = lines.length - 1; // Exclude header
        const postings = dataRows / 2; // 2 contact methods per posting
        
        console.log(`   📊 Rows: ${dataRows}, Postings: ${postings}`);
        
        if (postings < 6) {
          console.log(`   ❌ SHORTFALL: Missing ${6 - postings} postings (${(6 - postings) * 2} rows)`);
          problemLanes.push({
            lane: `${lane.origin_city}, ${lane.origin_state} → ${lane.dest_city}, ${lane.dest_state}`,
            postings,
            missing: 6 - postings
          });
        } else {
          console.log(`   ✅ OK: Full 6 postings`);
        }
        
        totalRows += dataRows;
        
      } catch (error) {
        console.log(`   ❌ ERROR: ${error.message}`);
        problemLanes.push({
          lane: `${lane.origin_city}, ${lane.origin_state} → ${lane.dest_city}, ${lane.dest_state}`,
          postings: 0,
          missing: 6,
          error: error.message
        });
      }
      console.log('');
    }
    
    console.log('📊 SUMMARY:');
    console.log(`   Total rows from ${Math.min(5, pendingLanes.length)} lanes: ${totalRows}`);
    console.log(`   Problem lanes: ${problemLanes.length}`);
    
    if (problemLanes.length > 0) {
      console.log('\n❌ PROBLEM LANES:');
      problemLanes.forEach(p => {
        console.log(`   ${p.lane}: ${p.postings}/6 postings (missing ${p.missing})`);
        if (p.error) console.log(`      Error: ${p.error}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Debug failed:', error.message);
  }
}

debugSpecificLanes();
