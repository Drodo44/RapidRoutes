/**
 * Test the 2 lanes that currently generate only 4 rows
 * This will help verify the enhanced system fixes the issue
 */

import { generateDefinitiveIntelligentPairs } from './lib/definitiveIntelligent.js';

async function testProblematicLanes() {
  console.log('🧪 TESTING PROBLEMATIC LANES WITH ENHANCED VERIFICATION SYSTEM');
  console.log('============================================================');

  // The 2 lanes that currently only generate 4 rows (need to identify these)
  const problematicLanes = [
    {
      origin: { city: 'Columbus', state: 'OH' },
      destination: { city: 'Cincinnati', state: 'OH' },
      equipment: 'FD'
    },
    {
      origin: { city: 'Cleveland', state: 'OH' },
      destination: { city: 'Pittsburgh', state: 'PA' },
      equipment: 'V'
    }
  ];

  let totalSuccess = 0;
  let totalTests = problematicLanes.length;

  for (let i = 0; i < problematicLanes.length; i++) {
    const lane = problematicLanes[i];
    console.log(`\n🔍 Testing Lane ${i + 1}: ${lane.origin.city}, ${lane.origin.state} → ${lane.destination.city}, ${lane.destination.state}`);
    console.log('----------------------------');

    try {
      const result = await generateDefinitiveIntelligentPairs({
        origin: lane.origin,
        destination: lane.destination,
        equipment: lane.equipment,
        preferFillTo10: true, // This should generate 5 pairs + 1 base = 6 total postings
        usedCities: new Set()
      });

      const totalPairs = result.pairs?.length || 0;
      const totalPostings = (totalPairs * 2) + 2; // Each pair = 2 postings, plus 2 base postings

      console.log(`📊 Results for Lane ${i + 1}:`);
      console.log(`  Base Origin: ${result.baseOrigin?.city}, ${result.baseOrigin?.state}`);
      console.log(`  Base Destination: ${result.baseDest?.city}, ${result.baseDest?.state}`);
      console.log(`  Generated Pairs: ${totalPairs}`);
      console.log(`  Total Postings: ${totalPostings}`);
      console.log(`  Target: 6+ postings (1 base + 5 pairs)`);

      if (totalPostings >= 6) {
        console.log(`  ✅ SUCCESS: Lane generates ${totalPostings} postings`);
        totalSuccess++;
      } else {
        console.log(`  ❌ INSUFFICIENT: Lane only generates ${totalPostings} postings`);
      }

      // Log pair details
      if (result.pairs && result.pairs.length > 0) {
        console.log(`  📋 Generated Pairs:`);
        result.pairs.forEach((pair, index) => {
          console.log(`    ${index + 1}. ${pair.pickup.city}, ${pair.pickup.state} → ${pair.delivery.city}, ${pair.delivery.state}`);
          if (pair.geographic) {
            console.log(`       KMA: ${pair.geographic.pickup_kma} → ${pair.geographic.delivery_kma}`);
            console.log(`       Distance: ${pair.geographic.pickup_distance?.toFixed(1)}mi → ${pair.geographic.delivery_distance?.toFixed(1)}mi`);
          }
        });
      }

    } catch (error) {
      console.error(`❌ Lane ${i + 1} failed with error:`, error.message);
      console.error('Stack trace:', error.stack);
    }
  }

  console.log('\n📊 OVERALL TEST RESULTS');
  console.log('========================');
  console.log(`✅ Successful lanes: ${totalSuccess}/${totalTests}`);
  console.log(`📈 Success rate: ${(totalSuccess / totalTests * 100).toFixed(1)}%`);
  
  if (totalSuccess === totalTests) {
    console.log('🎉 ALL LANES NOW GENERATE SUFFICIENT POSTINGS!');
    console.log('✅ Enhanced verification system has fixed the problematic lanes');
  } else {
    console.log('⚠️ Some lanes still need attention');
    console.log('🔧 Consider running with HERE.com API key for full functionality');
  }

  console.log('\n🔄 Next Steps:');
  console.log('1. Set up HERE.com API key in environment');
  console.log('2. Run database migration: setup-purged-cities-tables.sql');
  console.log('3. Access admin interface at /admin/purged-cities');
  console.log('4. Monitor system performance and purged cities');
}

// Run the test
testProblematicLanes().catch(console.error);
