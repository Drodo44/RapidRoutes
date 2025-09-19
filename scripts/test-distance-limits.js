// scripts/test-distance-limits.js
import { findDiverseCities } from '../lib/improvedCitySearch.js';
import { calculateDistance } from '../lib/distanceCalculator.js';

async function testDistanceLimits() {
  console.log('🧪 Testing strict distance limits...\n');
  
  const testCases = [
    {
      name: 'Riegelwood, NC Region',
      point: {
        city: 'Riegelwood',
        state: 'NC',
        latitude: 34.3293,
        longitude: -78.2214
      }
    },
    {
      name: 'Warren, AR Region',
      point: {
        city: 'Warren',
        state: 'AR',
        latitude: 33.6134,
        longitude: -92.0648
      }
    }
  ];
  
  for (const test of testCases) {
    console.log(`📍 Testing ${test.name}...`);
    
    try {
      const result = await findDiverseCities(test.point);
      
      console.log('\nSearch Results:');
      console.log(`Found ${result.metadata.uniqueKMACount} unique KMAs`);
      console.log(`Final search radius: ${result.metadata.searchRadius} miles`);
      console.log(`Total cities found: ${result.metadata.totalCitiesFound}`);
      
      // Analyze distances
      const distances = result.cities.map(city => ({
        city: city.city,
        state: city.state_or_province,
        kma: city.kma_code,
        distance: Math.round(calculateDistance(
          test.point.latitude,
          test.point.longitude,
          city.latitude,
          city.longitude
        ))
      }));
      
      console.log('\nCities by Distance:');
      distances.sort((a, b) => a.distance - b.distance)
        .forEach((d, i) => {
          console.log(`${i + 1}. ${d.city}, ${d.state} (${d.kma}) - ${d.distance} miles`);
      });
      
      // Verify distance limits
      const maxDistance = Math.max(...distances.map(d => d.distance));
      if (maxDistance > 100) {
        console.error(`❌ ERROR: Found city beyond 100-mile limit! (${maxDistance} miles)`);
      } else {
        console.log('\n✅ All cities within 100-mile limit');
      }
      
      console.log('\n---\n');
      
    } catch (error) {
      console.error(`❌ Test failed:`, error);
    }
  }
}

testDistanceLimits();