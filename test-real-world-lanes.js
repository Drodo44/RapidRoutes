// Test using real TQL freight lanes
import { generateUniquePairs } from './lib/definitiveIntelligent.fixed.js';
import { adminSupabase } from './utils/supabaseClient.js';

const realWorldLanes = [
  {
    name: 'Southeast Regional',
    origin: { city: 'Maplesville', state: 'AL' },
    destination: { city: 'Charlotte', state: 'NC' },
    equipment: 'FD',
    expected: '3/5 pairs expected - rural to industrial'
  },
  {
    name: 'Atlanta Distribution',
    origin: { city: 'Atlanta', state: 'GA' },
    destination: { city: 'Nashville', state: 'TN' },
    equipment: 'V',
    expected: '4/5 pairs expected - regional corridor'
  },
  {
    name: 'Gulf Coast Run',
    origin: { city: 'Houston', state: 'TX' },
    destination: { city: 'Jacksonville', state: 'FL' },
    equipment: 'V',
    expected: '4/5 pairs expected - I-10 corridor'
  }
];

async function testRealWorldLanes() {
  console.log('🚛 TESTING WITH REAL TQL FREIGHT LANES');
  console.log('=' .repeat(60));
  
  let totalLanes = 0;
  let successfulLanes = 0;

  for (const lane of realWorldLanes) {
    console.log(`\n📍 Testing: ${lane.name}`);
    console.log(`   ${lane.origin.city}, ${lane.origin.state} → ${lane.destination.city}, ${lane.destination.state}`);
    console.log(`   Equipment: ${lane.equipment}`);
    console.log(`   Expected: ${lane.expected}`);
    
    try {
      // Get origin city data
      const { data: originCity } = await adminSupabase
        .from('cities')
        .select('*')
        .eq('city', lane.origin.city)
        .eq('state_or_province', lane.origin.state)
        .single();

      // Get destination city data
      const { data: destCity } = await adminSupabase
        .from('cities')
        .select('*')
        .eq('city', lane.destination.city)
        .eq('state_or_province', lane.destination.state)
        .single();

      if (!originCity || !destCity) {
        console.log('❌ Could not find city data');
        continue;
      }

      // Generate pairs with intelligent system
      const pairs = await generateUniquePairs({
        baseOrigin: originCity,
        baseDest: destCity,
        equipment: lane.equipment,
        minPostings: 6
      });

      console.log('\n📊 Results:');
      console.log(`   Generated ${pairs.length} unique pairs`);
      
      // Analyze KMA diversity
      const pickupKMAs = new Set();
      const deliveryKMAs = new Set();
      
      pairs.forEach(pair => {
        pickupKMAs.add(pair.kmas.pickup);
        deliveryKMAs.add(pair.kmas.delivery);
      });

      console.log(`   Unique pickup KMAs: ${pickupKMAs.size}`);
      console.log(`   Unique delivery KMAs: ${deliveryKMAs.size}`);

      // Show actual pairs
      console.log('\n   Generated pairs:');
      pairs.forEach((pair, i) => {
        console.log(`   ${i + 1}. ${pair.pickup.city}, ${pair.pickup.state} → ${pair.delivery.city}, ${pair.delivery.state}`);
        console.log(`      Distances: ${Math.round(pair.distances.pickup)}mi/${Math.round(pair.distances.delivery)}mi`);
        console.log(`      KMAs: ${pair.kmas.pickup} → ${pair.kmas.delivery}`);
      });

      // Performance assessment
      const score = pairs.length >= 6 ? '✅' : '❌';
      console.log(`\n   Performance: ${score} ${pairs.length}/6 required pairs generated`);
      
      totalLanes++;
      if (pairs.length >= 6) successfulLanes++;

    } catch (error) {
      console.error('Error testing lane:', error);
    }
  }

  // Final summary
  console.log('\n📊 FINAL RESULTS');
  console.log('=' .repeat(60));
  console.log(`Total lanes tested: ${totalLanes}`);
  console.log(`Successful lanes: ${successfulLanes}`);
  console.log(`Success rate: ${Math.round((successfulLanes/totalLanes) * 100)}%`);
  
  if (successfulLanes === totalLanes) {
    console.log('\n✅ All lanes generated successfully!');
  } else {
    console.log('\n⚠️ Some lanes failed to generate minimum pairs');
  }
}

// Run if called directly
if (process.argv[1] === import.meta.url) {
  testRealWorldLanes().catch(console.error);
}
