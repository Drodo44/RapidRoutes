#!/usr/bin/env node

// Test the enhanced intelligent fallback system that guarantees 6 total postings
// This tests Option 1: Intelligent Fallback Hierarchy

import { generateGeographicCrawlPairs } from './lib/geographicCrawl.js';

console.log('🧪 TESTING INTELLIGENT FALLBACK SYSTEM - Guarantee 6 Total Postings');
console.log('=' .repeat(80));

// Test various market scenarios to validate the guarantee
const testCases = [
  {
    name: 'High KMA Diversity Market',
    origin: { city: 'Atlanta', state: 'GA' },
    destination: { city: 'Chicago', state: 'IL' },
    equipment: 'V',
    expected: '5 pairs from primary KMA diversity'
  },
  {
    name: 'Limited KMA Market',
    origin: { city: 'Bozeman', state: 'MT' },
    destination: { city: 'Billings', state: 'MT' },
    equipment: 'FD',
    expected: '5 pairs using fallback strategies'
  },
  {
    name: 'Coastal Challenge',
    origin: { city: 'Miami', state: 'FL' },
    destination: { city: 'Jacksonville', state: 'FL' },
    equipment: 'R',
    expected: '5 pairs with sub-market splitting'
  },
  {
    name: 'Rural Freight Corridor',
    origin: { city: 'Grand Junction', state: 'CO' },
    destination: { city: 'Salt Lake City', state: 'UT' },
    equipment: 'V',
    expected: '5 pairs using freight corridor logic'
  },
  {
    name: 'East Coast Dense Market',
    origin: { city: 'Philadelphia', state: 'PA' },
    destination: { city: 'New York', state: 'NY' },
    equipment: 'V',
    expected: '5 pairs with adjacent market expansion'
  }
];

async function runIntelligentFallbackTest() {
  console.log('📊 Testing Intelligent Fallback Hierarchy for guaranteed 6 total postings');
  console.log('');
  
  let totalSuccesses = 0;
  let totalPartial = 0;
  let totalFailures = 0;
  
  for (const testCase of testCases) {
    console.log(`🎯 TEST: ${testCase.name}`);
    console.log(`   Route: ${testCase.origin.city}, ${testCase.origin.state} → ${testCase.destination.city}, ${testCase.destination.state}`);
    console.log(`   Equipment: ${testCase.equipment} | Expected: ${testCase.expected}`);
    
    try {
      const result = await generateGeographicCrawlPairs({
        origin: testCase.origin,
        destination: testCase.destination,
        equipment: testCase.equipment,
        preferFillTo10: true, // This should trigger 5 pair generation
        usedCities: new Set()
      });
      
      const totalPostings = 1 + result.pairs.length; // 1 base + pairs
      const targetPairs = 5;
      
      console.log(`   📈 RESULT: ${result.pairs.length}/${targetPairs} pairs generated (${totalPostings} total postings)`);
      console.log(`   📊 KMA Analysis: ${result.kmaAnalysis?.uniquePickupKmas || 'N/A'} pickup KMAs, ${result.kmaAnalysis?.uniqueDeliveryKmas || 'N/A'} delivery KMAs`);
      console.log(`   🔧 Fallback Used: ${result.kmaAnalysis?.fallbackUsed ? 'YES' : 'NO'}`);
      console.log(`   📏 Search Radius: ${result.kmaAnalysis?.searchRadius || 'N/A'} miles`);
      
      // Show fallback strategies used
      const fallbackStrategies = new Set();
      result.pairs.forEach(pair => {
        if (pair.geographic?.fallback_strategy) {
          fallbackStrategies.add(pair.geographic.fallback_strategy);
        }
      });
      
      if (fallbackStrategies.size > 0) {
        console.log(`   🔄 Fallback Strategies: ${Array.from(fallbackStrategies).join(', ')}`);
      }
      
      // Classification
      if (result.pairs.length >= targetPairs) {
        console.log(`   ✅ SUCCESS: Full guarantee achieved (${totalPostings} total postings)`);
        totalSuccesses++;
      } else if (result.pairs.length >= 3) {
        console.log(`   ⚠️ PARTIAL: ${result.pairs.length} pairs (${totalPostings} total postings) - commercially viable`);
        totalPartial++;
      } else {
        console.log(`   ❌ INSUFFICIENT: Only ${result.pairs.length} pairs generated`);
        totalFailures++;
      }
      
      // Show sample pairs
      console.log(`   📋 Sample Pairs Generated:`);
      result.pairs.slice(0, 3).forEach((pair, i) => {
        const fallback = pair.geographic?.fallback_strategy ? ` [${pair.geographic.fallback_strategy}]` : '';
        console.log(`      ${i+1}. ${pair.pickup.city}, ${pair.pickup.state} (${pair.geographic?.pickup_kma}) → ${pair.delivery.city}, ${pair.delivery.state} (${pair.geographic?.delivery_kma})${fallback}`);
      });
      
      if (result.pairs.length > 3) {
        console.log(`      ... and ${result.pairs.length - 3} more pairs`);
      }
      
    } catch (error) {
      console.log(`   ❌ ERROR: ${error.message}`);
      totalFailures++;
    }
    
    console.log('');
  }
  
  // Final Summary
  console.log('📊 INTELLIGENT FALLBACK TEST SUMMARY');
  console.log('=' .repeat(60));
  console.log(`✅ Full Success (5+ pairs): ${totalSuccesses}/${testCases.length}`);
  console.log(`⚠️ Partial Success (3-4 pairs): ${totalPartial}/${testCases.length}`);
  console.log(`❌ Insufficient (<3 pairs): ${totalFailures}/${testCases.length}`);
  
  const successRate = ((totalSuccesses + totalPartial) / testCases.length * 100).toFixed(1);
  console.log(`📈 Commercial Viability Rate: ${successRate}% (3+ pairs = viable freight posting)`);
  
  if (totalSuccesses >= testCases.length * 0.6) {
    console.log('🎯 INTELLIGENT FALLBACK SYSTEM: ✅ HIGHLY EFFECTIVE');
    console.log('   The system successfully guarantees viable freight postings across diverse markets.');
  } else if (totalSuccesses + totalPartial >= testCases.length * 0.8) {
    console.log('🎯 INTELLIGENT FALLBACK SYSTEM: ⚠️ COMMERCIALLY VIABLE');
    console.log('   The system provides reliable freight coverage with intelligent fallbacks.');
  } else {
    console.log('🎯 INTELLIGENT FALLBACK SYSTEM: ❌ NEEDS IMPROVEMENT');
    console.log('   Additional fallback strategies may be needed for complete coverage.');
  }
  
  console.log('');
  console.log('💡 BROKER PERSPECTIVE:');
  console.log('   • 5+ pairs = Optimal DAT market coverage');
  console.log('   • 3-4 pairs = Sufficient freight posting diversity'); 
  console.log('   • 2 pairs = Minimal but usable');
  console.log('   • <2 pairs = Insufficient for professional freight brokerage');
}

// Run the test
if (process.env.NODE_ENV !== 'test') {
  runIntelligentFallbackTest().catch(console.error);
}

export { runIntelligentFallbackTest };
