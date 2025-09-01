// Test using verified TQL freight lanes with real KMA codes
import { generateUniquePairs } from './lib/definitiveIntelligent.fixed.js';
import { adminSupabase } from './utils/supabaseClient.js';

const realTQLLanes = [
  {
    name: 'Alabama - North Carolina Regional',
    origin: { 
      city: 'Maplesville', 
      state: 'AL',
      kma: 'AL_MON' // Montgomery Market
    },
    destination: { 
      city: 'Charlotte', 
      state: 'NC',
      kma: 'NC_CLT' // Charlotte Market
    },
    equipment: 'FD',
    expected: '3/5 pairs minimum - rural to major market'
  },
  {
    name: 'Georgia - Tennessee Regional',
    origin: { 
      city: 'Atlanta', 
      state: 'GA',
      kma: 'GA_ATL' // Atlanta Market
    },
    destination: { 
      city: 'Nashville', 
      state: 'TN',
      kma: 'TN_NSH' // Nashville Market  
    },
    equipment: 'V',
    expected: '4/5 pairs - strong regional corridor'
  },
  {
    name: 'Gulf Coast Corridor',
    origin: { 
      city: 'Houston', 
      state: 'TX',
      kma: 'TX_HOU' // Houston Market
    },
    destination: { 
      city: 'Jacksonville', 
      state: 'FL',
      kma: 'FL_JAX' // Jacksonville Market
    },
    equipment: 'V', 
    expected: '4/5 pairs - established I-10 corridor'
  }
];

async function testTQLLanes() {
  console.log('🚛 TESTING REAL TQL FREIGHT LANES');
  console.log('=' .repeat(60));
  
  let totalPairs = 0;
  let totalKMAs = new Set();
  
  for (const lane of realTQLLanes) {
    console.log(`\n📍 Testing: ${lane.name}`);
    console.log(`   ${lane.origin.city}, ${lane.origin.state} (${lane.origin.kma}) → ` +
                `${lane.destination.city}, ${lane.destination.state} (${lane.destination.kma})`);
    console.log(`   Equipment: ${lane.equipment}`);
    console.log(`   Expected: ${lane.expected}`);
    
    try {
      // Get detailed city data from database
      const { data: originCity } = await adminSupabase
        .from('cities')
        .select('*')
        .eq('city', lane.origin.city)
        .eq('state_or_province', lane.origin.state)
        .single();

      const { data: destCity } = await adminSupabase
        .from('cities')
        .select('*')
        .eq('city', lane.destination.city)
        .eq('state_or_province', lane.destination.state)
        .single();

      if (!originCity || !destCity) {
        throw new Error('Could not find city data');
      }

      // Generate pairs with intelligent system
      const pairs = await generateUniquePairs({
        baseOrigin: originCity,
        baseDest: destCity,
        equipment: lane.equipment,
        minPostings: 6,
        maxRadius: 75 // Strict 75-mile limit
      });

      // Analyze results
      console.log('\n📊 Results:');
      console.log(`   Generated ${pairs.length} unique pairs`);
      
      // Track KMA diversity
      const pickupKMAs = new Set();
      const deliveryKMAs = new Set();
      
      pairs.forEach(pair => {
        pickupKMAs.add(pair.kmas.pickup);
        deliveryKMAs.add(pair.kmas.delivery);
        totalKMAs.add(pair.kmas.pickup);
        totalKMAs.add(pair.kmas.delivery);
      });

      totalPairs += pairs.length;

      // Show KMA diversity
      console.log(`   Unique pickup KMAs: ${pickupKMAs.size}`);
      console.log(`   Unique delivery KMAs: ${deliveryKMAs.size}`);

      // List actual pairs with details
      console.log('\n   Generated pairs:');
      pairs.forEach((pair, i) => {
        console.log(`   ${i + 1}. ${pair.pickup.city}, ${pair.pickup.state} → ${pair.delivery.city}, ${pair.delivery.state}`);
        console.log(`      Distances: ${Math.round(pair.distances.pickup)}mi/${Math.round(pair.distances.delivery)}mi`);
        console.log(`      KMAs: ${pair.kmas.pickup} → ${pair.kmas.delivery}`);
      });

      // Score this lane
      const score = pairs.length >= 6 ? '✅' : '❌';
      console.log(`\n   Performance: ${score} ${pairs.length}/6 required pairs`);

    } catch (error) {
      console.error('Error testing lane:', error);
    }
  }

  // Final analysis
  console.log('\n📈 OVERALL ANALYSIS');
  console.log('=' .repeat(60));
  console.log(`Total pairs generated: ${totalPairs}`);
  console.log(`Average pairs per lane: ${(totalPairs / realTQLLanes.length).toFixed(1)}`);
  console.log(`Total unique KMAs used: ${totalKMAs.size}`);
  console.log(`Target pairs needed: ${realTQLLanes.length * 6}`);
  
  const finalScore = totalPairs >= (realTQLLanes.length * 6) ? '✅' : '❌';
  console.log(`\nFinal Result: ${finalScore} ${Math.round((totalPairs / (realTQLLanes.length * 6)) * 100)}% of target`);
}

// Run the test
testTQLLanes().catch(console.error);
