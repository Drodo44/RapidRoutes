#!/usr/bin/env node
/**
 * HERE.COM CITY FIXER - AUTOMATED MISSING CITY RESOLUTION
 * 
 * This will automatically geocode and add missing cities using HERE.com API.
 */

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '.env.local') });

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const HERE_API_KEY = process.env.HERE_API_KEY;

if (!HERE_API_KEY) {
  console.error('❌ HERE_API_KEY not found in environment');
  process.exit(1);
}

async function geocodeCity(city, state) {
  try {
    const query = `${city}, ${state}, USA`;
    const url = `https://geocode.search.hereapi.com/v1/geocode?q=${encodeURIComponent(query)}&apiKey=${HERE_API_KEY}`;
    
    console.log(`🌍 Geocoding: ${city}, ${state}...`);
    
    const response = await fetch(url);
    const data = await response.json();
    
    if (!data.items || data.items.length === 0) {
      throw new Error(`No geocoding results found for ${city}, ${state}`);
    }
    
    const result = data.items[0];
    const { lat, lng } = result.position;
    const { countryCode, state: stateCode } = result.address;
    
    if (countryCode !== 'USA') {
      throw new Error(`Found non-US location for ${city}, ${state}: ${result.address.label}`);
    }
    
    return {
      city: result.address.city || city,
      state_or_province: stateCode || state,
      country: 'US',
      latitude: lat,
      longitude: lng,
      full_address: result.address.label,
      source: 'HERE.com API'
    };
    
  } catch (error) {
    console.error(`❌ Failed to geocode ${city}, ${state}:`, error.message);
    return null;
  }
}

async function addCityToDatabase(cityData) {
  try {
    console.log(`💾 Adding to database: ${cityData.city}, ${cityData.state_or_province}`);
    
    const { data, error } = await supabase
      .from('cities')
      .insert([{
        city: cityData.city,
        state_or_province: cityData.state_or_province,
        country: cityData.country,
        latitude: cityData.latitude,
        longitude: cityData.longitude,
        zip: null, // We don't have ZIP from HERE.com basic geocoding
        kma_code: null, // Will be determined later
        kma_name: null,
        source: cityData.source
      }])
      .select();
    
    if (error) {
      throw new Error(`Database insert failed: ${error.message}`);
    }
    
    console.log(`✅ Successfully added ${cityData.city}, ${cityData.state_or_province} to database`);
    return data[0];
    
  } catch (error) {
    console.error(`❌ Failed to add ${cityData.city}, ${cityData.state_or_province} to database:`, error.message);
    return null;
  }
}

async function fixMissingCities() {
  console.log('🔧 AUTOMATED MISSING CITY FIXER');
  console.log('================================');
  
  // The missing cities we identified
  const missingCities = [
    { city: 'Paradise', state: 'PA' },
    { city: 'McDavid', state: 'FL' }
  ];
  
  console.log(`\n🎯 Fixing ${missingCities.length} missing cities using HERE.com API...`);
  
  const results = [];
  
  for (const cityInfo of missingCities) {
    console.log(`\n--- Processing ${cityInfo.city}, ${cityInfo.state} ---`);
    
    // First, double-check it's really missing
    const { data: existingCity } = await supabase
      .from('cities')
      .select('*')
      .ilike('city', cityInfo.city)
      .ilike('state_or_province', cityInfo.state)
      .limit(1);
    
    if (existingCity && existingCity.length > 0) {
      console.log(`ℹ️ ${cityInfo.city}, ${cityInfo.state} already exists in database`);
      results.push({
        city: cityInfo.city,
        state: cityInfo.state,
        status: 'already_exists',
        data: existingCity[0]
      });
      continue;
    }
    
    // Geocode the city
    const geocodedCity = await geocodeCity(cityInfo.city, cityInfo.state);
    
    if (!geocodedCity) {
      results.push({
        city: cityInfo.city,
        state: cityInfo.state,
        status: 'geocoding_failed',
        error: 'Could not geocode city'
      });
      continue;
    }
    
    console.log(`✅ Geocoded: ${geocodedCity.full_address}`);
    console.log(`   Coordinates: ${geocodedCity.latitude}, ${geocodedCity.longitude}`);
    
    // Add to database
    const addedCity = await addCityToDatabase(geocodedCity);
    
    if (addedCity) {
      results.push({
        city: cityInfo.city,
        state: cityInfo.state,
        status: 'added',
        data: addedCity
      });
    } else {
      results.push({
        city: cityInfo.city,
        state: cityInfo.state,
        status: 'database_failed',
        error: 'Failed to add to database'
      });
    }
    
    // Small delay to be respectful to HERE.com API
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  console.log('\n📊 FIXING RESULTS SUMMARY:');
  console.log('===========================');
  
  results.forEach((result, i) => {
    console.log(`${i + 1}. ${result.city}, ${result.state}: ${result.status.toUpperCase()}`);
    if (result.status === 'added' && result.data) {
      console.log(`   Added with coordinates: ${result.data.latitude}, ${result.data.longitude}`);
    } else if (result.error) {
      console.log(`   Error: ${result.error}`);
    }
  });
  
  const successful = results.filter(r => r.status === 'added' || r.status === 'already_exists').length;
  console.log(`\n✅ Successfully resolved ${successful}/${missingCities.length} cities`);
  
  if (successful === missingCities.length) {
    console.log('\n🎉 ALL MISSING CITIES FIXED!');
    console.log('The 5 problem lanes should now be able to generate rows.');
    console.log('Expected additional rows: 5 lanes × 12 = 60 more rows');
    console.log('New expected total: 118 + 60 = 178 rows (if no other issues)');
  } else {
    console.log(`\n⚠️ ${missingCities.length - successful} cities still need manual resolution`);
  }
  
  return results;
}

// Run the fixer
fixMissingCities().then(() => {
  console.log('\n🔄 Missing city fixing complete.');
  console.log('Next: Re-run CSV generation to test if row count improves.');
});
