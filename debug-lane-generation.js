#!/usr/bin/env node

// Debug lane generation - analyze the KMA selection issue
import dotenv from 'dotenv';
dotenv.config();

import { generateIntelligentCrawlPairs } from './lib/intelligentCrawl.js';
import { adminSupabase } from './utils/supabaseClient.js';

console.log('🔍 Analyzing RapidRoutes Lane Generation Issue');

async function analyzeKmaDistribution() {
  console.log('\n📊 KMA Distribution Analysis...');
  
  try {
    // Check KMA codes in database
    const { data: kmaCounts, error } = await adminSupabase
      .from('cities')
      .select('kma_code, count(*)')
      .not('kma_code', 'is', null)
      .order('count', { ascending: false });
      
    if (error) {
      console.error('Database error:', error);
      return;
    }
    
    console.log(`📈 Found ${kmaCounts?.length || 0} unique KMA codes in database`);
    console.log('Top KMA codes by city count:');
    (kmaCounts || []).slice(0, 20).forEach(kma => {
      console.log(`  ${kma.kma_code}: ${kma.count} cities`);
    });
    
  } catch (error) {
    console.error('Error analyzing KMA distribution:', error);
  }
}

async function testSpecificRoute() {
  console.log('\n🧪 Testing specific route: Atlanta, GA -> Nashville, TN');
  
  try {
    const result = await generateIntelligentCrawlPairs({
      origin: { city: 'Atlanta', state: 'GA' },
      destination: { city: 'Nashville', state: 'TN' },
      equipment: 'FD',
      preferFillTo10: true,
      usedCities: new Set()
    });
    
    console.log('\n📋 Generation Results:');
    console.log(`  Base Origin: ${result.baseOrigin?.city}, ${result.baseOrigin?.state}`);
    console.log(`  Base Destination: ${result.baseDest?.city}, ${result.baseDest?.state}`);
    console.log(`  Pairs Generated: ${result.pairs?.length || 0}/5 expected`);
    console.log(`  Insufficient Flag: ${result.insufficient || false}`);
    console.log(`  Message: ${result.message || 'none'}`);
    
    if (result.pairs && result.pairs.length > 0) {
      console.log('\n🎯 Generated Pairs:');
      result.pairs.forEach((pair, i) => {
        console.log(`  ${i+1}: ${pair.pickup.city}, ${pair.pickup.state} -> ${pair.delivery.city}, ${pair.delivery.state}`);
        if (pair.geographic) {
          console.log(`     Pickup KMA: ${pair.geographic.pickup_kma}, Delivery KMA: ${pair.geographic.delivery_kma}`);
          console.log(`     Distances: ${pair.geographic.pickup_distance}mi / ${pair.geographic.delivery_distance}mi`);
        }
        console.log(`     Score: ${pair.score || 'unknown'}`);
      });
    }
    
    // Check for KMA diversity
    if (result.pairs && result.pairs.length > 0) {
      const pickupKmas = new Set();
      const deliveryKmas = new Set();
      
      result.pairs.forEach(pair => {
        if (pair.geographic?.pickup_kma) pickupKmas.add(pair.geographic.pickup_kma);
        if (pair.geographic?.delivery_kma) deliveryKmas.add(pair.geographic.delivery_kma);
      });
      
      console.log(`\n🗺️ KMA Diversity Check:`);
      console.log(`  Unique Pickup KMAs: ${pickupKmas.size} (${Array.from(pickupKmas).join(', ')})`);
      console.log(`  Unique Delivery KMAs: ${deliveryKmas.size} (${Array.from(deliveryKmas).join(', ')})`);
      
      if (pickupKmas.size !== result.pairs.length || deliveryKmas.size !== result.pairs.length) {
        console.log('⚠️ KMA DIVERSITY ISSUE: Not all pairs have unique KMA codes!');
      } else {
        console.log('✅ KMA diversity looks good');
      }
    }
    
  } catch (error) {
    console.error('Error testing route:', error);
  }
}

