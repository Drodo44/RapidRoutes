/**
 * COMPREHENSIVE TESTING FOR FIXED INTELLIGENT SYSTEM
 * Tests all core requirements and edge cases
 */
import { generateUniquePairs } from './lib/definitiveIntelligent.fixed.js';
import { adminSupabase } from './utils/supabaseClient.js';

const TEST_CITIES = {
  ATLANTA: {
    city: 'Atlanta',
    state_or_province: 'GA',
    latitude: 33.7490,
    longitude: -84.3880,
    kma_code: 'GA_ATL'
  },
  CHICAGO: {
    city: 'Chicago',
    state_or_province: 'IL',
    latitude: 41.8781,
    longitude: -87.6298,
    kma_code: 'IL_CHI'
  }
};

async function runComprehensiveTests() {
  console.log('🔍 STARTING COMPREHENSIVE TESTS');
  
  try {
    // Test 1: Basic Lane Generation
    console.log('\n📋 TEST 1: Basic Lane Generation');
    const basicPairs = await generateUniquePairs({
      baseOrigin: TEST_CITIES.ATLANTA,
      baseDest: TEST_CITIES.CHICAGO,
      equipment: 'V',
      minPostings: 6
    });

    console.log(`Generated ${basicPairs.length} pairs`);
    console.log('KMA Diversity Check:');
    const pickupKMAs = new Set(basicPairs.map(p => p.kmas.pickup));
    const deliveryKMAs = new Set(basicPairs.map(p => p.kmas.delivery));
    console.log(`Unique Pickup KMAs: ${pickupKMAs.size}`);
    console.log(`Unique Delivery KMAs: ${deliveryKMAs.size}`);

    // Test 2: Multiple Loads Same Origin
    console.log('\n📋 TEST 2: Multiple Loads Same Origin (12 postings)');
    const multiplePairs = await generateUniquePairs({
      baseOrigin: TEST_CITIES.ATLANTA,
      baseDest: TEST_CITIES.CHICAGO,
      equipment: 'V',
      minPostings: 12
    });

    console.log(`Generated ${multiplePairs.length} pairs`);
    const multiplePickupKMAs = new Set(multiplePairs.map(p => p.kmas.pickup));
    const multipleDeliveryKMAs = new Set(multiplePairs.map(p => p.kmas.delivery));
    console.log(`Unique Pickup KMAs: ${multiplePickupKMAs.size}`);
    console.log(`Unique Delivery KMAs: ${multipleDeliveryKMAs.size}`);

    // Test 3: Distance Compliance
    console.log('\n📋 TEST 3: Distance Compliance');
    const distanceViolations = basicPairs.filter(pair => 
      pair.distances.pickup > 75 || pair.distances.delivery > 75
    );
    console.log(`Distance violations found: ${distanceViolations.length}`);
    if (distanceViolations.length > 0) {
      console.log('❌ WARNING: Found pairs exceeding 75 mile radius:');
      distanceViolations.forEach(pair => {
        console.log(`  ${pair.pickup.city}, ${pair.pickup.state} (${Math.round(pair.distances.pickup)}mi) -> ${pair.delivery.city}, ${pair.delivery.state} (${Math.round(pair.distances.delivery)}mi)`);
      });
    }

    // Test 4: KMA Uniqueness Verification
    console.log('\n📋 TEST 4: KMA Uniqueness Verification');
    const kmaViolations = findKMAViolations(basicPairs);
    if (kmaViolations.length > 0) {
      console.log('❌ ERROR: Found KMA duplicates:');
      kmaViolations.forEach(v => console.log(v));
    } else {
      console.log('✅ All KMAs are unique');
    }

    // Test 5: Load Volume Test
    console.log('\n📋 TEST 5: Load Volume Test (24 postings)');
    const volumePairs = await generateUniquePairs({
      baseOrigin: TEST_CITIES.ATLANTA,
      baseDest: TEST_CITIES.CHICAGO,
      equipment: 'V',
      minPostings: 24
    });
    console.log(`Generated ${volumePairs.length} pairs`);
    const volumeKMAViolations = findKMAViolations(volumePairs);
    console.log(`KMA violations in volume test: ${volumeKMAViolations.length}`);

    // Print Summary
    console.log('\n📊 TEST SUMMARY');
    console.log('1. Basic Generation:', basicPairs.length >= 6 ? '✅' : '❌');
    console.log('2. Multiple Loads:', multiplePairs.length >= 12 ? '✅' : '❌');
    console.log('3. Distance Compliance:', distanceViolations.length === 0 ? '✅' : '❌');
    console.log('4. KMA Uniqueness:', kmaViolations.length === 0 ? '✅' : '❌');
    console.log('5. Volume Handling:', volumePairs.length >= 24 ? '✅' : '❌');

  } catch (error) {
    console.error('❌ TEST ERROR:', error);
  }
}

/**
 * Find any KMA duplicates in the pairs
 */
function findKMAViolations(pairs) {
  const violations = [];
  const seenPickupKMAs = new Set();
  const seenDeliveryKMAs = new Set();

  pairs.forEach(pair => {
    if (seenPickupKMAs.has(pair.kmas.pickup)) {
      violations.push(`Duplicate pickup KMA: ${pair.kmas.pickup} (${pair.pickup.city}, ${pair.pickup.state})`);
    }
    if (seenDeliveryKMAs.has(pair.kmas.delivery)) {
      violations.push(`Duplicate delivery KMA: ${pair.kmas.delivery} (${pair.delivery.city}, ${pair.delivery.state})`);
    }
    seenPickupKMAs.add(pair.kmas.pickup);
    seenDeliveryKMAs.add(pair.kmas.delivery);
  });

  return violations;
}

// Run the tests
runComprehensiveTests();
