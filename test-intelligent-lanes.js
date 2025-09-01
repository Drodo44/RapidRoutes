// test-intelligent-lanes.js
// Tests intelligent lane generation with KMA diversity and market intelligence

import { config } from 'dotenv';
import { FreightIntelligence } from './lib/FreightIntelligence.js';

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
  console.log('� TESTING FREIGHT INTELLIGENCE GENERATION\n');

  const intelligence = new FreightIntelligence();

  for (const lane of TEST_LANES) {
    console.log(`\n📍 Testing lane: ${lane.origin_city}, ${lane.origin_state} -> ${lane.dest_city}, ${lane.dest_state}`);
    
    try {
      // Generate pairs with freight intelligence
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
      
      console.log('\n🧠 Intelligence Results:');
      console.log(`Found Pairs: ${result.pairs.length}`);
      console.log(`Target Range: 6-10 pairs with maximum KMA diversity`);
      
      // Log each pair with its KMA code and score
      console.log('\n📊 Generated Pairs:');
      for (const pair of result.pairs) {
        console.log(
          `${pair.pickup.city}, ${pair.pickup.state} (KMA: ${pair.geographic.pickup_kma}) -> ` +
          `${pair.delivery.city}, ${pair.delivery.state} (KMA: ${pair.geographic.delivery_kma})`
        );
        console.log(`  • Score: ${pair.score?.toFixed(2) || 'N/A'}`);
        console.log(`  • Distances: ${Math.round(pair.geographic.pickup_distance)}mi pickup, ${Math.round(pair.geographic.delivery_distance)}mi delivery`);
      }
      
      // Calculate KMA diversity
      const pickupKMAs = new Set(result.pairs.map(p => p.geographic.pickup_kma));
      const deliveryKMAs = new Set(result.pairs.map(p => p.geographic.delivery_kma));
      const kmaScore = ((pickupKMAs.size + deliveryKMAs.size) / (result.pairs.length * 2)) * 100;
      
      console.log('\n📈 Intelligence Analysis:');
      console.log(`Total Pairs: ${result.pairs.length}`);
      console.log(`KMA Diversity Score: ${kmaScore.toFixed(1)}%`);
      console.log(`Unique Pickup KMAs: ${pickupKMAs.size}`);
      console.log(`Unique Delivery KMAs: ${deliveryKMAs.size}`);
      console.log(`Status: ${result.pairs.length >= 6 ? '✅ PASS' : '❌ FAIL'}`);
      
      // Calculate average distances
      const avgPickupDist = result.pairs.reduce((sum, p) => sum + p.geographic.pickup_distance, 0) / result.pairs.length;
      const avgDeliveryDist = result.pairs.reduce((sum, p) => sum + p.geographic.delivery_distance, 0) / result.pairs.length;
      
      console.log('\n📍 Distance Analysis:');
      console.log(`Average Pickup Distance: ${Math.round(avgPickupDist)} miles`);
      console.log(`Average Delivery Distance: ${Math.round(avgDeliveryDist)} miles`);
      
      // Generate DAT rows
      const datRows = result.pairs.flatMap(pair => {
        const base = {
          'Pickup Earliest*': lane.pickup_earliest || '09/01/2025',
          'Pickup Latest': lane.pickup_latest || '09/02/2025',
          'Length (ft)*': lane.length_ft || '53',
          'Weight (lbs)*': lane.weight_lbs || '45000',
          'Full/Partial*': lane.full_partial || 'full',
          'Equipment*': lane.equipment_code,
          'Use Private Network*': 'NO',
          'Private Network Rate': '',
          'Allow Private Network Booking': '',
          'Allow Private Network Bidding': '',
          'Use DAT Loadboard*': 'yes',
          'DAT Loadboard Rate': '',
          'Allow DAT Loadboard Booking': '',
          'Use Extended Network': '',
          'Origin City*': pair.pickup.city,
          'Origin State*': pair.pickup.state,
          'Origin Postal Code': pair.pickup.zip || '',
          'Destination City*': pair.delivery.city,
          'Destination State*': pair.delivery.state,
          'Destination Postal Code': pair.delivery.zip || '',
          'Comment': '',
          'Commodity': '',
          'Reference ID': `RR${lane.id}`
        };
        return [
          { ...base, 'Contact Method*': 'email' },
          { ...base, 'Contact Method*': 'primary phone' }
        ];
      });
      
      console.log('\n📋 DAT Export Analysis:');
      console.log(`Total Rows: ${datRows.length}`);
      console.log(`Expected Range: 12-20 rows (6-10 pairs × 2 contacts)`);
      console.log(`Status: ${datRows.length >= 12 ? '✅ PASS' : '❌ FAIL'}`);
      
    } catch (error) {
      console.error(`❌ Error testing lane:`, error);
    }
  }
}

// Run the test
testLaneGeneration().catch(console.error);