async function testCityLookup() {
  console.log('\n🏙️ Testing city database lookups...');
  
  const testCities = [
    { city: 'Atlanta', state: 'GA' },
    { city: 'Nashville', state: 'TN' },
    { city: 'Augusta', state: 'GA' },
    { city: 'New Bedford', state: 'MA' }
  ];
  
  for (const testCity of testCities) {
    try {
      const { data: cities, error } = await adminSupabase
        .from('cities')
        .select('city, state_or_province, zip, latitude, longitude, kma_code, kma_name')
        .ilike('city', testCity.city)
        .ilike('state_or_province', testCity.state)
        .not('latitude', 'is', null)
        .not('kma_code', 'is', null)
        .limit(5);
        
      if (error) {
        console.error(`Error looking up ${testCity.city}, ${testCity.state}:`, error);
        continue;
      }
      
      console.log(`\n📍 ${testCity.city}, ${testCity.state}:`);
      if (cities && cities.length > 0) {
        cities.forEach(city => {
          console.log(`  Found: ${city.city}, ${city.state_or_province} (${city.zip}) - KMA: ${city.kma_code} (${city.kma_name})`);
        });
      } else {
        console.log(`  ⚠️ No cities found in database!`);
      }
      
    } catch (error) {
      console.error(`Error testing ${testCity.city}, ${testCity.state}:`, error);
    }
  }
}

async function testNearbyKmaCities() {
  console.log('\n📍 Testing nearby KMA cities for Atlanta, GA...');
  
  try {
    // First get Atlanta's coordinates
    const { data: atlantaCities, error: atlantaError } = await adminSupabase
      .from('cities')
      .select('city, state_or_province, latitude, longitude, kma_code')
      .ilike('city', 'Atlanta')
      .ilike('state_or_province', 'GA')
      .not('latitude', 'is', null)
      .limit(1);
      
    if (atlantaError || !atlantaCities?.[0]) {
      console.error('Could not find Atlanta in database:', atlantaError);
      return;
    }
    
    const atlanta = atlantaCities[0];
    console.log(`Found Atlanta: ${atlanta.latitude}, ${atlanta.longitude} (KMA: ${atlanta.kma_code})`);
    
    // Find cities within 75 miles with different KMA codes
    const latRange = 75 / 69; // Approximate degrees per mile
    const lonRange = 75 / (69 * Math.cos(atlanta.latitude * Math.PI / 180));
    
    const { data: nearbyCities, error: nearbyError } = await adminSupabase
      .from('cities')
      .select('city, state_or_province, latitude, longitude, kma_code, kma_name')
      .gte('latitude', atlanta.latitude - latRange)
      .lte('latitude', atlanta.latitude + latRange)
      .gte('longitude', atlanta.longitude - lonRange)
      .lte('longitude', atlanta.longitude + lonRange)
      .not('latitude', 'is', null)
      .not('longitude', 'is', null)
      .not('kma_code', 'is', null)
      .neq('kma_code', atlanta.kma_code)
      .limit(100);
      
    if (nearbyError) {
      console.error('Error finding nearby cities:', nearbyError);
      return;
    }
    
    if (!nearbyCities || nearbyCities.length === 0) {
      console.log('⚠️ No nearby cities found with different KMA codes!');
      return;
    }
    
    // Calculate distances and group by KMA
    const kmaGroups = {};
    nearbyCities.forEach(city => {
      const distance = calculateDistance(
        atlanta.latitude, atlanta.longitude,
        city.latitude, city.longitude
      );
      
      if (distance <= 75) {
        if (!kmaGroups[city.kma_code]) {
          kmaGroups[city.kma_code] = [];
        }
        kmaGroups[city.kma_code].push({
          ...city,
          distance: Math.round(distance)
        });
      }
    });
    
    console.log(`\n🎯 Found ${Object.keys(kmaGroups).length} different KMAs within 75 miles:`);
    Object.entries(kmaGroups)
      .sort((a, b) => a[1][0].distance - b[1][0].distance)
      .slice(0, 10) // Show top 10 KMAs
      .forEach(([kmaCode, cities]) => {
        console.log(`  KMA ${kmaCode}: ${cities.length} cities`);
        cities.slice(0, 3).forEach(city => { // Show top 3 cities per KMA
          console.log(`    ${city.city}, ${city.state_or_province} - ${city.distance}mi`);
        });
      });
      
  } catch (error) {
    console.error('Error testing nearby KMA cities:', error);
  }
}

function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 3959; // Earth's radius in miles
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

async function main() {
  console.log('🚀 Starting comprehensive lane generation analysis...\n');
  
  await analyzeKmaDistribution();
  await testCityLookup();
  await testNearbyKmaCities();
  await testSpecificRoute();
  
  console.log('\n✅ Analysis complete!');
  console.log('\n🔧 NEXT STEPS:');
  console.log('1. Check if KMA diversity logic is working correctly');
  console.log('2. Verify that 75-mile radius contains sufficient cities with different KMAs');
  console.log('3. Ensure the pair generation logic creates exactly 5 unique KMA pairs');
  console.log('4. Review any insufficient pair warnings and their root causes');
  
  process.exit(0);
}

main().catch(error => {
  console.error('Analysis failed:', error);
  process.exit(1);
});
