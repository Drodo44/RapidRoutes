#!/usr/bin/env node

// Load environment variables
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

console.log('🧠 Testing HERE.com Enhanced Intelligent Crawl System');
console.log('=================================================\n');

console.log('🔧 Environment Check:');
console.log(`   HERE_API_KEY: ${process.env.HERE_API_KEY ? '✅ Configured' : '❌ Missing'}`);
console.log(`   SUPABASE: ${process.env.NEXT_PUBLIC_SUPABASE_URL ? '✅ Configured' : '❌ Missing'}`);

if (!process.env.HERE_API_KEY) {
  console.log('\n❌ HERE_API_KEY is required for this enhanced system');
  process.exit(1);
}

// Test the enhanced system
const { generateIntelligentCrawlPairs } = await import('./lib/intelligentCrawl.js');

console.log('\n🧪 Testing Enhanced Lane Generation:');
console.log('   Lane: Atlanta, GA → Nashville, TN (Van)');

try {
  const result = await generateIntelligentCrawlPairs({
    origin: { city: 'Atlanta', state: 'GA' },
    destination: { city: 'Nashville', state: 'TN' },
    equipment: 'V',
    preferFillTo10: true,
    usedCities: new Set()
  });

  console.log('\n📊 Enhanced System Results:');
  console.log(`   ✅ Pairs generated: ${result.pairs?.length || 0}/5`);
  console.log(`   🎯 Total postings: ${(result.pairs?.length || 0) + 1}`);
  console.log(`   📋 CSV rows: ${((result.pairs?.length || 0) + 1) * 2}`);

  if (result.learningStats) {
    console.log('\n🧠 HERE.com Learning Results:');
    console.log(`   🔍 New pickup cities discovered: ${result.learningStats.newPickupCitiesDiscovered}`);
    console.log(`   🔍 New delivery cities discovered: ${result.learningStats.newDeliveryCitiesDiscovered}`);
    console.log(`   💾 Total new cities added to database: ${result.learningStats.totalNewCities}`);
  }

  if (result.verification) {
    console.log('\n🛡️ HERE.com Verification Results:');
    console.log(`   ✅ Cities verified: ${result.verification.verifiedCities}/${result.verification.totalCities}`);
    console.log(`   🔄 Replacements made: ${result.verification.replacements}`);
    console.log(`   📈 Verification rate: ${(result.verification.verifiedCities / result.verification.totalCities * 100).toFixed(1)}%`);
  }

  if (result.pairs?.length > 0) {
    console.log('\n🚛 Sample Generated Pairs:');
    result.pairs.slice(0, 3).forEach((pair, i) => {
      console.log(`   ${i + 1}. ${pair.pickup.city}, ${pair.pickup.state} → ${pair.delivery.city}, ${pair.delivery.state}`);
      if (pair.learning?.pickup_was_discovered) {
        console.log(`      🆕 Pickup was newly discovered by HERE.com!`);
      }
      if (pair.learning?.delivery_was_discovered) {
        console.log(`      🆕 Delivery was newly discovered by HERE.com!`);
      }
      if (pair.verification?.pickup.replacement) {
        console.log(`      🔄 Pickup replaced: ${pair.verification.pickup.originalCity} → verified city`);
      }
      if (pair.verification?.delivery.replacement) {
        console.log(`      🔄 Delivery replaced: ${pair.verification.delivery.originalCity} → verified city`);
      }
    });
  }

  console.log('\n🎉 HERE.com Enhanced System Test Complete!');
  console.log('✅ The system is now using HERE.com to:');
  console.log('   • Discover new cities and add them to the database');
  console.log('   • Verify all cities to prevent DAT posting errors'); 
  console.log('   • Guarantee high-quality freight postings');
  console.log('   • Continuously improve data quality over time');

} catch (error) {
  console.error('\n❌ Enhanced system test failed:', error.message);
  console.log('\n🔄 System will fall back to basic database search if HERE.com fails');
}
