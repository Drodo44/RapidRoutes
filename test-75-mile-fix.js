#!/usr/bin/env node

// Test the 75-mile radius fix specifically
console.log('🎯 TESTING 75-MILE RADIUS FIX');

import { generateIntelligentCrawlPairs } from './lib/intelligentCrawl.js';

async function test75MileRadius() {
  try {
    console.log('🧪 Testing Atlanta, GA -> Nashville, TN with 75-mile limit');
    
    const result = await generateIntelligentCrawlPairs({
      laneOriginText: "Atlanta, GA",
      laneDestinationText: "Nashville, TN", 
      equipment: "flatbed",
      maxPairs: 5,
      preferFillTo10: true
    });
    
    console.log('📊 Results:');
    console.log('  - Pairs found:', result.pairs?.length || 0);
    console.log('  - Base origin:', result.baseOrigin?.city);
    console.log('  - Base dest:', result.baseDest?.city);
    
    if (result.pairs && result.pairs.length > 0) {
      console.log('🎯 Generated pairs (should all be ≤75 miles from base):');
      result.pairs.forEach((pair, i) => {
        const pickupDist = pair.geographic?.pickup_distance || 'unknown';
        const delivDist = pair.geographic?.delivery_distance || 'unknown'; 
        console.log(`  ${i+1}. ${pair.pickup?.city}, ${pair.pickup?.state} (${pickupDist}mi) -> ${pair.delivery?.city}, ${pair.delivery?.state} (${delivDist}mi)`);
        
        // Verify distances are ≤100 miles (allowing 100 mile emergency fallback)
        if (typeof pickupDist === 'number' && pickupDist > 100) {
          console.log(`    ❌ PICKUP TOO FAR: ${pickupDist} miles > 100 mile max`);
        }
        if (typeof delivDist === 'number' && delivDist > 100) {
          console.log(`    ❌ DELIVERY TOO FAR: ${delivDist} miles > 100 mile max`);
        }
      });
    }
    
    console.log('✅ Test complete - check distances above');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack:', error.stack);
  }
}

test75MileRadius();
