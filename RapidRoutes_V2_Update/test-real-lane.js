// test-real-lane.js
import { FreightIntelligence } from './lib/FreightIntelligence.js';
import { generateDatCsvRows, toCsv } from './lib/datCsvBuilder.js';

// Set up test environment
process.env.NODE_ENV = 'test';
process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://localhost:54321';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-key';

async function testRealLane() {
  console.log('🧪 Testing real lane with high KMA diversity potential...');
  
  // Cincinnati area to Philadelphia area (known high KMA density regions)
  const lane = {
    id: 'test-1',
    origin_city: 'Mason',
    origin_state: 'OH',
    destination_city: 'King of Prussia',
    destination_state: 'PA',
    equipment_code: 'V',
    weight_lbs: '42000',
    length_ft: '53',
    pickup_earliest: '2025-09-13',
    pickup_latest: '2025-09-13',
    commodity: 'General Freight',
    full_partial: 'full'
  };

  try {
    const fi = new FreightIntelligence();
    console.log('\n📍 Testing origin-destination pair:', 
      `${lane.origin_city}, ${lane.origin_state} → ${lane.destination_city}, ${lane.destination_state}`);

    // Generate pairs with intelligence system
    const pairs = await fi.generatePairs({
      origin: { city: lane.origin_city, state: lane.origin_state },
      destination: { city: lane.destination_city, state: lane.destination_state },
      equipment: lane.equipment_code,
      count: 22
    });

    // Analyze KMA diversity
    const originKMAs = new Set();
    const destKMAs = new Set();
    pairs.forEach(pair => {
      originKMAs.add(pair.origin.kma_code);
      destKMAs.add(pair.destination.kma_code);
    });

    console.log('\n🎯 Intelligence Results:');
    console.log(`Found ${pairs.length} total pairs`);
    console.log(`Origin KMAs: ${originKMAs.size} unique`);
    console.log('  - KMAs:', Array.from(originKMAs).join(', '));
    console.log(`Destination KMAs: ${destKMAs.size} unique`);
    console.log('  - KMAs:', Array.from(destKMAs).join(', '));

    // Show the unique pairs we found
    console.log('\n🌆 Sample City Pairs:');
    pairs.forEach((pair, i) => {
      if (i < 5) {
        console.log(`${pair.origin.city}, ${pair.origin.state} (${pair.origin.kma_code}) → ` + 
                    `${pair.destination.city}, ${pair.destination.state} (${pair.destination.kma_code})`);
      }
    });

  } catch (error) {
    console.error('❌ Test failed:', error);
    console.error(error.stack);
  }
}

testRealLane();