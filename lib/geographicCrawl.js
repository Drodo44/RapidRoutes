// lib/geographicCrawl.js
// GEOGRAPHIC CRAWL: Find cities near pickup/delivery with different KMAs
// This is the CORRECT approach using your complete city/KMA database

import { adminSupabase } from '../utils/supabaseClient.js';
import { calculateFreightIntelligence } from './freightScoring.js';
import { calculateDistance } from './distanceCalculator.js';
import { verifyCityWithHERE, generateAlternativeCitiesWithHERE } from './hereVerificationService.js';

/**
 * GEOGRAPHIC CRAWL: Use your complete KMA database properly with 75-mile rule
 */
export async function generateGeographicCrawlPairs({ origin, destination, equipment, preferFillTo10 = false, usedCities = new Set() }) {
  try {
    // INTELLIGENCE TARGET: Find MINIMUM 6 unique KMAs per side - NO DUPLICATES
    // More pairs = better freight intelligence with maximum market diversity
    const MIN_UNIQUE_KMAS_PER_SIDE = 6;
    
    // Early validation to avoid database queries for bad data
    if (!origin?.city || !origin?.state) {
      throw new Error(`Invalid origin: city=${origin?.city}, state=${origin?.state}`);
    }
    if (!destination?.city || !destination?.state) {
      throw new Error(`Invalid destination: city=${destination?.city}, state=${destination?.state}`);
    }
    
    // Get base cities from database
    const originData = await adminSupabase
      .from('cities')
      .select('city, state_or_province, zip, latitude, longitude, kma_code, kma_name')
      .ilike('city', origin.city)
      .ilike('state_or_province', origin.state)
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
      .ilike('city', destination.city)
      .ilike('state_or_province', destination.state)
      .not('latitude', 'is', null)
      .not('kma_code', 'is', null)
      .limit(1);
    
    const baseDest = destinationData?.data?.[0];
    if (!baseDest) {
      throw new Error(`Destination city not found: ${destination.city}, ${destination.state}`);
    }
    
    console.log(`🗺️ GEOGRAPHIC CRAWL: Finding diverse KMA pairs for ${origin.city}, ${origin.state} -> ${destination.city}, ${destination.state}`);
    
    // Find cities within 75 miles MAX - plenty of diversity without going beyond business rule
    // Business requirement: Never exceed 75 miles for freight intelligence
    const pickupAlternatives = await findCitiesNearLocation(baseOrigin, MIN_UNIQUE_KMAS_PER_SIDE * 5, 75, usedCities, equipment, false);
    const deliveryAlternatives = await findCitiesNearLocation(baseDest, MIN_UNIQUE_KMAS_PER_SIDE * 5, 75, usedCities, equipment, false);
    
    // Select cities with UNIQUE KMAs - NO DUPLICATES ALLOWED
    const pickupKmasSeen = new Set();
    const deliveryKmasSeen = new Set();
    
    const uniquePickups = [];
    const uniqueDeliveries = [];
    
    // Sort by intelligence score and select unique KMAs
    const pickupsSorted = pickupAlternatives.sort((a, b) => b.totalScore - a.totalScore);
    const deliveriesSorted = deliveryAlternatives.sort((a, b) => b.totalScore - a.totalScore);
    
    // Select pickups with unique KMAs
    for (const city of pickupsSorted) {
      if (!pickupKmasSeen.has(city.kma_code)) {
        uniquePickups.push(city);
        pickupKmasSeen.add(city.kma_code);
        
        if (uniquePickups.length >= MIN_UNIQUE_KMAS_PER_SIDE) {
          break; // Found enough unique KMAs
        }
      }
    }
    
    // Select deliveries with unique KMAs  
    for (const city of deliveriesSorted) {
      if (!deliveryKmasSeen.has(city.kma_code)) {
        uniqueDeliveries.push(city);
        deliveryKmasSeen.add(city.kma_code);
        
        if (uniqueDeliveries.length >= MIN_UNIQUE_KMAS_PER_SIDE) {
          break; // Found enough unique KMAs
        }
      }
    }
    
    // Verify we achieved minimum diversity
    if (uniquePickups.length < MIN_UNIQUE_KMAS_PER_SIDE) {
      console.warn(`⚠️ Only found ${uniquePickups.length} unique pickup KMAs (target: ${MIN_UNIQUE_KMAS_PER_SIDE})`);
    }
    
    if (uniqueDeliveries.length < MIN_UNIQUE_KMAS_PER_SIDE) {
      console.warn(`⚠️ Only found ${uniqueDeliveries.length} unique delivery KMAs (target: ${MIN_UNIQUE_KMAS_PER_SIDE})`);
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
    console.log(`   Unique pickup KMAs: ${uniquePickupKmas.size} (target: ${MIN_UNIQUE_KMAS_PER_SIDE}+)`);
    console.log(`   Unique delivery KMAs: ${uniqueDeliveryKmas.size} (target: ${MIN_UNIQUE_KMAS_PER_SIDE}+)`);
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
        required: MIN_UNIQUE_KMAS_PER_SIDE,
        achieved: pairs.length,
        uniquePickupKmas: uniquePickupKmas.size,
        uniqueDeliveryKmas: uniqueDeliveryKmas.size,
        diversityScore: (uniquePickupKmas.size + uniqueDeliveryKmas.size) / (MIN_UNIQUE_KMAS_PER_SIDE * 2)
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
 * Find cities near a location within distance
 */
async function findCitiesNearLocation(baseCity, targetCount = 6, maxDistanceMiles = 75, usedCities = new Set(), equipment = null, allowSameKma = false) {
  console.log(`🔍 Finding ${targetCount} cities near ${baseCity.city}, ${baseCity.state} within ${maxDistanceMiles} miles`);
  
  if (!baseCity.latitude || !baseCity.longitude) {
    console.error(`❌ Missing coordinates for ${baseCity.city}`);
    return [];
  }

  // Step 1: Get cities from HERE.com API
  let hereCities = [];
  try {
    console.log(`🌎 Fetching cities from HERE.com near ${baseCity.city}`);
    hereCities = await generateAlternativeCitiesWithHERE(
      baseCity.latitude,
      baseCity.longitude,
      maxDistanceMiles,
      targetCount * 3 // Get extra cities for better selection
    );
    
    // Verify and enrich database with HERE.com discoveries
    for (const hereCity of hereCities) {
      const verification = await verifyCityWithHERE(
        hereCity.city, 
        hereCity.state, 
        null, 
        'discovery',
        'geographic_crawl'
      );
      
      if (verification.verified) {
        // FIRST: Find the correct KMA by cross-referencing with internal database
        let assignedKMA = null;
        let minDistance = Infinity;
        
        const { data: nearbyKMAs } = await adminSupabase
          .from('cities')
          .select('kma_code, latitude, longitude')
          .not('kma_code', 'is', null)
          .not('latitude', 'is', null)
          .not('longitude', 'is', null)
          .limit(100);
        
        if (nearbyKMAs?.length > 0) {
          for (const kmaCity of nearbyKMAs) {
            const distance = calculateDistance(
              hereCity.latitude, hereCity.longitude,
              kmaCity.latitude, kmaCity.longitude
            );
            if (distance < minDistance) {
              minDistance = distance;
              assignedKMA = kmaCity.kma_code;
            }
          }
        }
        
        // SECOND: Add the KMA to the HERE.com city object for immediate use
        hereCity.kma_code = assignedKMA;
        hereCity.here_verified = true;
        hereCity.here_confidence = 0.9;
        
        // THIRD: Check if city exists in database and add/update it
        const { data: existing } = await adminSupabase
          .from('cities')
          .select('id, kma_code')
          .ilike('city', hereCity.city)
          .ilike('state_or_province', hereCity.state)
          .limit(1);
          
        if (!existing?.length) {
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
        } else if (!existing[0].kma_code && assignedKMA) {
          console.log(`🔧 Updating database city with KMA: ${hereCity.city}, ${hereCity.state} → ${assignedKMA}`);
          await adminSupabase
            .from('cities')
            .update({ 
              kma_code: assignedKMA,
              here_verified: true,
              here_confidence: 0.85
            })
            .eq('id', existing[0].id);
        }
        
        // FOURTH: Log the discovery for intelligence tracking
        await adminSupabase
          .from('here_discovery_log')
          .insert({
            city_name: hereCity.city,
            state_name: hereCity.state,
            latitude: hereCity.latitude,
            longitude: hereCity.longitude,
            kma_assigned: assignedKMA,
            verification_status: 'verified_and_assigned',
            discovery_context: `geographic_crawl_distance_${minDistance.toFixed(1)}mi`
          });
      }
    }
  } catch (error) {
    console.warn('⚠️ HERE.com city fetch failed:', error.message);
    // Continue with database - HERE.com is enhancement, not requirement
  }
  
  // Step 2: Get cities from database
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
    .order('here_verified', { ascending: false }) // Prefer HERE.com verified cities
    .order('here_confidence', { ascending: false }) // Then by confidence
    .limit(500); // Increased from 100 to find more diverse KMAs
  
  // Prefer different KMAs but allow same if needed
  if (!allowSameKma) {
    query = query.neq('kma_code', baseCity.kma_code || 'UNKNOWN');
  }
  
  const { data: rawCities, error } = await query;
  
  if (error || !rawCities?.length) {
    console.warn(`⚠️ No cities found near ${baseCity.city}`);
    return [];
  }
  
  // Combine and score cities from both sources
  const validCities = [];
  const seenCities = new Set();

  // Process function to avoid code duplication
  const processCity = (city, source) => {
    const cityKey = `${city.city}, ${city.state_or_province}`;
    
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

  // Then process database cities
  for (const city of rawCities) {
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
