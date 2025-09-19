// scripts/test-kma-diversity.js
import { FreightIntelligence } from '../lib/FreightIntelligence.js';

async function testKMADiversity() {
  console.log('🧪 Testing KMA diversity with problematic lanes...');
  
  const intelligence = new FreightIntelligence();
  
  // Test cases known to challenge KMA diversity
  const testCases = [
    {
      name: "Riegelwood Test",
      origin: { city: 'Riegelwood', state: 'NC' },
      destination: { city: 'Charlotte', state: 'NC' }
    },
    {
      name: "Russellville Test",
      origin: { city: 'Russellville', state: 'AR' },
      destination: { city: 'Little Rock', state: 'AR' }
    },
    {
      name: "Rural Area Test",
      origin: { city: 'Warren', state: 'AR' },
      destination: { city: 'Pine Bluff', state: 'AR' }
    }
  ];
  
  for (const test of testCases) {
    console.log(`\n🔍 Running ${test.name}...`);
    
    try {
      const pairs = await intelligence.generatePairs({
        origin: test.origin,
        destination: test.destination,
        equipment: 'V',
        count: 22
      });
      
      // Analyze KMA diversity
      const originKMAs = new Set(pairs.map(p => p.origin.kma_code));
      const destKMAs = new Set(pairs.map(p => p.destination.kma_code));
      
      console.log(`✅ Generated ${pairs.length} pairs`);
      console.log(`📊 Origin KMAs: ${originKMAs.size} unique codes (${Array.from(originKMAs).join(', ')})`);
      console.log(`📊 Destination KMAs: ${destKMAs.size} unique codes (${Array.from(destKMAs).join(', ')})`);
      
    } catch (error) {
      console.error(`❌ Test failed:`, error.message);
    }
  }
}

testKMADiversity();