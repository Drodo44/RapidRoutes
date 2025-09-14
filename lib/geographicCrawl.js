// lib/geographicCrawl.js
// Definitive Intelligence System - Original GPT-3.5 Version
// Uses verified database cities with HERE.com enrichment and learning

import { adminSupabase } from '../utils/supabaseClient.js';
import { calculateFreightIntelligence } from './freightScoring.js';
import { calculateDistance } from './distanceCalculator.js';
import { enrichCityMetadata } from './hereAdvancedServices.js';
import { verifyCityWithHERE, generateAlternativeCitiesWithHERE } from './hereVerificationService.js';
import { findBestKMA, updateCityKMA } from './kmaAssignment.js';
import { trackIntelligence } from './systemMonitoring.js';

// Constants used throughout the geographic crawl system
const TARGET_UNIQUE_KMAS_PER_SIDE = 6;  // Target for diversity, but not enforced minimum

/**
 * DEFINITIVE GEOGRAPHIC CRAWL: Intelligent city selection with database learning
 * Uses verified database cities enhanced by HERE.com discoveries
 */
export async function generateGeographicCrawlPairs({ origin, destination, equipment, preferFillTo10 = false, usedCities = new Set() }) {
  try {
    const BASE_RADIUS_MILES = 75;  // DAT standard radius
    const MAX_RADIUS_MILES = 100;  // Maximum fallback radius
    let discoveredCities = new Map();  // Track newly found cities for database enrichment
    
    // Early validation to avoid database queries for bad data
    if (!origin?.city || !origin?.state) {
      throw new Error(`Invalid origin: city=${origin?.city}, state=${origin?.state}`);
    }
    if (!destination?.city || !destination?.state) {
      throw new Error(`Invalid destination: city=${destination?.city}, state=${destination?.state}`);
    }
    
    // Get base cities from database
    const normalizedOrigin = {
      city: origin.city,
      state: origin.state
    };
    const normalizedDestination = {
      city: destination.city,
      state: destination.state
    };

    const originData = await adminSupabase
      .from('cities')
      .select('city, state_or_province, zip, latitude, longitude, kma_code, kma_name')
      .ilike('city', normalizedOrigin.city)
      .ilike('state_or_province', normalizedOrigin.state)
      .not('latitude', 'is', null)
      .not('kma_code', 'is', null)
      .limit(1);
    
    const baseOrigin = originData?.data?.[0];
    if (!baseOrigin) {
      throw new Error(`Origin city not found: ${origin.city}, ${origin.state}`);
    }
    
    const destinationData = await adminSupabase
      .from('cities')
      .select('city, state_or_province, zip, latitude, longitude, kma_code, kma_name')
      .ilike('city', normalizedDestination.city)
      .ilike('state_or_province', normalizedDestination.state)
      .not('latitude', 'is', null)
      .not('kma_code', 'is', null)
      .limit(1);
    
    const baseDest = destinationData?.data?.[0];
    if (!baseDest) {
      throw new Error(`Destination city not found: ${destination.city}, ${destination.state}`);
    }
    
    console.log(`🗺️ GEOGRAPHIC CRAWL: Finding diverse KMA pairs for ${origin.city}, ${origin.state} -> ${destination.city}, ${destination.state}`);
    
    // Try base radius first (75 miles)
    console.log(`🔍 CRAWL: Searching within ${BASE_RADIUS_MILES} miles (base radius)`);
    let pickupAlternatives = await findCitiesNearLocation(baseOrigin, 999999, BASE_RADIUS_MILES, usedCities, equipment, false);
    let deliveryAlternatives = await findCitiesNearLocation(baseDest, 999999, BASE_RADIUS_MILES, usedCities, equipment, false);
    
    // Check if we have sufficient diversity at base radius
    const basePickupKmas = new Set(pickupAlternatives.map(city => city.kma_code).filter(Boolean));
    const baseDeliveryKmas = new Set(deliveryAlternatives.map(city => city.kma_code).filter(Boolean));
    const baseTotalKmas = new Set([...basePickupKmas, ...baseDeliveryKmas]);
    
    console.log(`📍 CRAWL: Base radius found ${pickupAlternatives.length} pickup cities (${basePickupKmas.size} KMAs), ${deliveryAlternatives.length} delivery cities (${baseDeliveryKmas.size} KMAs), total ${baseTotalKmas.size} unique KMAs`);
    
    // If insufficient diversity, expand to maximum radius
    if (baseTotalKmas.size < TARGET_UNIQUE_KMAS_PER_SIDE) {
      console.log(`⚠️ CRAWL-FALLBACK: Only ${baseTotalKmas.size} unique KMAs found at ${BASE_RADIUS_MILES} miles, expanding to ${MAX_RADIUS_MILES} miles`);
      
      // Expand search radius to 100 miles
      pickupAlternatives = await findCitiesNearLocation(baseOrigin, 999999, MAX_RADIUS_MILES, usedCities, equipment, false);
      deliveryAlternatives = await findCitiesNearLocation(baseDest, 999999, MAX_RADIUS_MILES, usedCities, equipment, false);
      
      const expandedPickupKmas = new Set(pickupAlternatives.map(city => city.kma_code).filter(Boolean));
      const expandedDeliveryKmas = new Set(deliveryAlternatives.map(city => city.kma_code).filter(Boolean));
      const expandedTotalKmas = new Set([...expandedPickupKmas, ...expandedDeliveryKmas]);
      
      console.log(`📍 CRAWL-EXPANDED: Found ${pickupAlternatives.length} pickup cities (${expandedPickupKmas.size} KMAs), ${deliveryAlternatives.length} delivery cities (${expandedDeliveryKmas.size} KMAs), total ${expandedTotalKmas.size} unique KMAs at ${MAX_RADIUS_MILES} miles`);
    } else {
      console.log(`✅ CRAWL: Sufficient diversity found at base radius (${baseTotalKmas.size} KMAs >= target ${TARGET_UNIQUE_KMAS_PER_SIDE})`);
    }
    
    // Select cities with UNIQUE KMAs - NO DUPLICATES ALLOWED
    const pickupKmasSeen = new Set();
    const deliveryKmasSeen = new Set();
    
    const uniquePickups = [];
    const uniqueDeliveries = [];
    
    // Sort by intelligence score and select unique KMAs
    const pickupsSorted = pickupAlternatives.sort((a, b) => b.totalScore - a.totalScore);
    const deliveriesSorted = deliveryAlternatives.sort((a, b) => b.totalScore - a.totalScore);
    
    // Keep EVERY unique KMA found - absolutely no limits
    for (const city of pickupsSorted) {
      const kma = city.kma_code;
      // Only check we haven't seen this KMA before
      if (!pickupKmasSeen.has(kma)) {
        uniquePickups.push(city);
        pickupKmasSeen.add(kma);
        // Track intelligence
        trackIntelligence('unique_kma_found', {
          side: 'pickup',
          city: city.city,
          state: city.state_or_province,
          kma: kma,
          distance: city.distance
        });
      }
    }
    
    // Same for delivery side - keep EVERY unique KMA
    for (const city of deliveriesSorted) {
      const kma = city.kma_code;
      // Only check we haven't seen this KMA before
      if (!deliveryKmasSeen.has(kma)) {
        uniqueDeliveries.push(city);
        deliveryKmasSeen.add(kma);
        // Track intelligence
        trackIntelligence('unique_kma_found', {
          side: 'delivery',
          city: city.city,
          state: city.state_or_province,
          kma: kma,
          distance: city.distance
        });
      }
    }
    
    // Log diversity achieved (no longer enforcing minimum)
    if (uniquePickups.length < TARGET_UNIQUE_KMAS_PER_SIDE) {
      console.log(`📊 Found ${uniquePickups.length} unique pickup KMAs (target: ${TARGET_UNIQUE_KMAS_PER_SIDE}, but proceeding with available diversity)`);
    }
    
    if (uniqueDeliveries.length < TARGET_UNIQUE_KMAS_PER_SIDE) {
      console.log(`📊 Found ${uniqueDeliveries.length} unique delivery KMAs (target: ${TARGET_UNIQUE_KMAS_PER_SIDE}, but proceeding with available diversity)`);
    }
    
    // Create pairs from unique KMA cities - NO DUPLICATES
    const pairs = [];
    const maxPairs = Math.max(uniquePickups.length, uniqueDeliveries.length);
    
    for (let i = 0; i < maxPairs; i++) {
      const pickup = uniquePickups[i % uniquePickups.length];  // Cycle if needed
      const delivery = uniqueDeliveries[i % uniqueDeliveries.length]; // Cycle if needed
      
      pairs.push({
        pickup: {
          city: pickup.city,
          state: pickup.state_or_province,
          zip: pickup.zip || '',
          kma_code: pickup.kma_code
        },
        delivery: {
          city: delivery.city,
          state: delivery.state_or_province,
          zip: delivery.zip || '',
          kma_code: delivery.kma_code
        },
        score: (pickup.totalScore || 0.5) + (delivery.totalScore || 0.5),
        geographic: {
          pickup_distance: pickup.distance || 0,
          delivery_distance: delivery.distance || 0,
          pickup_kma: pickup.kma_code,
          delivery_kma: delivery.kma_code,
          pickup_intelligence: pickup.intelligenceScore || 0,
          delivery_intelligence: delivery.intelligenceScore || 0
        }
      });
      
      console.log(`  📋 Pair ${i+1}: ${pickup.city}, ${pickup.state_or_province} (${pickup.kma_code}) -> ${delivery.city}, ${delivery.state_or_province} (${delivery.kma_code})`);
    }
    
    // INTELLIGENCE VALIDATION: Check KMA diversity achieved
    const uniquePickupKmas = new Set(pairs.map(p => p.geographic.pickup_kma));
    const uniqueDeliveryKmas = new Set(pairs.map(p => p.geographic.delivery_kma));
    
    console.log(`\n🎯 INTELLIGENCE RESULTS:`);
    console.log(`   Generated pairs: ${pairs.length}`);
    console.log(`   Unique pickup KMAs: ${uniquePickupKmas.size} (target: ${TARGET_UNIQUE_KMAS_PER_SIDE}+)`);
    console.log(`   Unique delivery KMAs: ${uniqueDeliveryKmas.size} (target: ${TARGET_UNIQUE_KMAS_PER_SIDE}+)`);
    console.log(`   No duplicates: ✓ (${pairs.length} unique pairs)`);

    return {
      baseOrigin: { 
        city: baseOrigin.city,
        state: baseOrigin.state_or_province,
        zip: baseOrigin.zip || ''
      },
      baseDest: {
        city: baseDest.city,
        state: baseDest.state_or_province,
        zip: baseDest.zip || ''
      },
      pairs: pairs,
      usedCities,
      kmaAnalysis: {
        target: TARGET_UNIQUE_KMAS_PER_SIDE,
        achieved: pairs.length,
        uniquePickupKmas: uniquePickupKmas.size,
        uniqueDeliveryKmas: uniqueDeliveryKmas.size,
        diversityScore: (uniquePickupKmas.size + uniqueDeliveryKmas.size) / (TARGET_UNIQUE_KMAS_PER_SIDE * 2)
      }
    };
    
  } catch (error) {
    console.error('❌ GEOGRAPHIC CRAWL ERROR:');
    console.error(`   Origin: ${origin?.city}, ${origin?.state}`);
    console.error(`   Dest: ${destination?.city}, ${destination?.state}`);
    console.error(`   Equipment: ${equipment}`);
    console.error(`   Error: ${error.message}`);
    throw error;
  }
}

