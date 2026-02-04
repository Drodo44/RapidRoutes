// scripts/enhanced-kma-test.js
import { findDiverseCitiesEnhanced } from '../lib/enhancedCitySearch.js';
import { calculateDistance } from '../lib/distanceCalculator.js';

// Strategic test points known for potential KMA diversity
const testLanes = [
  // Northeast Corridor (High density area)
  { city: 'Harrisburg', state: 'PA', context: 'Distribution Hub' },
  { city: 'Allentown', state: 'PA', context: 'Logistics Center' },
  { city: 'Lancaster', state: 'PA', context: 'Manufacturing' },
  { city: 'York', state: 'PA', context: 'Industrial' },
  { city: 'Reading', state: 'PA', context: 'Distribution' },
  
  // Mid-Atlantic Region (Strong KMA overlap)
  { city: 'Frederick', state: 'MD', context: 'Distribution' },
  { city: 'Hagerstown', state: 'MD', context: 'Logistics' },
  { city: 'Winchester', state: 'VA', context: 'Manufacturing' },
  { city: 'Martinsburg', state: 'WV', context: 'Cross-Dock' },
  { city: 'Front Royal', state: 'VA', context: 'Warehousing' },
  
  // Great Lakes Region (Multiple state boundaries)
  { city: 'Toledo', state: 'OH', context: 'Port Operations' },
  { city: 'Erie', state: 'PA', context: 'Lake Transport' },
  { city: 'Cleveland', state: 'OH', context: 'Manufacturing' },
  { city: 'Akron', state: 'OH', context: 'Industrial' },
  { city: 'Canton', state: 'OH', context: 'Distribution' },
  
  // Indiana/Ohio Border (Known high KMA density)
  { city: 'Fort Wayne', state: 'IN', context: 'Manufacturing' },
  { city: 'Lima', state: 'OH', context: 'Industrial' },
  { city: 'Findlay', state: 'OH', context: 'Distribution' },
  { city: 'Marion', state: 'IN', context: 'Manufacturing' },
  { city: 'Muncie', state: 'IN', context: 'Industrial' }
];

async function runEnhancedTest() {
  console.log('🔄 Running Enhanced KMA Diversity Test\n');
  console.log(`Testing ${testLanes.length} strategic lanes...\n`);
  
  let successCount = 0;
  let totalKMAs = new Set();
  let laneResults = [];
  
  for (const lane of testLanes) {
    try {
      console.log(`\nTesting ${lane.city}, ${lane.state} (${lane.context}):`);
      console.log('----------------------------------------');
      
      const result = await findDiverseCitiesEnhanced(lane, {
        initialRadius: 75,
        maxRadius: 100,
        minKMACount: 5,
        useSecondaryKMAs: true,
        radiusIncrement: 15
      });
      
      // Process results
      const cities = result.cities.map(city => ({
        name: `${city.city}, ${city.state_or_province}`,
        kma: city.kma_code,
        distance: Math.round(calculateDistance(
          lane.latitude || city.origin_lat,
          lane.longitude || city.origin_lng,
          city.latitude,
          city.longitude
        ))
      }));
      
      // Update statistics
      const uniqueKMAs = new Set(cities.map(c => c.kma));
      cities.forEach(c => totalKMAs.add(c.kma));
      
      if (uniqueKMAs.size >= 5) {
        successCount++;
      }
      
      // Store result
      laneResults.push({
        origin: `${lane.city}, ${lane.state}`,
        kmaCount: uniqueKMAs.size,
        cityCount: cities.length,
        maxDistance: Math.max(...cities.map(c => c.distance))
      });
      
      // Display results
      console.log('\nFound Cities:');
      cities.forEach((city, i) => {
        console.log(`${i + 1}. ${city.name} (${city.kma}) - ${city.distance} miles`);
      });
      
      console.log('\nResults Analysis:');
      console.log(`- Unique KMAs found: ${uniqueKMAs.size}`);
      console.log(`- Total cities: ${cities.length}`);
      console.log(`- Search radius used: ${result.metadata.searchRadius} miles`);
      console.log(`- Secondary KMAs available: ${result.metadata.secondaryKMAsFound}`);
      
      if (uniqueKMAs.size >= 5) {
        console.log('\n✅ Successfully found 5+ KMAs');
      } else {
        console.log('\n⚠️ Did not meet minimum KMA requirement');
      }
      
    } catch (error) {
      console.error(`❌ Error processing ${lane.city}:`, error.message);
    }
  }
  
  // Sort results by KMA count
  laneResults.sort((a, b) => b.kmaCount - a.kmaCount);
  
  // Display final statistics
  console.log('\n📊 Enhanced Test Results:');
  console.log('=======================');
  console.log(`Success Rate: ${(successCount / testLanes.length * 100).toFixed(1)}%`);
  console.log(`Total unique KMAs found: ${totalKMAs.size}`);
  console.log(`Average KMAs per successful lane: ${(laneResults.reduce((sum, r) => sum + r.kmaCount, 0) / laneResults.length).toFixed(1)}`);
  
  console.log('\n🏆 Top Performing Lanes:');
  laneResults
    .slice(0, 5)
    .forEach((result, i) => {
      console.log(`${i + 1}. ${result.origin}: ${result.kmaCount} KMAs, ${result.cityCount} cities`);
    });
  
  // KMA distribution analysis
  const distribution = {
    excellent: laneResults.filter(r => r.kmaCount >= 8).length,
    good: laneResults.filter(r => r.kmaCount >= 6 && r.kmaCount < 8).length,
    passing: laneResults.filter(r => r.kmaCount >= 5 && r.kmaCount < 6).length,
    failing: laneResults.filter(r => r.kmaCount < 5).length
  };
  
  console.log('\n📈 KMA Distribution:');
  console.log(`Excellent (8+ KMAs): ${distribution.excellent} lanes`);
  console.log(`Good (6-7 KMAs): ${distribution.good} lanes`);
  console.log(`Passing (5 KMAs): ${distribution.passing} lanes`);
  console.log(`Below Target (<5 KMAs): ${distribution.failing} lanes`);
}

runEnhancedTest();