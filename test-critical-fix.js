// Quick test to verify the critical pair extraction bug fix
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function testPairExtraction() {
  console.log('🧪 TESTING CRITICAL FIX - Pair Extraction Bug');
  console.log('============================================');
  
  try {
    const { generateDefinitiveIntelligentPairs } = await import('./lib/definitiveIntelligent.js');
    
    const result = await generateDefinitiveIntelligentPairs({
      origin: { city: 'Seaboard', state: 'NC' },
      destination: { city: 'Paradise', state: 'PA' },
      equipment: 'FD',
      preferFillTo10: true, // This should give us 5 pairs for 12 rows per lane
      usedCities: new Set()
    });
    
    console.log('📊 EXTRACTION TEST RESULTS:');
    console.log('  result type:', typeof result);
    console.log('  result.pairs exists:', !!result.pairs);  
    console.log('  result.pairs length:', result.pairs?.length || 'N/A');
    console.log('  result.baseOrigin:', result.baseOrigin?.city || 'N/A');
    
    if (result.pairs?.length > 0) {
      console.log('✅ CRITICAL BUG FIXED: Function returns structured object correctly');
      console.log(`🎯 This lane will generate ${(result.pairs.length + 1) * 2} rows (1 base + ${result.pairs.length} pairs × 2 contacts)`);
      console.log(`🎯 Expected for 12 lanes: ${12 * (result.pairs.length + 1) * 2} rows`);
    } else {
      console.log('❌ Still have issues with pair generation');
    }
    
  } catch (error) {
    console.log('❌ Test failed:', error.message);
  }
}

testPairExtraction();
