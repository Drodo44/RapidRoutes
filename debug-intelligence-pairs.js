/**
 * Debug script to test intelligence generation and see why we're not getting 10+ pairs
 */
import { generateSmartCrawlCities } from './utils/smartCitySelector.js';

async function debugIntelligenceGeneration() {
  console.log('🔍 DEBUGGING INTELLIGENCE GENERATION\n');
  
  // Test with a typical route that should have lots of KMA diversity
  const testRoute = {
    origin: { city: 'Charlotte', state: 'NC', zip: '28202' },
    destination: { city: 'Atlanta', state: 'GA', zip: '30309' },
    equipment: 'FD', // Flatbed
    maxPairs: 25 // No artificial limit
  };
  
  console.log(`Testing route: ${testRoute.origin.city}, ${testRoute.origin.state} → ${testRoute.destination.city}, ${testRoute.destination.state}`);
  console.log(`Equipment: ${testRoute.equipment}`);
  console.log(`Max pairs allowed: ${testRoute.maxPairs}\n`);
  
  try {
    const startTime = Date.now();
    const result = await generateSmartCrawlCities(testRoute);
    const duration = Date.now() - startTime;
    
    console.log('📊 RESULTS:');
    console.log(`⏱️  Generation time: ${duration}ms`);
    console.log(`🎯 Pairs found: ${result.pairs?.length || 0}`);
    console.log(`📍 Base origin: ${result.baseOrigin?.city}, ${result.baseOrigin?.state} (KMA: ${result.baseOrigin?.kma})`);
    console.log(`📍 Base destination: ${result.baseDest?.city}, ${result.baseDest?.state} (KMA: ${result.baseDest?.kma})`);
    console.log(`🔄 Allowed duplicates: ${result.allowedDuplicates}`);
    console.log(`⚠️  Shortfall reason: ${result.shortfallReason || 'none'}\n`);
    
    if (result.pairs && result.pairs.length > 0) {
      console.log('🗺️  PAIR BREAKDOWN:');
      result.pairs.forEach((pair, idx) => {
        console.log(`${idx + 1}. ${pair.pickup?.city}, ${pair.pickup?.state} (KMA: ${pair.pickup?.kma || 'unknown'}) → ${pair.delivery?.city}, ${pair.delivery?.state} (KMA: ${pair.delivery?.kma || 'unknown'})`);
        console.log(`   Score: ${pair.score?.toFixed(3) || 'unknown'}, Reason: ${pair.reason || 'none'}`);
      });
      
      // Count unique KMAs
      const uniquePickupKMAs = new Set(result.pairs.map(p => p.pickup?.kma).filter(Boolean));
      const uniqueDeliveryKMAs = new Set(result.pairs.map(p => p.delivery?.kma).filter(Boolean));
      
      console.log(`\n📈 KMA DIVERSITY:`);
      console.log(`   Unique pickup KMAs: ${uniquePickupKMAs.size}`);
      console.log(`   Unique delivery KMAs: ${uniqueDeliveryKMAs.size}`);
      console.log(`   Pickup KMAs: ${Array.from(uniquePickupKMAs).join(', ')}`);
      console.log(`   Delivery KMAs: ${Array.from(uniqueDeliveryKMAs).join(', ')}`);
      
      if (uniquePickupKMAs.size < 6 || uniqueDeliveryKMAs.size < 6) {
        console.log('\n⚠️  PROBLEM IDENTIFIED: Not enough unique KMAs found within 75 miles');
        console.log('   This suggests either:');
        console.log('   1. Database missing KMA data for cities in the area');
        console.log('   2. Scoring algorithm filtering out too many cities');
        console.log('   3. Query radius or limits too restrictive');
      } else {
        console.log('\n✅ KMA diversity looks good!');
      }
    } else {
      console.log('❌ NO PAIRS GENERATED - Critical issue!');
    }
    
  } catch (error) {
    console.error('💥 INTELLIGENCE GENERATION FAILED:', error);
    console.error('Stack:', error.stack);
  }
}

debugIntelligenceGeneration().catch(console.error);
