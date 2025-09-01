// test-intelligent-lanes.js
// Tests intelligent lane generation with KMA diversity

import { config } from 'dotenv';
import { adminSupabase } from './utils/supabaseClient.js';
import { planPairsForLane, rowsFromBaseAndPairs } from './lib/datCsvBuilder.js';

config(); // Load environment variables

const TEST_LANES = [
  {
    id: 'TEST-1',
    origin_city: 'Chicago',
    origin_state: 'IL',
    origin_zip: '60601',
    dest_city: 'Atlanta',
    dest_state: 'GA',
    dest_zip: '30301',
    equipment_code: 'V',
    length_ft: '53',
    weight_lbs: '45000',
    full_partial: 'full',
    pickup_earliest: '09/01/2025',
    pickup_latest: '09/02/2025'
  },
  {
    id: 'TEST-2',
    origin_city: 'Los Angeles',
    origin_state: 'CA',
    origin_zip: '90001',
    dest_city: 'Dallas',
    dest_state: 'TX',
    dest_zip: '75201',
    equipment_code: 'V',
    length_ft: '53',
    weight_lbs: '42000',
    full_partial: 'full',
    pickup_earliest: '09/01/2025',
    pickup_latest: '09/02/2025'
  }
];

async function testLaneGeneration() {
  console.log('🧪 TESTING INTELLIGENT LANE GENERATION\n');

  for (const lane of TEST_LANES) {
    console.log(`\n📍 Testing lane: ${lane.origin_city}, ${lane.origin_state} -> ${lane.dest_city}, ${lane.dest_state}`);
    
    try {
      // Plan pairs with intelligent crawling
      const crawl = await planPairsForLane(lane, { preferFillTo10: true });
      
      console.log('\n🎯 Crawl Results:');
      console.log(`Base Origin: ${crawl.baseOrigin.city}, ${crawl.baseOrigin.state}`);
      console.log(`Base Destination: ${crawl.baseDest.city}, ${crawl.baseDest.state}`);
      console.log(`Found Pairs: ${crawl.pairs.length}`);
      
      // Log each pair with its KMA code
      console.log('\n📊 Generated Pairs:');
      for (const pair of crawl.pairs) {
        const { data: pickupKma } = await adminSupabase
          .from('cities')
          .select('kma_code, kma_name')
          .eq('city', pair.pickup.city)
          .eq('state_or_province', pair.pickup.state)
          .single();
          
        const { data: deliveryKma } = await adminSupabase
          .from('cities')
          .select('kma_code, kma_name')
          .eq('city', pair.delivery.city)
          .eq('state_or_province', pair.delivery.state)
          .single();
          
        console.log(`${pair.pickup.city}, ${pair.pickup.state} (KMA: ${pickupKma?.kma_name || 'Unknown'}) -> ` +
                    `${pair.delivery.city}, ${pair.delivery.state} (KMA: ${deliveryKma?.kma_name || 'Unknown'})`);
      }
      
      // Generate CSV rows
      const rows = rowsFromBaseAndPairs(lane, crawl.baseOrigin, crawl.baseDest, crawl.pairs, true);
      
      console.log('\n📈 Row Generation Results:');
      console.log(`Total Rows: ${rows.length}`);
      console.log(`Expected: 12 (6 postings × 2 contact methods)`);
      console.log(`Status: ${rows.length === 12 ? '✅ PASS' : '❌ FAIL'}`);
      
      // Show unique city pairs
      const uniquePairs = new Set();
      rows.forEach(row => {
        const pairKey = `${row['Origin City*']},${row['Origin State*']}->${row['Destination City*']},${row['Destination State*']}`;
        uniquePairs.add(pairKey);
      });
      
      console.log(`\n🎯 Unique City Pairs: ${uniquePairs.size}`);
      console.log('Pairs List:');
      [...uniquePairs].forEach(pair => console.log(`  ${pair}`));
      
      // Analyze KMA diversity
      console.log('\n📊 KMA Diversity Analysis:');
      const kmas = new Set();
      for (const pair of crawl.pairs) {
        const { data: pickupKma } = await adminSupabase
          .from('cities')
          .select('kma_code')
          .eq('city', pair.pickup.city)
          .eq('state_or_province', pair.pickup.state)
          .single();
          
        if (pickupKma?.kma_code) {
          kmas.add(pickupKma.kma_code);
        }
      }
      console.log(`Unique KMAs used: ${kmas.size}`);
      
    } catch (error) {
      console.error(`❌ Error testing lane:`, error);
    }
  }
}

// Run the test
testLaneGeneration().catch(console.error);
