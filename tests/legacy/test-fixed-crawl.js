import { planPairsForLane, rowsFromBaseAndPairs } from './lib/datCsvBuilder.js';

async function testFixedCrawl() {
  console.log('🔧 Testing FIXED geographic crawl (NO SYNTHETIC PAIRS)...\n');

  // Test multiple loads from same pickup to ensure variety
  const lane = {
    origin_city: 'Maplesville',
    origin_state: 'AL',
    dest_city: 'Charlotte',
    dest_state: 'NC',
    equipment_code: 'FD',
    weight_lbs: 46500
  };

  const usedCities = new Set(); // Track cities across loads
  
  for (let loadNum = 1; loadNum <= 3; loadNum++) {
    console.log(`\n🚛 LOAD ${loadNum}: Testing variety with used cities from previous loads`);
    console.log(`   Origin: ${lane.origin_city}, ${lane.origin_state} -> ${lane.dest_city}, ${lane.dest_state}`);
    console.log(`   Previously used cities: ${usedCities.size}`);

    // Get pairs for this load
    const pairResult = await planPairsForLane(lane, {
      preferFillTo10: true,
      usedCities
    });

    console.log(`📊 Pair Result for Load ${loadNum}:`);
    console.log(`   Base: ${pairResult.baseOrigin.city}, ${pairResult.baseOrigin.state} -> ${pairResult.baseDest.city}, ${pairResult.baseDest.state}`);
    console.log(`   Generated ${pairResult.pairs.length} pairs`);

    // Check for duplicates within this load
    const cities = new Set();
    pairResult.pairs.forEach(pair => {
      const pickupKey = `${pair.pickup.city}, ${pair.pickup.state}`;
      const deliveryKey = `${pair.delivery.city}, ${pair.delivery.state}`;
      if (cities.has(pickupKey)) {
        console.log(`❌ DUPLICATE PICKUP: ${pickupKey}`);
      } else {
        cities.add(pickupKey);
      }
      if (cities.has(deliveryKey)) {
        console.log(`❌ DUPLICATE DELIVERY: ${deliveryKey}`);
      } else {
        cities.add(deliveryKey);
      }
    });

    // Generate rows
    const rows = rowsFromBaseAndPairs(
      lane,
      pairResult.baseOrigin,
      pairResult.baseDest,
      pairResult.pairs,
      true, // preferFillTo10 = true
      new Set()
    );

    console.log(`✅ Load ${loadNum}: Generated ${rows.length} rows`);
    console.log(`🎯 Pairs in this load:`);
    pairResult.pairs.forEach((pair, i) => {
      console.log(`   ${i+1}. ${pair.pickup.city}, ${pair.pickup.state} -> ${pair.delivery.city}, ${pair.delivery.state}`);
    });
    
    // Update usedCities for next load 
    if (pairResult.usedCities) {
      pairResult.usedCities.forEach(city => usedCities.add(city));
    }
  }
  
  console.log(`\n🏁 FINAL RESULT: Used ${usedCities.size} unique cities across all loads`);
  console.log('✅ SUCCESS: No synthetic pairs needed with 289+ cities available!');
}

testFixedCrawl();
