#!/usr/bin/env node

/**
 * KMA AVAILABILITY DIAGNOSTIC: Why can't we find 5 unique KMA cities?
 * 
 * This will test the actual database queries to see what's limiting us.
 */

import { adminSupabase as supabase } from './utils/supabaseClient.js';

async function diagnoseKmaAvailability() {
  console.log('🔍 KMA AVAILABILITY DIAGNOSTIC');
  console.log('With 45,518+ cities, finding 5 unique KMAs should be trivial...');
  console.log('');

  try {
    // Test with your common lane: Belvidere, IL -> Schofield, WI
    const testOrigin = { city: 'Belvidere', state: 'IL' };
    const testDest = { city: 'Schofield', state: 'WI' };

    console.log(`📍 TEST CASE: ${testOrigin.city}, ${testOrigin.state} → ${testDest.city}, ${testDest.state}`);
    console.log('');

    // Get base cities
    const { data: originData } = await supabase
      .from('cities')
      .select('city, state_or_province, zip, latitude, longitude, kma_code, kma_name')
      .ilike('city', testOrigin.city)
      .ilike('state_or_province', testOrigin.state)
      .not('latitude', 'is', null)
      .not('kma_code', 'is', null)
      .limit(1);

    const { data: destData } = await supabase
      .from('cities')
      .select('city, state_or_province, zip, latitude, longitude, kma_code, kma_name')
      .ilike('city', testDest.city)
      .ilike('state_or_province', testDest.state)
      .not('latitude', 'is', null)
      .not('kma_code', 'is', null)
      .limit(1);

    if (!originData?.[0] || !destData?.[0]) {
      console.error('❌ Could not find base cities');
      return;
    }

    const baseOrigin = originData[0];
    const baseDest = destData[0];

    console.log(`✅ Base Origin: ${baseOrigin.city}, ${baseOrigin.state_or_province} (${baseOrigin.kma_code})`);
    console.log(`✅ Base Dest: ${baseDest.city}, ${baseDest.state_or_province} (${baseDest.kma_code})`);
    console.log('');

    // Test actual 75-mile radius query for pickups
    console.log('🔍 PICKUP ALTERNATIVES (75-mile radius):');
    const pickupQuery = `
      SELECT city, state_or_province, zip, latitude, longitude, kma_code, kma_name,
             ST_Distance(
               ST_Point(${baseOrigin.longitude}, ${baseOrigin.latitude})::geography,
               ST_Point(longitude, latitude)::geography
             ) / 1609.34 as distance_miles
      FROM cities 
      WHERE latitude IS NOT NULL 
        AND longitude IS NOT NULL 
        AND kma_code IS NOT NULL
        AND kma_code != '${baseOrigin.kma_code}'
        AND ST_Distance(
             ST_Point(${baseOrigin.longitude}, ${baseOrigin.latitude})::geography,
             ST_Point(longitude, latitude)::geography
           ) / 1609.34 <= 75
      ORDER BY distance_miles
      LIMIT 20;
    `;

    const { data: pickupAlternatives, error: pickupError } = await supabase.rpc('exec_sql', { query: pickupQuery });
    
    if (pickupError) {
      console.error('❌ Pickup query error:', pickupError);
    } else {
      console.log(`📊 Found ${pickupAlternatives.length} pickup alternatives within 75 miles`);
      
      // Count unique KMAs
      const uniquePickupKmas = new Set(pickupAlternatives.map(c => c.kma_code));
      console.log(`📊 Unique KMAs available: ${uniquePickupKmas.size}`);
      console.log(`📊 KMAs: ${Array.from(uniquePickupKmas).join(', ')}`);
      
      console.log('📋 Sample cities:');
      pickupAlternatives.slice(0, 5).forEach(city => {
        console.log(`  • ${city.city}, ${city.state_or_province} (${city.kma_code}) - ${city.distance_miles.toFixed(1)} miles`);
      });
    }
    console.log('');

    // Test actual 75-mile radius query for deliveries
    console.log('🔍 DELIVERY ALTERNATIVES (75-mile radius):');
    const deliveryQuery = `
      SELECT city, state_or_province, zip, latitude, longitude, kma_code, kma_name,
             ST_Distance(
               ST_Point(${baseDest.longitude}, ${baseDest.latitude})::geography,
               ST_Point(longitude, latitude)::geography
             ) / 1609.34 as distance_miles
      FROM cities 
      WHERE latitude IS NOT NULL 
        AND longitude IS NOT NULL 
        AND kma_code IS NOT NULL
        AND kma_code != '${baseDest.kma_code}'
        AND ST_Distance(
             ST_Point(${baseDest.longitude}, ${baseDest.latitude})::geography,
             ST_Point(longitude, latitude)::geography
           ) / 1609.34 <= 75
      ORDER BY distance_miles
      LIMIT 20;
    `;

    const { data: deliveryAlternatives, error: deliveryError } = await supabase.rpc('exec_sql', { query: deliveryQuery });
    
    if (deliveryError) {
      console.error('❌ Delivery query error:', deliveryError);
    } else {
      console.log(`📊 Found ${deliveryAlternatives.length} delivery alternatives within 75 miles`);
      
      // Count unique KMAs
      const uniqueDeliveryKmas = new Set(deliveryAlternatives.map(c => c.kma_code));
      console.log(`📊 Unique KMAs available: ${uniqueDeliveryKmas.size}`);
      console.log(`📊 KMAs: ${Array.from(uniqueDeliveryKmas).join(', ')}`);
      
      console.log('📋 Sample cities:');
      deliveryAlternatives.slice(0, 5).forEach(city => {
        console.log(`  • ${city.city}, ${city.state_or_province} (${city.kma_code}) - ${city.distance_miles.toFixed(1)} miles`);
      });
    }
    console.log('');

    // Analysis
    const pickupKmas = pickupAlternatives ? new Set(pickupAlternatives.map(c => c.kma_code)).size : 0;
    const deliveryKmas = deliveryAlternatives ? new Set(deliveryAlternatives.map(c => c.kma_code)).size : 0;

    console.log('🎯 ANALYSIS:');
    console.log(`  • Need: 5 unique pickup KMAs + 5 unique delivery KMAs`);
    console.log(`  • Available pickup KMAs: ${pickupKmas}`);
    console.log(`  • Available delivery KMAs: ${deliveryKmas}`);
    console.log(`  • Can generate 5 pairs: ${pickupKmas >= 5 && deliveryKmas >= 5 ? '✅ YES' : '❌ NO'}`);
    console.log('');

    if (pickupKmas < 5 || deliveryKmas < 5) {
      console.log('🚨 ISSUE IDENTIFIED:');
      console.log(`  • This specific lane pair is in a KMA-sparse region`);
      console.log(`  • Geographic concentration limits unique market diversity`);
      console.log(`  • Intelligent fallbacks are needed for this route`);
    } else {
      console.log('✅ SUFFICIENT KMA DIVERSITY:');
      console.log(`  • This lane should easily generate 5 pairs`);
      console.log(`  • If system is struggling, check query logic or filtering`);
    }

  } catch (error) {
    console.error('❌ Diagnostic failed:', error);
  }
}

diagnoseKmaAvailability();