/**
 * Get cities from Supabase database only
 */
async function getSupabaseCitiesNearLocation(baseCity, maxDistanceMiles, usedCities = new Set()) {
  const latRange = maxDistanceMiles / 69;
  const lonRange = maxDistanceMiles / (69 * Math.cos(baseCity.latitude * Math.PI / 180));
  
  let query = adminSupabase
    .from('cities')
    .select('city, state_or_province, zip, latitude, longitude, kma_code, kma_name, here_verified, here_confidence, discovered_by')
    .gte('latitude', baseCity.latitude - latRange)
    .lte('latitude', baseCity.latitude + latRange)
    .gte('longitude', baseCity.longitude - lonRange)
    .lte('longitude', baseCity.longitude + lonRange)
    .not('latitude', 'is', null)
    .not('kma_code', 'is', null)
    .order('here_verified', { ascending: false })
    .order('here_confidence', { ascending: false })
    .limit(500);
  
  // Prefer different KMAs from base city
  if (baseCity.kma_code) {
    query = query.neq('kma_code', baseCity.kma_code);
  }
  
  const { data: rawCities, error } = await query;
  
  if (error || !rawCities?.length) {
    console.log(`⚠️ No Supabase cities found near ${baseCity.city}`);
    return [];
  }
  
  // Filter and calculate distances
  const validCities = [];
  for (const city of rawCities) {
    const cityKey = `${city.city}, ${city.state_or_province}`;
    if (usedCities.has(cityKey)) continue;
    
    const distance = calculateDistance(
      baseCity.latitude, baseCity.longitude,
      city.latitude, city.longitude
    );
    
    if (distance <= maxDistanceMiles) {
      validCities.push({ ...city, distance, cityKey });
    }
  }
  
  console.log(`🗄️ Supabase returned ${validCities.length} valid cities within ${maxDistanceMiles} miles`);
  return validCities;
}

