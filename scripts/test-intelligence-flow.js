// scripts/test-intelligence-flow.js
import { FreightIntelligence } from '../lib/FreightIntelligence.js';

async function testIntelligenceFlow() {
  console.log('🧪 Testing freight intelligence flow...');
  
  const intelligence = new FreightIntelligence();
  
  // Test a challenging lane that requires HERE.com enrichment
  const testLane = {
    origin: {
      city: 'Riegelwood',
      state: 'NC'
    },
    destination: {
      city: 'Rocky Mount',
      state: 'NC'
    },
    equipment: 'V'
  };
  
  try {
    console.log(`\n📍 Testing lane: ${testLane.origin.city}, ${testLane.origin.state} → ${testLane.destination.city}, ${testLane.destination.state}`);
    
    const result = await intelligence.generatePairs({
      origin: testLane.origin,
      destination: testLane.destination,
      equipment: testLane.equipment,
      count: 22
    });
    
    // Analyze KMA diversity
    const originKMAs = new Set(result.map(p => p.origin.kma_code));
    const destKMAs = new Set(result.map(p => p.destination.kma_code));
    
    console.log('\n📊 Results:');
    console.log(`Total pairs generated: ${result.length}`);
    console.log(`Unique origin KMAs: ${originKMAs.size}`);
    console.log(`Unique destination KMAs: ${destKMAs.size}`);
    console.log('\nOrigin KMAs:', Array.from(originKMAs).join(', '));
    console.log('Destination KMAs:', Array.from(destKMAs).join(', '));
    
    // Validate minimum requirements
    if (originKMAs.size < 5 || destKMAs.size < 5) {
      console.warn('⚠️ Warning: Did not meet minimum KMA diversity requirement (5)');
    }
    
    // Log all pairs for inspection
    console.log('\n🔍 Generated Pairs:');
    result.forEach((pair, index) => {
      console.log(`${index + 1}. ${pair.origin.city}, ${pair.origin.state} (${pair.origin.kma_code}) → ${pair.destination.city}, ${pair.destination.state} (${pair.destination.kma_code})`);
    });
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testIntelligenceFlow();