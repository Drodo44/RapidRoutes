#!/usr/bin/env node

// Extended KMA diversity analysis - test different radii and solutions
import dotenv from 'dotenv';
dotenv.config();

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL, 
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

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

async function testMultipleRadii() {
  console.log('🔍 Testing KMA diversity at different radii for Atlanta, GA');
  
  // Get Atlanta coordinates
  const { data: atlantaCities } = await supabase
    .from('cities')
    .select('city, state_or_province, latitude, longitude, kma_code')
    .ilike('city', 'Atlanta')
    .ilike('state_or_province', 'GA')
    .not('latitude', 'is', null)
    .limit(1);
    
  if (!atlantaCities?.[0]) {
    console.error('Could not find Atlanta');
    return;
  }
  
  const atlanta = atlantaCities[0];
  const radii = [75, 90, 100, 125, 150];
  
  for (const radius of radii) {
    console.log(`\n📏 Testing ${radius}-mile radius:`);
    
    const latRange = radius / 69;
    const lonRange = radius / (69 * Math.cos(atlanta.latitude * Math.PI / 180));
    
    const { data: nearbyCities } = await supabase
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
      .limit(200);
      
    const kmaGroups = {};
    let validCities = 0;
    
    (nearbyCities || []).forEach(city => {
      const distance = calculateDistance(
        atlanta.latitude, atlanta.longitude,
        city.latitude, city.longitude
      );
      
      if (distance <= radius) {
        validCities++;
        if (!kmaGroups[city.kma_code]) {
          kmaGroups[city.kma_code] = [];
        }
        kmaGroups[city.kma_code].push({
          ...city,
          distance: Math.round(distance)
        });
      }
    });
    
    const uniqueKmas = Object.keys(kmaGroups);
    console.log(`  📊 ${validCities} cities in ${uniqueKmas.length} unique KMAs`);
    
    if (uniqueKmas.length >= 5) {
      console.log(`  ✅ SUFFICIENT: ${uniqueKmas.length} KMAs available`);
      console.log(`  🎯 Top 5 KMAs for pickup diversity:`);
      uniqueKmas.slice(0, 5).forEach(kma => {
        const bestCity = kmaGroups[kma].sort((a,b) => a.distance - b.distance)[0];
        console.log(`    ${kma}: ${bestCity.city}, ${bestCity.state_or_province} (${bestCity.distance}mi)`);
      });
      break; // Found sufficient diversity
    } else {
      console.log(`  ⚠️ INSUFFICIENT: Only ${uniqueKmas.length} KMAs (need 5)`);
      uniqueKmas.forEach(kma => {
        const bestCity = kmaGroups[kma].sort((a,b) => a.distance - b.distance)[0];
        console.log(`    ${kma}: ${bestCity.city}, ${bestCity.state_or_province} (${bestCity.distance}mi)`);
      });
    }
  }
}

