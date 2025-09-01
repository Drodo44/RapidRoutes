// Test using actual TQL freight lanes from production database
import { generateUniquePairs } from './lib/definitiveIntelligent.fixed.js';
import { adminSupabase } from './utils/supabaseClient.js';

const actualTQLLanes = [
  {
    name: 'NC-PA Flatbed Route',
    origin: { 
      city: 'Seaboard', 
      state: 'NC'
    },
    destination: { 
      city: 'Oxford', 
      state: 'PA'
    },
    equipment: 'FD',
    expected: '4/5 pairs - Mid-Atlantic corridor'
  },
  {
    name: 'AR-TX Steel Run',
    origin: { 
      city: 'Mansfield', 
      state: 'AR'
    },
    destination: { 
      city: 'Houston', 
      state: 'TX'
    },
    equipment: 'FD',
    expected: '3/5 pairs - South Central manufacturing'
  },
  {
    name: 'TX-CA Specialized',
    origin: { 
      city: 'Carrollton', 
      state: 'TX'
    },
    destination: { 
      city: 'San Diego', 
      state: 'CA'
    },
    equipment: 'SB',
    expected: '4/5 pairs - Major cross-country route'
  },
  {
    name: 'NC-WV Manufacturing',
    origin: { 
      city: 'Riegelwood', 
      state: 'NC'
    },
    destination: { 
      city: 'Points', 
      state: 'WV'
    },
    equipment: 'FD',
    expected: '3/5 pairs - Industrial corridor'
  },
  {
    name: 'AL-NC Regional',
    origin: { 
      city: 'Opelika', 
      state: 'AL'
    },
    destination: { 
      city: 'Statesville', 
      state: 'NC'
    },
    equipment: 'FD',
    expected: '4/5 pairs - Southeast manufacturing'
  }
];

async function testActualTQLLanes() {
  console.log('🚛 TESTING WITH ACTUAL TQL FREIGHT LANES');
  console.log('=' .repeat(60));
  
  let totalPairs = 0;
  let totalKMAs = new Set();
  let successCount = 0;
  
  for (const lane of actualTQLLanes) {
    console.log(`\n📍 Testing: ${lane.name}`);
    console.log(`   ${lane.origin.city}, ${lane.origin.state} → ${lane.destination.city}, ${lane.destination.state}`);
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
      if (pairs.length >= 6) successCount++;

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
  console.log(`Average pairs per lane: ${(totalPairs / actualTQLLanes.length).toFixed(1)}`);
  console.log(`Total unique KMAs used: ${totalKMAs.size}`);
  console.log(`Success rate: ${(successCount / actualTQLLanes.length * 100).toFixed(1)}%`);
  
  const finalScore = successCount === actualTQLLanes.length ? '✅' : (successCount > 0 ? '⚠️' : '❌');
  console.log(`\nFinal Result: ${finalScore} ${Math.round((totalPairs / (actualTQLLanes.length * 6)) * 100)}% of target`);
}

// Run the test
testActualTQLLanes().catch(console.error);
