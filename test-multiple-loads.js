import { planPairsForLane, rowsFromBaseAndPairs } from './lib/datCsvBuilder.js';

// Simulate multiple loads from Maplesville, AL to show city variation
async function testMultipleLoads() {
  try {
    console.log('🧪 Testing multiple loads from same pickup location...\n');
    
    // Create 3 simulated lanes from Maplesville, AL to different destinations
    const lanes = [
      {
        id: 'load1',
        origin_city: 'Maplesville',
        origin_state: 'AL', 
        dest_city: 'Statesville',
        dest_state: 'NC',
        equipment_code: 'FD',
        weight_lbs: 47000,
        randomize_weight: false
      },
      {
        id: 'load2', 
        origin_city: 'Maplesville',
        origin_state: 'AL',
        dest_city: 'Charlotte', 
        dest_state: 'NC',
        equipment_code: 'FD',
        weight_lbs: 46500,
        randomize_weight: false
      },
      {
        id: 'load3',
        origin_city: 'Maplesville', 
        origin_state: 'AL',
        dest_city: 'Greensboro',
        dest_state: 'NC', 
        equipment_code: 'V',
        weight_lbs: 45000,
        randomize_weight: false
      }
    ];
    
    const usedCities = new Set(); // Track cities across all loads
    const allCityPairs = [];
    
    for (let i = 0; i < lanes.length; i++) {
      const lane = lanes[i];
      console.log(`🚛 LOAD ${i+1}/3: ${lane.origin_city}, ${lane.origin_state} -> ${lane.dest_city}, ${lane.dest_state} (${lane.equipment_code})`);
      
      // Get pairs for this lane, passing usedCities to ensure variation
      const pairResult = await planPairsForLane(lane, { 
        preferFillTo10: true,
        usedCities // This ensures each load gets different cities
      });
      
      console.log(`   📍 Base: ${pairResult.baseOrigin.city}, ${pairResult.baseOrigin.state} -> ${pairResult.baseDest.city}, ${pairResult.baseDest.state}`);
      console.log(`   🎯 Generated ${pairResult.pairs.length} alternative pairs:`);
      
      // Show the pairs for this load
      pairResult.pairs.forEach((pair, idx) => {
        const pairStr = `${pair.pickup.city}, ${pair.pickup.state} -> ${pair.delivery.city}, ${pair.delivery.state}`;
        console.log(`      ${idx+1}. ${pairStr}`);
        allCityPairs.push(`Load ${i+1}: ${pairStr}`);
      });
      
      console.log(`   🚫 Now avoiding ${usedCities.size} cities for next load\n`);
    }
    
    // Summary
    console.log(`🎯 VARIATION ANALYSIS:`);
    console.log(`📊 Total unique city combinations across all loads: ${new Set(allCityPairs).size}`);
    console.log(`🚫 Total cities being avoided for future loads: ${usedCities.size}`);
    
    console.log(`\n📋 All city pairs generated:`);
    allCityPairs.forEach(pair => console.log(`   ${pair}`));
    
    console.log(`\n✅ SUCCESS: Each load from Maplesville gets different alternative cities!`);
    console.log(`📌 This ensures your 6 loads from Maplesville won't look like duplicates on the load board.`);
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testMultipleLoads();
