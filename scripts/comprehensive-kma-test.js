// scripts/comprehensive-kma-test.js
import { findDiverseCities } from '../lib/improvedCitySearch.js';
import { calculateDistance } from '../lib/distanceCalculator.js';
import { adminSupabase } from '../utils/supabaseClient.js';

// Realistic test lanes covering diverse geographic regions
const testLanes = [
  // Northeast Manufacturing Corridor
  { city: 'Reading', state: 'PA', context: 'Manufacturing Hub' },
  { city: 'Allentown', state: 'PA', context: 'Distribution Center' },
  { city: 'Scranton', state: 'PA', context: 'Industrial Park' },
  { city: 'Binghamton', state: 'NY', context: 'Manufacturing' },
  { city: 'Elmira', state: 'NY', context: 'Industrial' },
  
  // Mid-Atlantic Distribution
  { city: 'Winchester', state: 'VA', context: 'Distribution' },
  { city: 'Hagerstown', state: 'MD', context: 'Logistics Hub' },
  { city: 'Frederick', state: 'MD', context: 'Warehouse Center' },
  { city: 'Martinsburg', state: 'WV', context: 'Cross-Dock' },
  { city: 'Harrisonburg', state: 'VA', context: 'Regional Hub' },
  
  // Southeast Manufacturing
  { city: 'Greenville', state: 'SC', context: 'Manufacturing' },
  { city: 'Spartanburg', state: 'SC', context: 'Distribution' },
  { city: 'Anderson', state: 'SC', context: 'Industrial' },
  { city: 'Gastonia', state: 'NC', context: 'Textile Hub' },
  { city: 'Rock Hill', state: 'SC', context: 'Manufacturing' },
  
  // Midwest Industrial
  { city: 'Elkhart', state: 'IN', context: 'Manufacturing' },
  { city: 'South Bend', state: 'IN', context: 'Industrial' },
  { city: 'Fort Wayne', state: 'IN', context: 'Distribution' },
  { city: 'Lima', state: 'OH', context: 'Manufacturing' },
  { city: 'Findlay', state: 'OH', context: 'Industrial' },
  
  // Great Lakes Manufacturing
  { city: 'Green Bay', state: 'WI', context: 'Manufacturing' },
  { city: 'Appleton', state: 'WI', context: 'Paper Industry' },
  { city: 'Oshkosh', state: 'WI', context: 'Manufacturing' },
  { city: 'Sheboygan', state: 'WI', context: 'Industrial' },
  { city: 'Manitowoc', state: 'WI', context: 'Manufacturing' },
  
  // Ohio Valley Industrial
  { city: 'Mansfield', state: 'OH', context: 'Manufacturing' },
  { city: 'Marion', state: 'OH', context: 'Industrial' },
  { city: 'Newark', state: 'OH', context: 'Distribution' },
  { city: 'Lancaster', state: 'OH', context: 'Manufacturing' },
  { city: 'Zanesville', state: 'OH', context: 'Industrial' },
  
  // Southern Manufacturing
  { city: 'Tupelo', state: 'MS', context: 'Manufacturing' },
  { city: 'Meridian', state: 'MS', context: 'Distribution' },
  { city: 'Hattiesburg', state: 'MS', context: 'Industrial' },
  { city: 'Florence', state: 'AL', context: 'Manufacturing' },
  { city: 'Decatur', state: 'AL', context: 'Industrial' },
  
  // Texas Industrial
  { city: 'Longview', state: 'TX', context: 'Manufacturing' },
  { city: 'Tyler', state: 'TX', context: 'Distribution' },
  { city: 'Texarkana', state: 'TX', context: 'Cross-Border' },
  { city: 'Sherman', state: 'TX', context: 'Manufacturing' },
  { city: 'Paris', state: 'TX', context: 'Industrial' },
  
  // Plains States
  { city: 'Grand Island', state: 'NE', context: 'Agricultural' },
  { city: 'Kearney', state: 'NE', context: 'Distribution' },
  { city: 'Hastings', state: 'NE', context: 'Manufacturing' },
  { city: 'North Platte', state: 'NE', context: 'Rail Hub' },
  { city: 'Scottsbluff', state: 'NE', context: 'Agricultural' }
];

// Generate additional 60 lanes by varying coordinates slightly
const variations = [
  { lat: 0.5, lng: 0.5 }, { lat: -0.5, lng: -0.5 },
  { lat: 0.3, lng: -0.3 }, { lat: -0.3, lng: 0.3 },
  { lat: 0.4, lng: 0 }, { lat: 0, lng: 0.4 }
];

async function getCoordinates(city, state) {
  const { data, error } = await adminSupabase
    .from('cities')
    .select('latitude, longitude')
    .eq('city', city)
    .eq('state_or_province', state)
    .single();
    
  if (error) throw error;
  return data;
}

