#!/usr/bin/env node

console.log('🔍 TESTING API ENDPOINT DIRECTLY...');

async function testApi() {
  try {
    const { adminSupabase } = await import('./utils/supabaseClient.js');
    const { FreightIntelligence } = await import('./lib/FreightIntelligence.js');
    const { rowsFromBaseAndPairs } = await import('./lib/datCsvBuilder.js');
    
    // Get one pending lane
    const { data: lanes } = await adminSupabase
      .from('lanes')
      .select('*')
      .eq('status', 'pending')
      .limit(1);
    
    if (!lanes?.length) {
      console.log('❌ No pending lanes found');
      return;
    }
    
    const lane = lanes[0];
    console.log(`✅ Testing with lane: ${lane.origin_city}, ${lane.origin_state} -> ${lane.dest_city}, ${lane.dest_state}`);
    
    // Test intelligent generation
    console.log('🧠 Testing intelligent pair generation...');
    const intelligence = new FreightIntelligence();
    const result = await intelligence.generateDiversePairs({
      origin: {
        city: lane.origin_city,
        state: lane.origin_state,
        zip: lane.origin_zip
      },
      destination: {
        city: lane.dest_city,
        state: lane.dest_state,
        zip: lane.dest_zip
      },
      equipment: lane.equipment_code,
      preferFillTo10: true
    });
    console.log(`✅ Intelligent generation produced ${result.pairs?.length} pairs`);
    console.log(`✅ Base origin: ${crawl.baseOrigin?.city}, ${crawl.baseOrigin?.state}`);
    console.log(`✅ Base dest: ${crawl.baseDest?.city}, ${crawl.baseDest?.state}`);
    
    // Test rowsFromBaseAndPairs
    console.log('🔄 Testing rowsFromBaseAndPairs...');
    const rows = rowsFromBaseAndPairs(lane, crawl.baseOrigin, crawl.baseDest, crawl.pairs, true);
    console.log(`✅ Generated ${rows.length} rows`);
    
    if (rows.length === 0) {
      console.error('❌ ZERO ROWS GENERATED - This is the problem!');
      console.log('Debug crawl object:', JSON.stringify(crawl, null, 2));
    } else {
      console.log(`✅ First row sample keys: ${Object.keys(rows[0])}`);
    }
    
  } catch (error) {
    console.error('❌ API TEST FAILED:', error.message);
    console.error('❌ Stack trace:', error.stack);
  }
}

testApi();
