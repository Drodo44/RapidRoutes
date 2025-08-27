// test-urgent-fix.js - URGENT: Test if our freight intelligence is actually working
import { adminSupabase } from './utils/supabaseClient.js';
import { generateGeographicCrawlPairs } from './lib/geographicCrawl.js';

async function testMontaukBan() {
  console.log('🚨 URGENT TEST: Checking if Montauk ban is working...\n');
  
  try {
    // Test with a New York area destination to see if Montauk gets selected
    const testResult = await generateGeographicCrawlPairs({
      origin: { city: 'Wagener', state: 'SC' },
      destination: { city: 'Napeague', state: 'NY' },
      equipment: 'FD',
      preferFillTo10: true,
      usedCities: new Set()
    });
    
    console.log('🔍 Test Result:');
    console.log(`- Pairs generated: ${testResult.pairs?.length || 0}`);
    
    if (testResult.pairs) {
      console.log('\n📋 Generated pairs:');
      testResult.pairs.forEach((pair, i) => {
        console.log(`${i+1}. ${pair.pickup.city}, ${pair.pickup.state} -> ${pair.delivery.city}, ${pair.delivery.state}`);
      });
      
      // Check if any pair contains Montauk
      const hasMontauk = testResult.pairs.some(pair => 
        pair.pickup.city.toLowerCase().includes('montauk') ||
        pair.delivery.city.toLowerCase().includes('montauk')
      );
      
      if (hasMontauk) {
        console.log('\n❌ CRITICAL ERROR: Montauk was selected despite ban!');
        return false;
      } else {
        console.log('\n✅ SUCCESS: No Montauk cities selected');
        return true;
      }
    } else {
      console.log('❌ No pairs generated');
      return false;
    }
    
  } catch (error) {
    console.error('Test failed:', error);
    return false;
  }
}

async function testRowCount() {
  console.log('\n🔢 URGENT TEST: Checking row count generation...\n');
  
  try {
    const testResult = await generateGeographicCrawlPairs({
      origin: { city: 'Augusta', state: 'GA' },
      destination: { city: 'New Bedford', state: 'MA' },
      equipment: 'FD',
      preferFillTo10: true,
      usedCities: new Set()
    });
    
    console.log(`🔍 Pairs for preferFillTo10=true: ${testResult.pairs?.length || 0}`);
    console.log('✅ Expected: 5 pairs (to generate 6 postings × 2 contacts = 12 rows)');
    
    if (testResult.pairs?.length === 5) {
      console.log('✅ Row count logic is correct');
      return true;
    } else {
      console.log(`❌ Wrong pair count: got ${testResult.pairs?.length}, expected 5`);
      return false;
    }
    
  } catch (error) {
    console.error('Row count test failed:', error);
    return false;
  }
}

async function runUrgentTests() {
  console.log('🚨 RUNNING URGENT FREIGHT INTELLIGENCE TESTS\n');
  console.log('Testing if our fixes are actually working...\n');
  
  const montaukTest = await testMontaukBan();
  const rowCountTest = await testRowCount();
  
  console.log('\n📊 TEST RESULTS:');
  console.log(`🚫 Montauk ban working: ${montaukTest ? '✅ YES' : '❌ NO'}`);
  console.log(`🔢 Row count correct: ${rowCountTest ? '✅ YES' : '❌ NO'}`);
  
  if (montaukTest && rowCountTest) {
    console.log('\n🎯 ALL TESTS PASSED - Your freight intelligence is working!');
    console.log('The issue might be with deployment caching or API routing.');
  } else {
    console.log('\n💥 TESTS FAILED - The core logic needs fixing.');
  }
}

runUrgentTests().catch(console.error);
