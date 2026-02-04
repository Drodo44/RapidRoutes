// scripts/verify-distance-rules.js
import { findDiverseCities } from '../lib/improvedCitySearch.js';
import { calculateDistance } from '../lib/distanceCalculator.js';

async function verifyDistanceRules() {
  console.log('🔍 Verifying strict distance rules...\n');
  
  // Test challenging locations
  const testPoints = [
    {
      city: 'Riegelwood',
      state: 'NC',
      latitude: 34.3293,
      longitude: -78.2214,
      context: 'Rural Eastern NC'
    },
    {
      city: 'Warren',
      state: 'AR',
      latitude: 33.6134,
      longitude: -92.0648,
      context: 'Rural Arkansas'
    },
    {
      city: 'Massillon',
      state: 'OH',
      latitude: 40.7967,
      longitude: -81.5215,
      context: 'Dense KMA Region'
    }
  ];
  
  for (const point of testPoints) {
    console.log(`\nTesting ${point.city}, ${point.state} (${point.context}):`);
    console.log('----------------------------------------');
    
    try {
      const result = await findDiverseCities(point);
      
      // Analyze actual distances
      const cities = result.cities.map(city => ({
        name: `${city.city}, ${city.state_or_province}`,
        kma: city.kma_code,
        distance: Math.round(calculateDistance(
          point.latitude,
          point.longitude,
          city.latitude,
          city.longitude
        ))
      }));
      
      // Sort and display by distance
      cities.sort((a, b) => a.distance - b.distance);
      
      console.log('\nFound Cities:');
      cities.forEach((city, i) => {
        const distanceAlert = city.distance > 100 ? '❌ OVER LIMIT!' : '';
        console.log(`${i + 1}. ${city.name} (${city.kma}) - ${city.distance} miles ${distanceAlert}`);
      });
      
      // Verify strict rules
      console.log('\nRule Verification:');
      console.log(`- Search radius reported: ${result.metadata.searchRadius} miles`);
      console.log(`- Maximum actual distance: ${Math.max(...cities.map(c => c.distance))} miles`);
      console.log(`- Unique KMAs found: ${result.metadata.uniqueKMACount}`);
      
      const violations = cities.filter(c => c.distance > 100);
      if (violations.length > 0) {
        console.error('\n❌ VIOLATIONS FOUND:');
        violations.forEach(v => {
          console.error(`   ${v.name} (${v.kma}) - ${v.distance} miles`);
        });
      } else {
        console.log('\n✅ All cities within 100-mile limit');
      }
      
    } catch (error) {
      console.error(`❌ Error:`, error.message);
    }
  }
}

verifyDistanceRules();