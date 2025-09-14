/**
 * Enhanced city enrichment system using HERE.com and KMA data
 */

import { adminSupabase } from '../utils/supabaseClient.js';
import { verifyCityWithHERE } from './hereVerificationService.js';
import { zipToKmaMapping } from './zipToKmaMapping.js';

/**
 * Enhanced ZIP → KMA mapping with fallback handling
 */
function getKmaForZip(zip) {
  if (!zip) {
    console.warn('⚠️ Missing ZIP code for KMA lookup');
    return null;
  }

  const kma = zipToKmaMapping[zip];
  if (!kma) {
    console.warn(`⚠️ No KMA found for ZIP: ${zip}`);
  }

  return kma;
}

// Direct POST to Supabase with service role key
async function insertCityIntoSupabase(cityData) {
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    console.error('❌ Supabase URL or Service Role Key is missing');
    return false;
  }

  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/cities`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': serviceRoleKey,
        'Authorization': `Bearer ${serviceRoleKey}`
      },
      body: JSON.stringify(cityData)
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('❌ Failed to insert city into Supabase:', error);
      return false;
    }

    console.log(`✅ City inserted into Supabase: ${cityData.city}, ${cityData.state_or_province} (ZIP: ${cityData.zip}, KMA: ${cityData.kma_code || 'N/A'})`);
    return true;
  } catch (error) {
    console.error('❌ Supabase direct POST error:', error.message);
    return false;
  }
}

// Enhanced logging for diagnostics
function logEnrichmentResult(cityData, inserted) {
  const status = inserted ? 'Inserted' : 'Skipped';
  console.log(`📋 Enrichment Result: ${status} | City: ${cityData.city}, State: ${cityData.state_or_province}, ZIP: ${cityData.zip}, KMA: ${cityData.kma_code || 'N/A'}`);
}

/**
 * Enrich city data with HERE.com and assign KMA
 */
export async function enrichCityData(city, state) {
  console.log(`🔍 Enriching city data: ${city}, ${state}`);

  // Step 1: Verify with HERE.com
  const verification = await verifyCityWithHERE(city, state);
  if (!verification.verified) {
    console.warn(`⚠️ City failed HERE.com verification: ${city}, ${state}`);
    return null;
  }

  const hereData = verification.data;
  if (!hereData?.address || !hereData?.position) {
    console.warn('⚠️ Incomplete HERE.com data');
    return null;
  }

  const zip = hereData.address.postalCode;
  const kma = getKmaForZip(zip);

  const cityData = {
    city,
    state_or_province: state,
    zip,
    kma_code: kma || null,
    latitude: hereData.position.lat,
    longitude: hereData.position.lng
  };

  const inserted = await insertCityIntoSupabase(cityData);
  if (!inserted) {
    console.warn(`⚠️ City skipped: ${city}, ${state} (ZIP: ${zip}, KMA: ${kma || 'N/A'})`);
  }

  return cityData;
}

/**
 * Batch enrich multiple cities
 */
export async function batchEnrichCities(cities, source = 'bulk_import') {
  console.log(`📦 Batch enriching ${cities.length} cities`);
  
  const results = {
    total: cities.length,
    successful: 0,
    failed: 0,
    enriched: []
  };
  
  const batchSize = 5; // Process in small batches
  for (let i = 0; i < cities.length; i += batchSize) {
    const batch = cities.slice(i, i + batchSize);
    
    console.log(`\n🔄 Processing batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(cities.length/batchSize)}`);
    
    const batchPromises = batch.map(city => 
      enrichCityData(city.city, city.state, source)
        .catch(error => {
          console.error(`❌ Failed to enrich ${city.city}, ${city.state}:`, error);
          return null;
        })
    );
    
    const batchResults = await Promise.all(batchPromises);
    
    results.successful += batchResults.filter(r => r !== null).length;
    results.failed += batchResults.filter(r => r === null).length;
    results.enriched.push(...batchResults.filter(r => r !== null));
    
    // Delay between batches
    if (i + batchSize < cities.length) {
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
  
  console.log('\n📊 Enrichment Results:');
  console.log(`   Total processed: ${results.total}`);
  console.log(`   Successful: ${results.successful}`);
  console.log(`   Failed: ${results.failed}`);
  
  return results;
}

/**
 * Verify and update existing cities
 */
export async function verifyExistingCities(daysOld = 30) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysOld);
  
  // Get cities that haven't been verified recently
  const { data: cities, error } = await adminSupabase
    .from('cities')
    .select('*')
    .or(`last_verification.is.null,last_verification.lt.${cutoffDate.toISOString()}`);
    
  if (error) {
    console.error('❌ Failed to fetch cities for verification:', error);
    return;
  }
  
  console.log(`🔍 Verifying ${cities.length} cities older than ${daysOld} days`);
  
  return batchEnrichCities(cities, 'verification');
}

/**
 * Get nearby cities from HERE.com and add to database
 */
export async function discoverNearbyCities(lat, lon, radiusMiles = 75) {
  const cities = await generateAlternativeCitiesWithHERE(lat, lon, radiusMiles);
  return batchEnrichCities(cities, 'discovery');
}
