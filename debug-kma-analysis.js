#!/usr/bin/env node

// Debug lane generation - analyze the KMA selection issue
import dotenv from 'dotenv';
dotenv.config();

import { createClient } from '@supabase/supabase-js';

// Create Supabase client directly
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('🔧 Creating Supabase client...');
console.log('URL:', supabaseUrl);
console.log('Service key loaded:', !!supabaseKey);

const supabase = createClient(supabaseUrl, supabaseKey);

console.log('🔍 Analyzing RapidRoutes Lane Generation Issue');

async function analyzeKmaDistribution() {
  console.log('\n📊 KMA Distribution Analysis...');
  
  try {
    // Check total cities
    const { count: totalCities, error: countError } = await supabase
      .from('cities')
      .select('*', { count: 'exact', head: true });
      
    if (countError) {
      console.error('Error counting cities:', countError);
      return;
    }
    
    console.log(`📈 Total cities in database: ${totalCities}`);
    
    // Check cities with KMA codes
    const { count: kmaCount, error: kmaCountError } = await supabase
      .from('cities')
      .select('*', { count: 'exact', head: true })
      .not('kma_code', 'is', null);
      
    if (kmaCountError) {
      console.error('Error counting KMA cities:', kmaCountError);
      return;
    }
    
    console.log(`📈 Cities with KMA codes: ${kmaCount}`);
    
    // Get sample KMA codes
    const { data: sampleKmas, error: sampleError } = await supabase
      .from('cities')
      .select('kma_code, city, state_or_province')
      .not('kma_code', 'is', null)
      .limit(10);
      
    if (sampleError) {
      console.error('Error getting sample KMAs:', sampleError);
      return;
    }
    
    console.log('Sample cities with KMA codes:');
    (sampleKmas || []).forEach(city => {
      console.log(`  ${city.city}, ${city.state_or_province} - KMA: ${city.kma_code}`);
    });
    
  } catch (error) {
    console.error('Error analyzing KMA distribution:', error);
  }
}

async function testSpecificCities() {
  console.log('\n🏙️ Testing specific city lookups...');
  
  const testCities = [
    { city: 'Atlanta', state: 'GA' },
    { city: 'Nashville', state: 'TN' },
    { city: 'Augusta', state: 'GA' },
    { city: 'New Bedford', state: 'MA' }
  ];
  
  for (const testCity of testCities) {
    try {
      const { data: cities, error } = await supabase
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
          console.log(`    Coords: ${city.latitude}, ${city.longitude}`);
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
    const { data: atlantaCities, error: atlantaError } = await supabase
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
    
    console.log(`Searching within lat range: ${atlanta.latitude - latRange} to ${atlanta.latitude + latRange}`);
    console.log(`Searching within lon range: ${atlanta.longitude - lonRange} to ${atlanta.longitude + lonRange}`);
    
    const { data: nearbyCities, error: nearbyError } = await supabase
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
      .limit(50);
      
    if (nearbyError) {
      console.error('Error finding nearby cities:', nearbyError);
      return;
    }
    
    console.log(`Found ${nearbyCities?.length || 0} potential cities in bounding box`);
    
    if (!nearbyCities || nearbyCities.length === 0) {
      console.log('⚠️ No nearby cities found with different KMA codes!');
      
      // Try with same KMA to see if there are cities at all
      const { data: samekma, error: samekmaError } = await supabase
        .from('cities')
        .select('city, state_or_province, latitude, longitude, kma_code, kma_name')
        .gte('latitude', atlanta.latitude - latRange)
        .lte('latitude', atlanta.latitude + latRange)
        .gte('longitude', atlanta.longitude - lonRange)
        .lte('longitude', atlanta.longitude + lonRange)
        .not('latitude', 'is', null)
        .not('longitude', 'is', null)
        .not('kma_code', 'is', null)
        .limit(20);
        
      console.log(`Found ${samekma?.length || 0} cities total in area (including same KMA)`);
      if (samekma && samekma.length > 0) {
        console.log('Sample cities in area:');
        samekma.slice(0, 10).forEach(city => {
          const distance = calculateDistance(atlanta.latitude, atlanta.longitude, city.latitude, city.longitude);
          console.log(`  ${city.city}, ${city.state_or_province} - ${Math.round(distance)}mi (KMA: ${city.kma_code})`);
        });
      }
      return;
    }
    
    // Calculate distances and group by KMA
    const kmaGroups = {};
    const validCities = [];
    
    nearbyCities.forEach(city => {
      const distance = calculateDistance(
        atlanta.latitude, atlanta.longitude,
        city.latitude, city.longitude
      );
      
      if (distance <= 75) {
        validCities.push({...city, distance: Math.round(distance)});
        if (!kmaGroups[city.kma_code]) {
          kmaGroups[city.kma_code] = [];
        }
        kmaGroups[city.kma_code].push({
          ...city,
          distance: Math.round(distance)
        });
      }
    });
    
    console.log(`\n🎯 Found ${validCities.length} cities within exactly 75 miles:`);
    console.log(`🎯 Found ${Object.keys(kmaGroups).length} different KMAs within 75 miles:`);
    
    Object.entries(kmaGroups)
      .sort((a, b) => a[1][0].distance - b[1][0].distance)
      .forEach(([kmaCode, cities]) => {
        console.log(`  KMA ${kmaCode}: ${cities.length} cities`);
        cities.slice(0, 2).forEach(city => { // Show top 2 cities per KMA
          console.log(`    ${city.city}, ${city.state_or_province} - ${city.distance}mi`);
        });
      });
      
    // Check if we have enough unique KMAs for 5 pickup cities
    const uniqueKmas = Object.keys(kmaGroups);
    console.log(`\n✅ Analysis: We have ${uniqueKmas.length} unique KMAs available for pickup cities`);
    if (uniqueKmas.length >= 5) {
      console.log('✅ SUFFICIENT KMA DIVERSITY: Should be able to generate 5 unique pickup cities');
    } else {
      console.log('⚠️ INSUFFICIENT KMA DIVERSITY: May not be able to generate 5 unique pickup cities');
      console.log(`   Need: 5 KMAs, Available: ${uniqueKmas.length} KMAs`);
    }
      
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
  await testSpecificCities();
  await testNearbyKmaCities();
  
  console.log('\n✅ Analysis complete!');
  console.log('\n🔧 KEY FINDINGS:');
  console.log('- Check KMA distribution and city database completeness');
  console.log('- Verify that sufficient unique KMAs exist within 75 miles of test origins');
  console.log('- If KMA diversity is sufficient, the issue may be in the pair generation logic');
  console.log('- If KMA diversity is insufficient, the database needs more KMA-coded cities');
  
  process.exit(0);
}

main().catch(error => {
  console.error('Analysis failed:', error);
  process.exit(1);
});