async function testBrokerRecommendedSolution() {
  console.log('\n🚀 BROKER-INTELLIGENT SOLUTION ANALYSIS');
  console.log('Testing freight-intelligent city selection that prioritizes market logic over strict distance');
  
  const { data: atlantaCities } = await supabase
    .from('cities')
    .select('city, state_or_province, latitude, longitude, kma_code')
    .ilike('city', 'Atlanta')
    .ilike('state_or_province', 'GA')
    .not('latitude', 'is', null)
    .limit(1);
    
  if (!atlantaCities?.[0]) return;
  const atlanta = atlantaCities[0];
  
  // SOLUTION 1: Use tiered approach - fill with best available freight markets
  console.log('\n💡 SOLUTION 1: Tiered KMA Selection');
  console.log('Step 1: Get best 75-mile KMAs');
  console.log('Step 2: Fill remaining slots with 100-mile freight-intelligent cities');
  
  // Step 1: Get 75-mile KMAs (we know there are 4)
  const radius75 = 75;
  const latRange75 = radius75 / 69;
  const lonRange75 = radius75 / (69 * Math.cos(atlanta.latitude * Math.PI / 180));
  
  const { data: cities75 } = await supabase
    .from('cities')
    .select('city, state_or_province, latitude, longitude, kma_code, kma_name')
    .gte('latitude', atlanta.latitude - latRange75)
    .lte('latitude', atlanta.latitude + latRange75)
    .gte('longitude', atlanta.longitude - lonRange75)
    .lte('longitude', atlanta.longitude + lonRange75)
    .not('latitude', 'is', null)
    .not('longitude', 'is', null)
    .not('kma_code', 'is', null)
    .neq('kma_code', atlanta.kma_code)
    .limit(100);
    
  const kmas75 = {};
  (cities75 || []).forEach(city => {
    const distance = calculateDistance(atlanta.latitude, atlanta.longitude, city.latitude, city.longitude);
    if (distance <= 75) {
      if (!kmas75[city.kma_code]) {
        kmas75[city.kma_code] = [];
      }
      kmas75[city.kma_code].push({...city, distance: Math.round(distance)});
    }
  });
  
  console.log(`Found ${Object.keys(kmas75).length} KMAs within 75 miles:`);
  Object.entries(kmas75).forEach(([kma, cities]) => {
    const best = cities.sort((a,b) => a.distance - b.distance)[0];
    console.log(`  ${kma}: ${best.city}, ${best.state_or_province} (${best.distance}mi)`);
  });
  
  // Step 2: Fill remaining slots with extended radius
  const neededKmas = 5 - Object.keys(kmas75).length;
  console.log(`\nNeed ${neededKmas} additional KMAs from extended radius (100 miles):`);
  
  if (neededKmas > 0) {
    const radius100 = 100;
    const latRange100 = radius100 / 69;
    const lonRange100 = radius100 / (69 * Math.cos(atlanta.latitude * Math.PI / 180));
    
    const { data: cities100 } = await supabase
      .from('cities')
      .select('city, state_or_province, latitude, longitude, kma_code, kma_name')
      .gte('latitude', atlanta.latitude - latRange100)
      .lte('latitude', atlanta.latitude + latRange100)
      .gte('longitude', atlanta.longitude - lonRange100)
      .lte('longitude', atlanta.longitude + lonRange100)
      .not('latitude', 'is', null)
      .not('longitude', 'is', null)
      .not('kma_code', 'is', null)
      .neq('kma_code', atlanta.kma_code)
      .limit(200);
      
    const kmas100 = {};
    (cities100 || []).forEach(city => {
      const distance = calculateDistance(atlanta.latitude, atlanta.longitude, city.latitude, city.longitude);
      if (distance <= 100 && distance > 75 && !kmas75[city.kma_code]) {
        if (!kmas100[city.kma_code]) {
          kmas100[city.kma_code] = [];
        }
        kmas100[city.kma_code].push({...city, distance: Math.round(distance)});
      }
    });
    
    const additionalKmas = Object.keys(kmas100).slice(0, neededKmas);
    console.log(`Found ${additionalKmas.length} additional KMAs at 76-100 miles:`);
    additionalKmas.forEach(kma => {
      const best = kmas100[kma].sort((a,b) => a.distance - b.distance)[0];
      console.log(`  ${kma}: ${best.city}, ${best.state_or_province} (${best.distance}mi) [EXTENDED]`);
    });
    
    // FINAL RECOMMENDATION
    console.log('\n🎯 RECOMMENDED SOLUTION:');
    const allSelectedKmas = {...kmas75};
    additionalKmas.forEach(kma => {
      allSelectedKmas[kma] = kmas100[kma];
    });
    
    if (Object.keys(allSelectedKmas).length >= 5) {
      console.log('✅ CAN GENERATE 5 UNIQUE PICKUP CITIES:');
      Object.entries(allSelectedKmas).slice(0, 5).forEach(([kma, cities], i) => {
        const best = cities.sort((a,b) => a.distance - b.distance)[0];
        const range = best.distance <= 75 ? '75mi' : '100mi';
        console.log(`  ${i+1}. ${best.city}, ${best.state_or_province} (KMA: ${kma}) - ${best.distance}mi [${range}]`);
      });
      
      console.log('\n🔧 IMPLEMENTATION FIX NEEDED:');
      console.log('The geographic crawl should use this tiered approach:');
      console.log('1. Find all unique KMAs within 75 miles');
      console.log('2. If < 5 KMAs, extend to 90-100 miles for additional unique KMAs only');
      console.log('3. Select the closest city from each unique KMA');
      console.log('4. Never duplicate KMAs, never use same-city variations');
    } else {
      console.log('⚠️ Still insufficient KMAs even at extended radius');
    }
  }
}

async function main() {
  console.log('🔍 EXTENDED KMA DIVERSITY ANALYSIS');
  console.log('Analyzing optimal radius and solutions for RapidRoutes');
  
  await testMultipleRadii();
  await testBrokerRecommendedSolution();
  
  console.log('\n✅ ANALYSIS COMPLETE');
  console.log('\n📋 SUMMARY:');
  console.log('- Atlanta has insufficient KMA diversity within strict 75-mile radius');
  console.log('- Solution: Implement tiered KMA selection (75mi + extended for missing slots)');
  console.log('- Always prioritize KMA uniqueness over strict distance adherence');
  console.log('- This matches real freight broker practice: market diversity > pure distance');
  
  process.exit(0);
}

main().catch(console.error);
