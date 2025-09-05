import { generateUniquePairs } from './lib/definitiveIntelligent.fixed.js';

async function runTests() {
  const testCases = [
    {
      name: 'Major City Pair (Chicago -> Indianapolis)',
      origin: {
        city: 'Chicago',
        state_or_province: 'IL',
        latitude: 41.8781,
        longitude: -87.6298,
        kma_code: 'IL_CHI'
      },
      dest: {
        city: 'Indianapolis',
        state_or_province: 'IN',
        latitude: 39.7684,
        longitude: -86.1581,
        kma_code: 'IN_IND'
      }
    },
    {
      name: 'Coastal Cities (Miami -> Jacksonville)',
      origin: {
        city: 'Miami',
        state_or_province: 'FL',
        latitude: 25.7617,
        longitude: -80.1918,
        kma_code: 'FL_MIA'
      },
      dest: {
        city: 'Jacksonville',
        state_or_province: 'FL',
        latitude: 30.3322,
        longitude: -81.6557,
        kma_code: 'FL_JAX'
      }
    },
    {
      name: 'Rural Area Test (Topeka -> Wichita)',
      origin: {
        city: 'Topeka',
        state_or_province: 'KS',
        latitude: 39.0473,
        longitude: -95.6752,
        kma_code: 'KS_TOP'
      },
      dest: {
        city: 'Wichita',
        state_or_province: 'KS',
        latitude: 37.6872,
        longitude: -97.3301,
        kma_code: 'KS_ICT'
      }
    },
    {
      name: 'Border Region (Cincinnati -> Louisville)',
      origin: {
        city: 'Cincinnati',
        state_or_province: 'OH',
        latitude: 39.1031,
        longitude: -84.5120,
        kma_code: 'OH_CIN'
      },
      dest: {
        city: 'Louisville',
        state_or_province: 'KY',
        latitude: 38.2527,
        longitude: -85.7585,
        kma_code: 'KY_LOU'
      }
    }
  ];

  for (const testCase of testCases) {
    console.log(`\n=== Running Test: ${testCase.name} ===`);
    try {
      const pairs = await generateUniquePairs({
        baseOrigin: testCase.origin,
        baseDest: testCase.dest,
        equipment: 'V',
        minPostings: 6
      });

      // Verify KMA uniqueness
      const pickupKMAs = new Set(pairs.map(p => p.kmas.pickup));
      const deliveryKMAs = new Set(pairs.map(p => p.kmas.delivery));
      
      console.log('\nResults:');
      console.log('Total pairs generated:', pairs.length);
      console.log('Unique pickup KMAs:', pickupKMAs.size);
      console.log('Unique delivery KMAs:', deliveryKMAs.size);
      
      // Check distances
      const maxPickupDist = Math.max(...pairs.map(p => p.distances.pickup));
      const maxDeliveryDist = Math.max(...pairs.map(p => p.distances.delivery));
      
      console.log('\nDistance Verification:');
      console.log('Max pickup distance:', maxPickupDist.toFixed(1), 'miles');
      console.log('Max delivery distance:', maxDeliveryDist.toFixed(1), 'miles');
      
      // Verify band distribution
      const pickupBands = pairs.map(p => p.bands.pickup);
      const deliveryBands = pairs.map(p => p.bands.delivery);
      
      console.log('\nBand Distribution:');
      console.log('Pickup bands:', [...new Set(pickupBands)].sort((a,b) => a-b));
      console.log('Delivery bands:', [...new Set(deliveryBands)].sort((a,b) => a-b));

      // Validation
      const passed = pairs.length >= 6 &&
                     pickupKMAs.size === pairs.length &&
                     deliveryKMAs.size === pairs.length &&
                     maxPickupDist <= 75 &&
                     maxDeliveryDist <= 75;

      console.log('\nTest Status:', passed ? '✅ PASSED' : '❌ FAILED');
      
    } catch (error) {
      console.error(`Test failed:`, error);
    }
  }
}

runTests();
