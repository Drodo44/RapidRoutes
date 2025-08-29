// Debug the production issue with row generation
import { planPairsForLane, rowsFromBaseAndPairs } from './lib/datCsvBuilder.js';

async function debugRowGeneration() {
  console.log('🔍 DEBUGGING PRODUCTION ROW GENERATION ISSUE');
  
  // Create a test lane matching what production is seeing
  const testLane = {
    id: 1,
    origin_city: 'Riegelwood',
    origin_state: 'NC',
    dest_city: 'Points',
    dest_state: 'WV',
    equipment_code: 'FD',
    weight_lbs: 47584,
    full_partial: 'full',
    pickup_earliest: '2025-08-29',
    pickup_latest: '2025-08-29',
    length_ft: 48,
    status: 'pending'
  };
  
  console.log('🚛 Testing lane:', testLane.origin_city, testLane.origin_state, '->', testLane.dest_city, testLane.dest_state);
  
  try {
    // Test planPairsForLane
    console.log('\n🎯 Step 1: Testing planPairsForLane...');
    const crawl = await planPairsForLane(testLane, { preferFillTo10: true, usedCities: new Set() });
    
    console.log('📊 Crawl result structure:');
    console.log('  - baseOrigin:', crawl.baseOrigin);
    console.log('  - baseDest:', crawl.baseDest);
    console.log('  - pairs count:', crawl.pairs?.length || 0);
    console.log('  - pairs:', crawl.pairs?.map(p => `${p.pickup?.city}, ${p.pickup?.state} -> ${p.delivery?.city}, ${p.delivery?.state}`));
    
    // Test rowsFromBaseAndPairs
    console.log('\n🎯 Step 2: Testing rowsFromBaseAndPairs...');
    const rows = rowsFromBaseAndPairs(testLane, crawl.baseOrigin, crawl.baseDest, crawl.pairs, true, new Set());
    
    console.log('📊 Row generation result:');
    console.log('  - Total rows:', rows.length);
    console.log('  - Expected minimum:', 12);
    console.log('  - Issue:', rows.length < 12 ? 'ROW COUNT TOO LOW' : 'ROW COUNT OK');
    
    // Show first few rows
    console.log('\n📋 Sample rows:');
    rows.slice(0, 3).forEach((row, i) => {
      console.log(`  Row ${i+1}: ${row['Origin City*']}, ${row['Origin State*']} -> ${row['Destination City*']}, ${row['Destination State*']} (${row['Contact Method*']})`);
    });
    
  } catch (error) {
    console.error('❌ Debug test failed:', error);
  }
}

debugRowGeneration();
