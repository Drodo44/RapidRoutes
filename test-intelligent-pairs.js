import { generateDefinitiveIntelligentPairs } from './lib/definitiveIntelligent.js';

// Test cases representing different scenarios
const testCases = [
  {
    name: "Standard Distance Test",
    origin: { city: "Cincinnati", state: "OH", zip: "45202" },
    destination: { city: "Columbus", state: "OH", zip: "43215" },
    equipment: "V"
  },
  {
    name: "Cross-State Test",
    origin: { city: "Chicago", state: "IL", zip: "60601" },
    destination: { city: "Indianapolis", state: "IN", zip: "46201" },
    equipment: "V"
  },
  {
    name: "Major Market Test",
    origin: { city: "Atlanta", state: "GA", zip: "30303" },
    destination: { city: "Charlotte", state: "NC", zip: "28202" },
    equipment: "V"
  }
];

async function runTests() {
  console.log("🧪 TESTING DEFINITIVE INTELLIGENT PAIR GENERATION\n");
  
  for (const test of testCases) {
    console.log(`\n📍 TEST CASE: ${test.name}`);
    console.log(`Base Route: ${test.origin.city}, ${test.origin.state} -> ${test.destination.city}, ${test.destination.state}`);
    
    const startTime = Date.now();
    const result = await generateDefinitiveIntelligentPairs({
      origin: test.origin,
      destination: test.destination,
      equipment: test.equipment,
      preferFillTo10: true
    });
    const duration = Date.now() - startTime;
    
    console.log("\nResults:");
    console.log(`⏱️  Generation Time: ${duration}ms`);
    console.log(`📊 Pairs Generated: ${result.pairs.length}`);
    
    if (result.pairs.length > 0) {
      console.log("\n🔍 Generated Pairs:");
      result.pairs.forEach((pair, i) => {
        console.log(`\n${i + 1}. ${pair.pickup.city}, ${pair.pickup.state} -> ${pair.delivery.city}, ${pair.delivery.state}`);
        console.log(`   Score: ${pair.score.toFixed(2)}`);
        console.log(`   Pickup KMA: ${pair.geographic.pickup_kma}`);
        console.log(`   Delivery KMA: ${pair.geographic.delivery_kma}`);
        console.log(`   Distances: ${pair.geographic.pickup_distance.toFixed(1)}mi / ${pair.geographic.delivery_distance.toFixed(1)}mi`);
      });
    } else {
      console.log("❌ No pairs generated");
    }
    
    // Validation checks
    const checks = {
      hasBasePair: result.baseOrigin && result.baseDest,
      hasPairs: result.pairs.length > 0,
      distanceValid: result.pairs.every(p => 
        p.geographic.pickup_distance <= 100 && 
        p.geographic.delivery_distance <= 100
      ),
      uniquePairs: new Set(result.pairs.map(p => 
        `${p.pickup.city},${p.pickup.state}->${p.delivery.city},${p.delivery.state}`
      )).size === result.pairs.length
    };
    
    console.log("\n✅ Validation:");
    Object.entries(checks).forEach(([check, passed]) => {
      console.log(`${passed ? '✓' : '✗'} ${check}: ${passed}`);
    });
  }
}

// Run tests with proper error handling
runTests().catch(error => {
  console.error("🚨 Test Error:", error);
  process.exit(1);
});
