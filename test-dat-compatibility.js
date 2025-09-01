// test-dat-compatibility.js
// Tests lane generation with DAT compatibility verification

import { config } from 'dotenv';
import { adminSupabase } from './utils/supabaseClient.js';
import { planPairsForLane, rowsFromBaseAndPairs } from './lib/datCsvBuilder.js';
import { smartVerifyCity } from './lib/datVerificationLearner.js';

config(); // Load environment variables

// Known DAT-compatible test lanes
const TEST_LANES = [
  {
    id: 'DAT-TEST-1',
    origin_city: 'Chicago',
    origin_state: 'IL',
    origin_zip: '60601',
    dest_city: 'Detroit',
    dest_state: 'MI',
    dest_zip: '48201',
    equipment_code: 'V',
    length_ft: '53',
    weight_lbs: '45000',
    full_partial: 'full',
    pickup_earliest: '09/01/2025',
    pickup_latest: '09/02/2025'
  }
];

async function applyDatabaseMigrations() {
  console.log('🔄 Applying database migrations...');
  
  try {
    // Check if columns exist first
    const { data: columnCheck, error: checkError } = await adminSupabase
      .from('cities')
      .select('dat_verified')
      .limit(1);

    if (checkError && checkError.code === 'PGRST204') {
      console.log('Adding DAT verification columns...');
      
      // We need to add the columns - use raw SQL through the dashboard
      console.log(`
Please run these SQL commands in your Supabase dashboard:

ALTER TABLE cities 
ADD COLUMN IF NOT EXISTS dat_verified boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS dat_verified_count integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_dat_verification timestamp with time zone,
ADD COLUMN IF NOT EXISTS freight_score decimal DEFAULT 1.0,
ADD COLUMN IF NOT EXISTS verification_history jsonb DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_cities_dat_verified ON cities(dat_verified) WHERE dat_verified = true;
CREATE INDEX IF NOT EXISTS idx_cities_kma_dat ON cities(kma_code, dat_verified, freight_score DESC) WHERE dat_verified = true;
      `);
      
      return false;
    }

    console.log('✅ Database migrations applied successfully');
    return true;

  } catch (error) {
    console.error('Migration error:', error);
    return false;
  }
}

async function testDatCompatibility() {
  console.log('\n🧪 TESTING DAT-COMPATIBLE LANE GENERATION');
  
  // First apply migrations
  const migrationsOk = await applyDatabaseMigrations();
  if (!migrationsOk) {
    console.error('❌ Failed to apply migrations - aborting test');
    return;
  }

  for (const lane of TEST_LANES) {
    console.log(`\n📍 Testing lane: ${lane.origin_city}, ${lane.origin_state} -> ${lane.dest_city}, ${lane.dest_state}`);
    
    try {
      // Plan pairs with intelligent crawling
      const crawl = await planPairsForLane(lane, { preferFillTo10: true });
      
      console.log('\n🎯 Crawl Results:');
      console.log(`Base Origin: ${crawl.baseOrigin.city}, ${crawl.baseOrigin.state}`);
      console.log(`Base Destination: ${crawl.baseDest.city}, ${crawl.baseDest.state}`);
      console.log(`Found Pairs: ${crawl.pairs.length}`);
      
      // Verify every city with DAT
      console.log('\n🔍 Verifying DAT compatibility for all cities...');
      
      // Verify base cities
      const baseOriginOk = await smartVerifyCity(crawl.baseOrigin.city, crawl.baseOrigin.state, crawl.baseOrigin.zip);
      const baseDestOk = await smartVerifyCity(crawl.baseDest.city, crawl.baseDest.state, crawl.baseDest.zip);
      
      if (!baseOriginOk || !baseDestOk) {
        console.error('❌ Base cities failed DAT verification:');
        if (!baseOriginOk) console.error(`   Origin: ${crawl.baseOrigin.city}, ${crawl.baseOrigin.state}`);
        if (!baseDestOk) console.error(`   Destination: ${crawl.baseDest.city}, ${crawl.baseDest.state}`);
      }
      
      // Verify all pairs
      let allPairsValid = true;
      console.log('\n📊 Generated Pairs:');
      for (const pair of crawl.pairs) {
        const pickupOk = await smartVerifyCity(pair.pickup.city, pair.pickup.state, pair.pickup.zip);
        const deliveryOk = await smartVerifyCity(pair.delivery.city, pair.delivery.state, pair.delivery.zip);
        
        console.log(`${pair.pickup.city}, ${pair.pickup.state} ${pickupOk ? '✅' : '❌'} -> ` +
                    `${pair.delivery.city}, ${pair.delivery.state} ${deliveryOk ? '✅' : '❌'}`);
        
        if (!pickupOk || !deliveryOk) allPairsValid = false;
      }
      
      // Generate CSV rows
      const rows = rowsFromBaseAndPairs(lane, crawl.baseOrigin, crawl.baseDest, crawl.pairs, true);
      
      console.log('\n📈 Row Generation Results:');
      console.log(`Total Rows: ${rows.length}`);
      console.log(`Expected: 12 (6 postings × 2 contact methods)`);
      console.log(`Row Count: ${rows.length === 12 ? '✅ PASS' : '❌ FAIL'}`);
      console.log(`DAT Compatible: ${allPairsValid ? '✅ PASS' : '❌ FAIL'}`);
      
      // Show unique city pairs
      const uniquePairs = new Set();
      rows.forEach(row => {
        const pairKey = `${row['Origin City*']},${row['Origin State*']}->${row['Destination City*']},${row['Destination State*']}`;
        uniquePairs.add(pairKey);
      });
      
      console.log(`\n🎯 Unique City Pairs: ${uniquePairs.size}`);
      console.log('Pairs List:');
      [...uniquePairs].forEach(pair => console.log(`  ${pair}`));
      
      // Final status
      const testPassed = rows.length === 12 && allPairsValid;
      console.log(`\n${testPassed ? '✅ TEST PASSED' : '❌ TEST FAILED'}`);
      if (!testPassed) {
        console.log('Issues found:');
        if (rows.length !== 12) console.log('- Incorrect row count');
        if (!allPairsValid) console.log('- Some cities failed DAT verification');
      }
      
    } catch (error) {
      console.error(`❌ Error testing lane:`, error);
    }
  }
}

// Run the test
testDatCompatibility().catch(console.error);
