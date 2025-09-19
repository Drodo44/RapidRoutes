// scripts/test-final-intelligence.js
import { findDiverseCities } from '../lib/improvedCitySearch.js';

async function testFinalIntelligence() {
  console.log('🧪 Testing final intelligence implementation...\n');
  
  const testCases = [
    {
      name: 'Riegelwood to Charlotte',
      origin: {
        city: 'Riegelwood',
        state: 'NC',
        latitude: 34.3293,
        longitude: -78.2214
      },
      destination: {
        city: 'Charlotte',
        state: 'NC',
        latitude: 35.2271,
        longitude: -80.8431
      }
    },
    {
      name: 'Warren to Little Rock',
      origin: {
        city: 'Warren',
        state: 'AR',
        latitude: 33.6134,
        longitude: -92.0648
      },
      destination: {
        city: 'Little Rock',
        state: 'AR',
        latitude: 34.7445,
        longitude: -92.2889
      }
    }
  ];
  
  for (const test of testCases) {
    console.log(`📍 Testing ${test.name}...`);
    
    try {
      // Get diverse cities for both origin and destination
      const [originCities, destCities] = await Promise.all([
        findDiverseCities(test.origin),
        findDiverseCities(test.destination)
      ]);
      
      console.log(`\nOrigin (${test.origin.city}):`);
      console.log(`- Found ${originCities.metadata.uniqueKMACount} unique KMAs`);
      console.log(`- Search radius: ${originCities.metadata.searchRadius} miles`);
      console.log('- KMAs:', originCities.cities.map(c => c.kma_code).join(', '));
      
      console.log(`\nDestination (${test.destination.city}):`);
      console.log(`- Found ${destCities.metadata.uniqueKMACount} unique KMAs`);
      console.log(`- Search radius: ${destCities.metadata.searchRadius} miles`);
      console.log('- KMAs:', destCities.cities.map(c => c.kma_code).join(', '));
      
      // Generate and analyze pairs
      const pairs = [];
      const seenPairs = new Set();
      
      for (const orig of originCities.cities) {
        for (const dest of destCities.cities) {
          const pairKey = `${orig.kma_code}-${dest.kma_code}`;
          if (!seenPairs.has(pairKey)) {
            pairs.push({
              origin: orig,
              destination: dest
            });
            seenPairs.add(pairKey);
          }
        }
      }
      
      console.log(`\nGenerated Pairs (${pairs.length} total):`);
      pairs.slice(0, 5).forEach((pair, i) => {
        console.log(`${i + 1}. ${pair.origin.city}, ${pair.origin.state_or_province} (${pair.origin.kma_code}) → ${pair.destination.city}, ${pair.destination.state_or_province} (${pair.destination.kma_code})`);
      });
      if (pairs.length > 5) {
        console.log(`...and ${pairs.length - 5} more pairs`);
      }
      
      console.log('\n---\n');
      
    } catch (error) {
      console.error(`❌ Test failed:`, error);
    }
  }
}

testFinalIntelligence();