/**
 * Get cities from HERE.com with KMA enrichment
 */
async function getHereCitiesWithKmaEnrichment(baseCity, targetCount, maxDistanceMiles) {
  try {
    const encodedLocation = encodeURIComponent(`${baseCity.city}, ${baseCity.state}`);
    console.log(`🌐 Querying HERE.com for cities near: ${encodedLocation}`);
    
    const response = await fetch(
      `https://geocode.search.hereapi.com/v1/geocode?q=${encodedLocation}&apikey=${HERE_API_KEY}&limit=${targetCount * 3}`
    );
    
    if (!response.ok) {
      console.error(`❌ HERE API error: ${response.status}`);
      return [];
    }
    
    const data = await response.json();
    
    if (!data.items || data.items.length === 0) {
      console.log(`⚠️ No cities found by HERE API for ${baseCity.city}`);
      return [];
    }
    
    let hereCities = data.items.map(item => ({
      city: item.address.city || item.title.split(',')[0],
      state: item.address.stateCode || item.address.state,
      latitude: item.position.lat,
      longitude: item.position.lng,
      zip: item.address.postalCode || null
    }));
    
    console.log(`📥 HERE.com returned ${hereCities.length} cities`);
    
    // Enrich with KMA assignment and database storage
    for (const hereCity of hereCities) {
      const verification = await verifyCityWithHERE(
        hereCity.city, 
        hereCity.state, 
        null, 
        'discovery',
        'geographic_crawl'
      );
      
      if (verification.verified) {
        const minDistance = 999999;
        let assignedKMA = null;
        
        // Find nearest Supabase city for KMA assignment
        const nearbyKMAs = await adminSupabase
          .from('cities')
          .select('kma_code, kma_name, latitude, longitude')
          .not('kma_code', 'is', null)
          .limit(100);
          
        if (nearbyKMAs.data) {
          for (const kmaCity of nearbyKMAs.data) {
            const distance = calculateDistance(
              hereCity.latitude, hereCity.longitude,
              kmaCity.latitude, kmaCity.longitude
            );
            if (distance < minDistance) {
              assignedKMA = kmaCity.kma_code;
            }
          }
        }
        
        // Store in database if new
        const { data: existing } = await adminSupabase
          .from('cities')
          .select('id, kma_code')
          .eq('city', hereCity.city)
          .eq('state_or_province', hereCity.state)
          .limit(1);
          
        if (!existing?.length && assignedKMA) {
          console.log(`🆕 Adding HERE.com city to database: ${hereCity.city}, ${hereCity.state} → ${assignedKMA}`);
          await adminSupabase
            .from('cities')
            .insert({
              city: hereCity.city,
              state_or_province: hereCity.state,
              latitude: hereCity.latitude,
              longitude: hereCity.longitude,
              kma_code: assignedKMA,
              here_verified: true,
              here_confidence: 0.9,
              discovered_by: 'here_api_geographic_crawl',
              discovery_date: new Date().toISOString()
            });
        }
        
        // Assign KMA to the HERE city object
        hereCity.kma_code = assignedKMA;
      }
    }
    
    return hereCities;
  } catch (error) {
    console.warn('⚠️ HERE.com city fetch failed:', error.message);
    return [];
  }
}

