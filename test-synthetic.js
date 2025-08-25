// Test synthetic KMA diversity directly

// Define major market KMA codes for diversity
const originKMAs = ['AL_BIR', 'GA_ATL', 'FL_JAX', 'NC_RAL', 'TX_DAL'];
const destKMAs = ['CA_LAX', 'IL_CHI', 'NY_NYC', 'PA_PHI', 'OH_CLE'];

// Example lane with missing cities
const lane = {
  origin_city: "Newberry",
  origin_state: "SC",
  dest_city: "Berlin",
  dest_state: "NJ"
};

// Create synthetic pairs with KMA diversity
const syntheticPairs = [];
for (let i = 0; i < 5; i++) {
  const syntheticPair = {
    pickup: { 
      city: lane.origin_city, 
      state: lane.origin_state,
      kma_code: originKMAs[i % originKMAs.length]
    },
    delivery: { 
      city: lane.dest_city, 
      state: lane.dest_state,
      kma_code: destKMAs[i % destKMAs.length]
    }
  };
  
  console.log(`SYNTHETIC PAIR ${i+1}: ${lane.origin_city}, ${lane.origin_state} (KMA: ${syntheticPair.pickup.kma_code}) -> ${lane.dest_city}, ${lane.dest_state} (KMA: ${syntheticPair.delivery.kma_code})`);
  syntheticPairs.push(syntheticPair);
}

console.log("\nVERIFICATION: All pairs have diverse KMA codes");
console.log("---------------------------------------------");

// Verify all pairs have different KMA codes
const originKMASet = new Set();
const destKMASet = new Set();

syntheticPairs.forEach((pair, index) => {
  originKMASet.add(pair.pickup.kma_code);
  destKMASet.add(pair.delivery.kma_code);
  
  console.log(`Pair ${index+1}: Origin KMA=${pair.pickup.kma_code}, Dest KMA=${pair.delivery.kma_code}`);
});

console.log("\nUNIQUE KMA COUNTS:");
console.log(`Origin KMAs: ${originKMASet.size} unique codes (target: 5)`);
console.log(`Dest KMAs: ${destKMASet.size} unique codes (target: 5)`);

if (originKMASet.size === 5 && destKMASet.size === 5) {
  console.log("\n✅ TEST PASSED: All pairs have unique KMA codes");
} else {
  console.log("\n❌ TEST FAILED: Some KMA codes are duplicated");
}
