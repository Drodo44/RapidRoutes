/**
 * Enhanced city enrichment system using HERE.com and KMA data
 */

import { adminSupabase } from '../utils/supabaseClient.js';
import { verifyCityWithHERE, generateAlternativeCitiesWithHERE } from './hereVerificationService.js';
import { calculateDistance } from './distanceCalculator.js';

const KMA_CACHE = new Map();
let kmaLoadPromise = null;

/**
 * Load all KMA data into memory for faster lookups
 */
async function ensureKMADataLoaded() {
  if (KMA_CACHE.size > 0) return;
  
  if (kmaLoadPromise) {
    await kmaLoadPromise;
    return;
  }
  
  kmaLoadPromise = (async () => {
    console.log('📊 Loading KMA data...');
    const { data: kmas, error } = await adminSupabase
      .from('kma_data')
      .select('*');
      
    if (error) {
      console.error('❌ Failed to load KMA data:', error);
      return;
    }
    
    for (const kma of kmas) {
      KMA_CACHE.set(kma.code, kma);
    }
    
    console.log(`✅ Loaded ${KMA_CACHE.size} KMAs`);
  })();
  
  await kmaLoadPromise;
}

/**
 * Find the best KMA for a city using HERE.com data and our KMA database
 */
async function findBestKMA(city, state, lat, lon) {
  await ensureKMADataLoaded();
  
  // Get nearby cities we know the KMA for
  const { data: nearbyKnown } = await adminSupabase
    .from('cities')
    .select('city, state_or_province, kma_code, latitude, longitude')
    .not('kma_code', 'is', null)
    .gte('latitude', lat - 1)
    .lte('latitude', lat + 1)
    .gte('longitude', lon - 1)
    .lte('longitude', lon + 1);
    
  if (!nearbyKnown?.length) {
    console.warn(`⚠️ No nearby cities with KMA found for ${city}, ${state}`);
    return null;
  }
  
  // Score each nearby city's KMA
  const kmaScores = new Map();
  
  for (const known of nearbyKnown) {
    const distance = calculateDistance(lat, lon, known.latitude, known.longitude);
    const score = 1 / (1 + distance); // Higher score for closer cities
    
    const currentScore = kmaScores.get(known.kma_code) || 0;
    kmaScores.set(known.kma_code, currentScore + score);
  }
  
  // Find KMA with highest score
  let bestKMA = null;
  let bestScore = -1;
  
  for (const [kmaCode, score] of kmaScores) {
    if (score > bestScore) {
      bestScore = score;
      bestKMA = KMA_CACHE.get(kmaCode);
    }
  }
  
  return bestKMA;
}

/**
 * Enrich our database with a new city discovery
 */
export async function enrichCityData(city, state, source = 'here_api') {
  console.log(`🔍 Enriching city data: ${city}, ${state}`);
  
  // Step 1: Verify with HERE.com
  const verification = await verifyCityWithHERE(city, state, null, 'enrichment', source);
  if (!verification.verified) {
    console.warn(`⚠️ City failed HERE.com verification: ${city}, ${state}`);
    return null;
  }
  
  const hereData = verification.data;
  if (!hereData?.address || !hereData?.position) {
    console.warn('⚠️ Incomplete HERE.com data');
    return null;
  }
  
  // Step 2: Find best KMA
  const kma = await findBestKMA(
    city, 
    state,
    hereData.position.lat,
    hereData.position.lng
  );
  
  if (!kma) {
    console.warn(`⚠️ Could not determine KMA for ${city}, ${state}`);
    return null;
  }
  
  // Step 3: Enrich database
  const cityData = {
    city: city,
    state_or_province: state,
    latitude: hereData.position.lat,
    longitude: hereData.position.lng,
    kma_code: kma.code,
    kma_name: kma.name,
    here_verified: true,
    here_data: hereData,
    discovered_by: source,
    discovery_date: new Date().toISOString(),
    last_verification: new Date().toISOString()
  };
  
  try {
    const { error } = await adminSupabase
      .from('cities')
      .upsert(cityData, {
        onConflict: 'city,state_or_province',
        returning: true
      });
      
    if (error) throw error;
    
    console.log(`✅ Successfully enriched ${city}, ${state}`);
    console.log(`   KMA: ${kma.code} - ${kma.name}`);
    return cityData;
    
  } catch (error) {
    console.error('❌ Failed to enrich city:', error);
    return null;
  }
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
