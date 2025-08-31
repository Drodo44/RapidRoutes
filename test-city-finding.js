#!/usr/bin/env node

// Simple test to verify database city finding is working
console.log('🔍 TESTING DATABASE CITY FINDING');

import { adminSupabase } from './utils/supabaseClient.js';

async function testCityFinding() {
  try {
    // Test 1: Find cities near Atlanta within 75 miles
    console.log('🧪 Test 1: Finding cities near Atlanta, GA within 75 miles');
    
    const { data: atlanta } = await adminSupabase
      .from('cities')
      .select('*')
      .ilike('city', 'Atlanta')
      .ilike('state_or_province', 'GA')
      .limit(1);
    
    if (!atlanta || atlanta.length === 0) {
      console.log('❌ Atlanta not found in database');
      return;
    }
    
    const atlantaCity = atlanta[0];
    console.log('✅ Found Atlanta:', atlantaCity.city, atlantaCity.state_or_province, 'KMA:', atlantaCity.kma_code);
    
    // Find nearby cities using distance calculation
    const { data: nearbyCities } = await adminSupabase
      .from('cities')
      .select('*, (6371 * acos(cos(radians(' + atlantaCity.latitude + ')) * cos(radians(latitude)) * cos(radians(longitude) - radians(' + atlantaCity.longitude + ')) + sin(radians(' + atlantaCity.latitude + ')) * sin(radians(latitude)))) as distance')
      .neq('city', 'Atlanta')
      .gte('latitude', atlantaCity.latitude - 1) // Rough bounding box for performance
      .lte('latitude', atlantaCity.latitude + 1)
      .gte('longitude', atlantaCity.longitude - 1.5) 
      .lte('longitude', atlantaCity.longitude + 1.5)
      .order('distance')
      .limit(10);
    
    console.log('📊 Found', nearbyCities?.length || 0, 'nearby cities');
    
    if (nearbyCities && nearbyCities.length > 0) {
      console.log('🎯 Top 5 nearest cities:');
      nearbyCities.slice(0, 5).forEach((city, i) => {
        const dist = Math.round(city.distance * 0.621371); // Convert km to miles
        console.log(`  ${i+1}. ${city.city}, ${city.state_or_province} (${dist} miles, KMA: ${city.kma_code})`);
      });
      
      // Check if we found cities within 75 miles
      const within75Miles = nearbyCities.filter(city => (city.distance * 0.621371) <= 75);
      console.log(`✅ Cities within 75 miles: ${within75Miles.length}`);
      
      if (within75Miles.length >= 5) {
        console.log('🎯 SUCCESS: Found enough cities within 75 miles');
      } else {
        console.log('⚠️ Only found', within75Miles.length, 'cities within 75 miles - need 5+');
      }
      
    } else {
      console.log('❌ No nearby cities found - database query issue');
    }
    
    // Test 2: Check total city count
    const { count } = await adminSupabase
      .from('cities')
      .select('*', { count: 'exact', head: true });
    
    console.log('📊 Total cities in database:', count);
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testCityFinding();
