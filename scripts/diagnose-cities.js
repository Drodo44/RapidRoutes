// scripts/diagnose-cities.js
// Diagnostic tool for validating cities table and intelligence system

import 'cross-fetch/dist/node-polyfill.js';
import { adminSupabase } from '../utils/supabaseClient.js';

async function diagnoseCities() {
  console.log('🔍 Starting cities table diagnostic...\n');

  try {
    // 1. Check cities table existence
    console.log('Checking cities table...');
    console.log('Database URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);
    
    const citiesQuery = adminSupabase
      .from('cities')
      .select('*', { count: 'exact', head: true });
      
    console.log('Executing query...');
    const { data: tableExists, error: tableError } = await citiesQuery;
    
    if (tableError) {
      console.error('Error details:', tableError);
      throw new Error(`Cities table error: ${tableError.message}`);
    }
    
    console.log('Query response:', tableExists);

    // 2. Count total cities
    const { count: totalCities } = await adminSupabase
      .from('cities')
      .select('*', { count: 'exact', head: true });

    console.log(`Total cities: ${totalCities}`);

    // 3. Count cities with KMA codes
    const { count: kmaCount } = await adminSupabase
      .from('cities')
      .select('*', { count: 'exact', head: true })
      .not('kma_code', 'is', null);

    console.log(`Cities with KMA codes: ${kmaCount}`);

    // 4. Count cities with coordinates
    const { count: coordCount } = await adminSupabase
      .from('cities')
      .select('*', { count: 'exact', head: true })
      .not('latitude', 'is', null)
      .not('longitude', 'is', null);

    console.log(`Cities with coordinates: ${coordCount}`);

    // 5. Count complete cities (KMA + coords)
    const { count: completeCount } = await adminSupabase
      .from('cities')
      .select('*', { count: 'exact', head: true })
      .not('kma_code', 'is', null)
      .not('latitude', 'is', null)
      .not('longitude', 'is', null);

    console.log(`Complete cities (KMA + coords): ${completeCount}`);

    // 6. Check for critical cities
    const criticalCities = [
      ['Riegelwood', 'NC'],
      ['Russellville', 'AR'],
      ['Massillon', 'OH'],
      ['Frisco', 'TX'],
      ['Warren', 'AR']
    ];

    console.log('\nChecking critical cities:');
    for (const [city, state] of criticalCities) {
      const { data: found } = await adminSupabase
        .from('cities')
        .select('*')
        .eq('city', city)
        .eq('state_or_province', state)
        .maybeSingle();

      if (found) {
        console.log(`✅ ${city}, ${state}: Found - KMA: ${found.kma_code || 'NO KMA'}, Coords: ${found.latitude ? 'YES' : 'NO'}`);
      } else {
        console.log(`❌ ${city}, ${state}: NOT FOUND`);
      }
    }

    // 7. Check find_cities_within_radius function
    console.log('\nTesting radius function...');
    const testLat = 33.7490; // Atlanta
    const testLng = -84.3880;
    const { data: radiusTest, error: radiusError } = await adminSupabase
      .rpc('find_cities_within_radius', {
        lat_param: testLat,
        lng_param: testLng,
        radius_meters: 100 * 1609.34 // 100 miles
      });

    if (radiusError) {
      console.log('❌ Radius function error:', radiusError.message);
    } else {
      console.log(`✅ Radius function works: Found ${radiusTest.length} cities within 100mi of Atlanta`);
    }

    console.log('\n🔍 Diagnostic complete!');

  } catch (error) {
    console.error('❌ Diagnostic failed:', error.message);
    process.exit(1);
  }
}

// Run diagnostic
diagnoseCities().catch(console.error);