// scripts/realistic-lanes-stress-test.js
import { findDiverseCities } from '../lib/improvedCitySearch.js';
import { calculateDistance } from '../lib/distanceCalculator.js';

// Realistic test lanes with non-major cities
const testLanes = [
  {
    // Manufacturing plant to distribution center
    city: 'Tupelo',
    state: 'MS',
    latitude: 34.2576,
    longitude: -88.7034,
    context: 'Furniture Manufacturing Hub'
  },
  {
    // Agricultural route
    city: 'Storm Lake',
    state: 'IA',
    latitude: 42.6427,
    longitude: -95.2056,
    context: 'Agricultural Processing'
  },
  {
    // Distribution center location
    city: 'Lebanon',
    state: 'PA',
    latitude: 40.3409,
    longitude: -76.4113,
    context: 'Distribution Center Route'
  },
  {
    // Industrial park location
    city: 'Rocky Mount',
    state: 'NC',
    latitude: 35.9382,
    longitude: -77.7905,
    context: 'Industrial Park Hub'
  },
  {
    // Cross-border route
    city: 'Plattsburgh',
    state: 'NY',
    latitude: 44.6950,
    longitude: -73.4563,
    context: 'Cross-Border Route'
  },
  {
    // Agricultural storage
    city: 'Garden City',
    state: 'KS',
    latitude: 37.9717,
    longitude: -100.8726,
    context: 'Agricultural Storage'
  },
  {
    // Manufacturing supplier route
    city: 'Fond du Lac',
    state: 'WI',
    latitude: 43.7730,
    longitude: -88.4470,
    context: 'Manufacturing Supply Chain'
  },
  {
    // Warehousing hub
    city: 'Fairfield',
    state: 'CA',
    latitude: 38.2493,
    longitude: -122.0399,
    context: 'Warehousing Distribution'
  }
];

async function runStressTest() {
  console.log('🔄 Running Realistic Lanes Stress Test\n');
  console.log('Testing realistic freight lanes with non-major cities...\n');
  
  let totalCities = 0;
  let maxDistanceFound = 0;
  let totalKMAs = new Set();
  
  for (const lane of testLanes) {
    console.log(`\nTesting ${lane.city}, ${lane.state} (${lane.context}):`);
    console.log('----------------------------------------');
    
    try {
      const result = await findDiverseCities(lane);
      
      // Analyze distances and KMAs
      const cities = result.cities.map(city => ({
        name: `${city.city}, ${city.state_or_province}`,
        kma: city.kma_code,
        distance: Math.round(calculateDistance(
          lane.latitude,
          lane.longitude,
          city.latitude,
          city.longitude
        ))
      }));
      
      // Sort by distance
      cities.sort((a, b) => a.distance - b.distance);
      
      // Track statistics
      totalCities += cities.length;
      maxDistanceFound = Math.max(maxDistanceFound, Math.max(...cities.map(c => c.distance)));
      cities.forEach(c => totalKMAs.add(c.kma));
      
      // Display results
      console.log('\nFound Cities:');
      cities.forEach((city, i) => {
        console.log(`${i + 1}. ${city.name} (${city.kma}) - ${city.distance} miles`);
      });
      
      // Verify compliance
      console.log('\nCompliance Check:');
      console.log(`- Search radius used: ${result.metadata.searchRadius} miles`);
      console.log(`- Maximum distance: ${Math.max(...cities.map(c => c.distance))} miles`);
      console.log(`- Unique KMAs found: ${result.metadata.uniqueKMACount}`);
      
      const violations = cities.filter(c => c.distance > 100);
      if (violations.length > 0) {
        console.error('\n❌ Distance violations found:');
        violations.forEach(v => {
          console.error(`   ${v.name} (${v.kma}) - ${v.distance} miles`);
        });
      } else {
        console.log('\n✅ All cities within 100-mile limit');
      }
      
    } catch (error) {
      console.error(`❌ Error processing ${lane.city}:`, error.message);
    }
  }
  
  // Display aggregate statistics
  console.log('\n📊 Stress Test Summary:');
  console.log('====================');
  console.log(`Total lanes tested: ${testLanes.length}`);
  console.log(`Total cities processed: ${totalCities}`);
  console.log(`Unique KMAs found: ${totalKMAs.size}`);
  console.log(`Maximum distance found: ${maxDistanceFound} miles`);
  console.log(`Average cities per lane: ${Math.round(totalCities / testLanes.length)}`);
}

runStressTest();