async function generateAdditionalLanes() {
  const additionalLanes = [];
  for (const lane of testLanes.slice(0, 10)) { // Take first 10 base lanes
    const coords = await getCoordinates(lane.city, lane.state);
    if (!coords) continue;
    
    for (const variation of variations) {
      additionalLanes.push({
        city: `${lane.city}_Var`,
        state: lane.state,
        latitude: coords.latitude + variation.lat,
        longitude: coords.longitude + variation.lng,
        context: `${lane.context} Variant`
      });
    }
  }
  return additionalLanes;
}

async function runComprehensiveTest() {
  console.log('🔄 Running Comprehensive KMA Diversity Test\n');
  
  // Combine base lanes with variations
  const additionalLanes = await generateAdditionalLanes();
  const allLanes = [...testLanes, ...additionalLanes];
  
  console.log(`Testing ${allLanes.length} total lanes...\n`);
  
  let totalCities = 0;
  let maxKMAsFound = 0;
  let totalKMAs = new Set();
  let laneResults = [];
  
  for (const lane of allLanes) {
    try {
      // Get coordinates if not provided
      if (!lane.latitude || !lane.longitude) {
        const coords = await getCoordinates(lane.city, lane.state);
        if (coords) {
          lane.latitude = coords.latitude;
          lane.longitude = coords.longitude;
        }
      }
      
      if (!lane.latitude || !lane.longitude) {
        console.error(`❌ Could not find coordinates for ${lane.city}, ${lane.state}`);
        continue;
      }
      
      console.log(`\nTesting ${lane.city}, ${lane.state} (${lane.context}):`);
      console.log('----------------------------------------');
      
      const result = await findDiverseCities(lane);
      
      // Process results
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
      
      // Update statistics
      const uniqueKMAs = new Set(cities.map(c => c.kma));
      totalCities += cities.length;
      maxKMAsFound = Math.max(maxKMAsFound, uniqueKMAs.size);
      cities.forEach(c => totalKMAs.add(c.kma));
      
      // Store result
      laneResults.push({
        origin: `${lane.city}, ${lane.state}`,
        kmaCount: uniqueKMAs.size,
        cityCount: cities.length,
        maxDistance: Math.max(...cities.map(c => c.distance))
      });
      
      // Display results
      console.log(`\nFound ${cities.length} cities with ${uniqueKMAs.size} unique KMAs`);
      console.log(`Max distance: ${Math.max(...cities.map(c => c.distance))} miles`);
      
      if (uniqueKMAs.size >= 10) {
        console.log('🌟 High KMA diversity achieved!');
      } else if (uniqueKMAs.size >= 5) {
        console.log('✅ Minimum KMA requirement met');
      } else {
        console.log('⚠️ Below minimum KMA threshold');
      }
      
    } catch (error) {
      console.error(`❌ Error processing ${lane.city}:`, error.message);
    }
  }
  
  // Sort lanes by KMA count for analysis
  laneResults.sort((a, b) => b.kmaCount - a.kmaCount);
  
  // Display comprehensive results
  console.log('\n📊 Comprehensive Test Results:');
  console.log('============================');
  console.log(`Total lanes tested: ${laneResults.length}`);
  console.log(`Total cities processed: ${totalCities}`);
  console.log(`Total unique KMAs found: ${totalKMAs.size}`);
  console.log(`Maximum KMAs in a single lane: ${maxKMAsFound}`);
  console.log(`Average cities per lane: ${Math.round(totalCities / laneResults.length)}`);
  
  console.log('\n🏆 Top 10 Lanes for KMA Diversity:');
  laneResults
    .slice(0, 10)
    .forEach((result, i) => {
      console.log(`${i + 1}. ${result.origin}: ${result.kmaCount} KMAs, ${result.cityCount} cities`);
    });
  
  // KMA distribution analysis
  const kmaDistribution = {
    excellent: laneResults.filter(r => r.kmaCount >= 10).length,
    good: laneResults.filter(r => r.kmaCount >= 7 && r.kmaCount < 10).length,
    minimum: laneResults.filter(r => r.kmaCount >= 5 && r.kmaCount < 7).length,
    below: laneResults.filter(r => r.kmaCount < 5).length
  };
  
  console.log('\n📈 KMA Distribution:');
  console.log(`Excellent (10+ KMAs): ${kmaDistribution.excellent} lanes`);
  console.log(`Good (7-9 KMAs): ${kmaDistribution.good} lanes`);
  console.log(`Minimum Met (5-6 KMAs): ${kmaDistribution.minimum} lanes`);
  console.log(`Below Minimum (<5 KMAs): ${kmaDistribution.below} lanes`);
}

runComprehensiveTest();