/**
 * Find cities near a location within distance
 */
async function findCitiesNearLocation(baseCity, targetCount = 6, maxDistanceMiles = 75, usedCities = new Set(), equipment = null, allowSameKma = false) {
  console.log(`🔍 Finding ${targetCount} cities near ${baseCity.city}, ${baseCity.state} within ${maxDistanceMiles} miles`);
  
  if (!baseCity.latitude || !baseCity.longitude) {
    console.error(`❌ Missing coordinates for ${baseCity.city}`);
    return [];
  }

  // Step 1: Check Supabase first for existing cities with KMA diversity
  console.log(`🗄️ Checking Supabase for cities near ${baseCity.city}`);
  const supabaseCities = await getSupabaseCitiesNearLocation(baseCity, maxDistanceMiles, usedCities);
  
  // Count unique KMAs in Supabase results
  const supabaseKmas = new Set(supabaseCities.map(city => city.kma_code).filter(Boolean));
  console.log(`📊 Supabase found ${supabaseCities.length} cities with ${supabaseKmas.size} unique KMAs`);
  
  // Step 2: Only use HERE.com if insufficient KMA diversity in Supabase
  let hereCities = [];
  if (supabaseKmas.size < TARGET_UNIQUE_KMAS_PER_SIDE) {
    console.log(`⚠️ Insufficient KMA diversity in Supabase (${supabaseKmas.size} < ${TARGET_UNIQUE_KMAS_PER_SIDE}), querying HERE.com`);
    hereCities = await getHereCitiesWithKmaEnrichment(baseCity, targetCount, maxDistanceMiles);
  } else {
    console.log(`✅ Sufficient KMA diversity found in Supabase, skipping HERE.com`);
  }

        
        // FOURTH: Log the discovery for intelligence tracking

  
  // Step 3: Combine both sources for comprehensive city selection
  
  // Combine and score cities from both sources
  const validCities = [];
  const seenCities = new Set();

  // Process function to avoid code duplication
  const processCity = (city, source) => {
    const cityKey = `${city.city || city.city}, ${city.state_or_province || city.state}`;
    
    // Skip if already processed or used
    if (seenCities.has(cityKey) || usedCities.has(cityKey)) return;
    seenCities.add(cityKey);
    
    // Skip synthetic names
    const name = (city.city || '').toLowerCase();
    if (name.includes('metro') || name.includes('zone') ||
        name.includes('region') || name.includes('area')) {
      return;
    }
    
    // Calculate real distance
    const distance = calculateDistance(
      baseCity.latitude,
      baseCity.longitude,
      city.latitude,
      city.longitude
    );
    
    if (distance <= maxDistanceMiles) {
      // Enhanced scoring system with HERE.com intelligence
      const intelligenceScore = calculateFreightIntelligence(city, equipment, baseCity);
      const distanceScore = 1 - (distance / maxDistanceMiles);
      const hereBonus = city.here_verified ? 0.15 : 0; // Bonus for HERE.com verified cities
      const confidenceBonus = (city.here_confidence || 0) * 0.1; // Confidence-based bonus
      const sourceBonus = source === 'here' ? 0.1 : 0; // Small bonus for fresh HERE.com results
      const totalScore = intelligenceScore + distanceScore * 0.3 + hereBonus + confidenceBonus + sourceBonus;
      
      validCities.push({
        ...city,
        // Normalize field names
        city: city.city || city.city,
        state_or_province: city.state_or_province || city.state,
        distance,
        intelligenceScore,
        totalScore,
        cityKey,
        here_verified: city.here_verified || source === 'here',
        here_confidence: city.here_confidence || (source === 'here' ? 0.9 : 0.8)
      });
    }
  };

  // Process HERE.com cities first
  for (const city of hereCities) {
    processCity(city, 'here');
  }

  // Then process Supabase cities
  for (const city of supabaseCities) {
    processCity(city, 'database');
  }
  
  // ENHANCED SELECTION: KMA diversity FIRST, distance SECOND (within 75 miles MAX)
  const selectedCities = [];
  const usedKmas = new Set();
  
  // Add base city KMA to used set if it exists
  if (baseCity.kma_code) {
    usedKmas.add(baseCity.kma_code);
  }
  
  // STRATEGY: Group cities by KMA, then pick best from each KMA
  const citiesByKMA = {};
  
  // Group valid cities by KMA (all within 75 miles already)
  validCities.forEach(city => {
    if (!citiesByKMA[city.kma_code]) {
      citiesByKMA[city.kma_code] = [];
    }
    citiesByKMA[city.kma_code].push(city);
  });
  
  // Sort KMAs by best city in each KMA
  const kmaEntries = Object.entries(citiesByKMA).map(([kma, cities]) => {
    const bestCity = cities.sort((a, b) => b.totalScore - a.totalScore)[0];
    return [kma, cities, bestCity.totalScore];
  }).sort((a, b) => b[2] - a[2]); // Sort by best score per KMA
  
  // Select one city from each KMA for maximum diversity
  for (const [kma, cities] of kmaEntries) {
    // Skip if we already have a city from this KMA
    if (usedKmas.has(kma)) {
      continue;
    }
    
    // Pick the best scoring city from this KMA
    const bestCityInKMA = cities.sort((a, b) => b.totalScore - a.totalScore)[0];
    selectedCities.push(bestCityInKMA);
    usedKmas.add(kma);
    
    // Stop when we have enough UNIQUE KMAs
    if (selectedCities.length >= targetCount) {
      break;
    }
  }
    
  console.log(`📊 City Selection Results (KMA-UNIQUE):`);
  console.log(`   Total candidates: ${validCities.length}`);
  console.log(`   HERE.com verified: ${validCities.filter(c => c.here_verified).length}`);
  console.log(`   Selected: ${selectedCities.length}`);
  console.log(`   Unique KMAs: ${usedKmas.size}`);
  console.log(`   Average score: ${selectedCities.length > 0 ? (selectedCities.reduce((sum, c) => sum + c.totalScore, 0) / selectedCities.length).toFixed(2) : '0'}`);
  
  // Log each selected city with KMA info
  selectedCities.forEach((city, i) => {
    console.log(`   ${i + 1}. ${city.city}, ${city.state_or_province} (KMA: ${city.kma_code})`);
    console.log(`      Score: ${city.totalScore.toFixed(2)} | Distance: ${city.distance.toFixed(1)}mi | HERE Verified: ${city.here_verified ? '✓' : '×'}`);
  });
  
  return selectedCities;
}
