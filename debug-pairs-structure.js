// debug-pairs-structure.js - Deep dive into pairs structure debugging

const testLane = {
  origin_city: 'Belvidere',
  origin_state: 'IL',
  dest_city: 'Schofield',
  dest_state: 'WI',
  equipment_code: 'FD',
  weight_lbs: 45000,
  pickup_earliest: '2025-08-28',
  pickup_latest: '2025-08-29'
};

async function debugPairsStructure() {
  console.log('🔍 DEEP DEBUG: Analyzing pairs structure step by step');
  
  // Import the functions
  const { planPairsForLane, rowsFromBaseAndPairs } = await import('./lib/datCsvBuilder.js');
  
  try {
    console.log('STEP 1: Calling planPairsForLane...');
    const crawl = await planPairsForLane(testLane, { preferFillTo10: true, usedCities: new Set() });
    
    console.log('STEP 2: Analyzing crawl result structure:');
    console.log('  baseOrigin:', crawl.baseOrigin);
    console.log('  baseDest:', crawl.baseDest);
    console.log('  pairs count:', crawl.pairs?.length || 0);
    console.log('  pairs structure:', JSON.stringify(crawl.pairs, null, 2));
    
    if (crawl.pairs && crawl.pairs.length > 0) {
      console.log('STEP 3: Analyzing first pair structure:');
      const firstPair = crawl.pairs[0];
      console.log('  First pair keys:', Object.keys(firstPair));
      console.log('  Pickup structure:', firstPair.pickup);
      console.log('  Delivery structure:', firstPair.delivery);
    }
    
    console.log('STEP 4: Calling rowsFromBaseAndPairs...');
    const rows = rowsFromBaseAndPairs(testLane, crawl.baseOrigin, crawl.baseDest, crawl.pairs, true, new Set());
    
    console.log('STEP 5: Analyzing rows result:');
    console.log('  Total rows generated:', rows.length);
    console.log('  Expected rows: 12 (6 postings × 2 contacts)');
    console.log('  Math check: 1 base + ', crawl.pairs?.length || 0, 'pairs =', 1 + (crawl.pairs?.length || 0), 'postings');
    console.log('  Expected total: ', (1 + (crawl.pairs?.length || 0)) * 2, 'rows');
    
    // Show detailed breakdown
    if (rows.length > 0) {
      console.log('STEP 6: First few rows structure:');
      console.log('  Row 1 origin:', rows[0]['Origin City*'], rows[0]['Origin State*']);
      console.log('  Row 1 dest:', rows[0]['Destination City*'], rows[0]['Destination State*']);
      console.log('  Row 1 contact:', rows[0]['Contact Method*']);
      
      if (rows[1]) {
        console.log('  Row 2 origin:', rows[1]['Origin City*'], rows[1]['Origin State*']);
        console.log('  Row 2 dest:', rows[1]['Destination City*'], rows[1]['Destination State*']);
        console.log('  Row 2 contact:', rows[1]['Contact Method*']);
      }
      
      if (rows[2]) {
        console.log('  Row 3 origin:', rows[2]['Origin City*'], rows[2]['Origin State*']);
        console.log('  Row 3 dest:', rows[2]['Destination City*'], rows[2]['Destination State*']);
        console.log('  Row 3 contact:', rows[2]['Contact Method*']);
      }
    }
    
  } catch (error) {
    console.error('❌ Debug failed:', error);
  }
}

debugPairsStructure();
