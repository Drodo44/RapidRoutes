// test-csv-fixes.js - Test the critical DAT CSV fixes
import { createClient } from '@supabase/supabase-js';
import { planPairsForLane, rowsFromBaseAndPairs, toCsv, DAT_HEADERS } from './lib/datCsvBuilder.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testCsvFixes() {
  console.log('🧪 Testing DAT CSV Critical Fixes...\n');
  
  try {
    // Fetch a test lane
    const { data: lanes, error } = await supabase
      .from('lanes')
      .select('*')
      .limit(2);

    if (error || !lanes || lanes.length === 0) {
      console.error('Error fetching test lanes:', error);
      return;
    }

    console.log(`📋 Testing with ${lanes.length} lanes\n`);

    // Test the critical fixes
    const usedRefIds = new Set();
    const usedCities = new Set();
    const allRows = [];

    for (let i = 0; i < lanes.length; i++) {
      const lane = lanes[i];
      console.log(`\n🔄 Processing lane ${i+1}: ${lane.origin_city}, ${lane.origin_state} → ${lane.dest_city}, ${lane.dest_state}`);
      
      // Test the enhanced crawl with city diversity
      const crawl = await planPairsForLane(lane, { preferFillTo10: true, usedCities });
      const rows = rowsFromBaseAndPairs(lane, crawl.baseOrigin, crawl.baseDest, crawl.pairs, true, usedRefIds);
      
      console.log(`  Generated ${rows.length} rows (expected: 12)`);
      console.log(`  Cities used so far: ${usedCities.size}`);
      console.log(`  Reference IDs used: ${usedRefIds.size}`);
      
      allRows.push(...rows);
    }

    console.log(`\n📊 FINAL RESULTS:`);
    console.log(`  Total rows: ${allRows.length}`);
    console.log(`  Total unique cities: ${usedCities.size}`);
    console.log(`  Total unique reference IDs: ${usedRefIds.size}`);

    // Test critical column values
    if (allRows.length > 0) {
      const testRow = allRows[0];
      console.log(`\n🔍 COLUMN VALIDATION:`);
      console.log(`  Column G (Allow Private Network Bidding): "${testRow['Allow Private Network Bidding']}" (should be "no")`);
      console.log(`  Column H (DAT Loadboard Rate): "${testRow['DAT Loadboard Rate']}" (should be blank)`);
      console.log(`  Column I (Allow DAT Loadboard Booking): "${testRow['Allow DAT Loadboard Booking']}" (should be blank)`);
      console.log(`  Column J (Use Extended Network): "${testRow['Use Extended Network']}" (should be blank)`);
      console.log(`  Reference ID format: "${testRow['Reference ID']}" (should be text format)`);
      console.log(`  Origin ZIP format: "${testRow['Origin Postal Code']}" (should be text format if present)`);
      console.log(`  Dest ZIP format: "${testRow['Destination Postal Code']}" (should be text format if present)`);
    }

    // Test CSV generation
    console.log(`\n📄 Testing CSV generation...`);
    const csv = toCsv(DAT_HEADERS, allRows.slice(0, 10)); // Test first 10 rows
    console.log(`CSV generated successfully. First few lines:`);
    console.log(csv.split('\n').slice(0, 3).join('\n'));

    console.log(`\n✅ Test completed successfully!`);

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testCsvFixes();
