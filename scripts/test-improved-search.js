// scripts/test-improved-search.js
import { findDiverseCities } from '../lib/improvedCitySearch.js';

async function testImprovedSearch() {
  const testCases = [
    {
      name: "Riegelwood Test",
      city: {
        city: "Riegelwood",
        state: "NC",
        latitude: 34.3293,
        longitude: -78.2214
      }
    },
    {
      name: "Rural Arkansas Test",
      city: {
        city: "Warren",
        state: "AR",
        latitude: 33.6134,
        longitude: -92.0648
      }
    }
  ];
  
  for (const test of testCases) {
    console.log(`\n🧪 Running ${test.name}...`);
    
    try {
      const result = await findDiverseCities(test.city);
      
      console.log(`\nSearch Results for ${test.city.city}, ${test.city.state}:`);
      console.log(`Total unique KMAs found: ${result.metadata.uniqueKMACount}`);
      console.log(`Search radius used: ${result.metadata.searchRadius} miles`);
      console.log(`Total cities examined: ${result.metadata.totalCitiesFound}`);
      
      console.log('\nDiverse Cities Found:');
      result.cities.forEach((city, index) => {
        console.log(`${index + 1}. ${city.city}, ${city.state_or_province} (${city.kma_code}) - ${Math.round(city.distance)}mi`);
      });
      
    } catch (error) {
      console.error(`❌ Test failed:`, error);
    }
  }
}

testImprovedSearch();