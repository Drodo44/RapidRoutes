// lib/geographicCrawl.js
// GEOGRAPHIC CRAWL: Find cities near pickup/delivery with different KMAs
// This is the CORRECT approach using your complete city/KMA database

import { adminSupabase } from '../utils/supabaseClient.js';
import { calculateFreightIntelligence } from './freightIntelligence.js';
import { calculateDistance } from './distanceCalculator.js';

/**
 * GEOGRAPHIC CRAWL: Use your complete KMA database properly with 75-mile rule
 */
export async function generateGeographicCrawlPairs({ origin, destination, equipment, preferFillTo10 = false, usedCities = new Set() }) {
  try {
    // DAT SPECIFICATION: Always generate exactly 6 pairs 
    // (1 base + 5 additional) × 2 contact methods = 12 rows total
    // preferFillTo10 is deprecated - we always generate exactly 6 pairs
    const REQUIRED_PAIRS = 6;
    
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
    
    console.log(`🗺️ GEOGRAPHIC CRAWL: Finding 6 pairs for ${origin.city}, ${origin.state} -> ${destination.city}, ${destination.state}`);
    
    // Find cities within 75 miles for diversity
    const pickupAlternatives = await findCitiesNearLocation(baseOrigin, REQUIRED_PAIRS * 2, 75, usedCities, equipment, false);
    const deliveryAlternatives = await findCitiesNearLocation(baseDest, REQUIRED_PAIRS * 2, 75, usedCities, equipment, false);
    
    // Sort all cities by total score (freight intelligence + distance)
    const pickupsSorted = pickupAlternatives
      .sort((a, b) => b.totalScore - a.totalScore)
      .slice(0, REQUIRED_PAIRS);
    
    const deliveriesSorted = deliveryAlternatives
      .sort((a, b) => b.totalScore - a.totalScore)
      .slice(0, REQUIRED_PAIRS);
    
    // Ensure we have exactly 6 cities on each side
    while (pickupsSorted.length < REQUIRED_PAIRS) {
      console.warn('⚠️ Adding duplicate pickup city to reach 6');
      pickupsSorted.push({...baseOrigin, totalScore: 0.5});
    }
    
    while (deliveriesSorted.length < REQUIRED_PAIRS) {
      console.warn('⚠️ Adding duplicate delivery city to reach 6');
      deliveriesSorted.push({...baseDest, totalScore: 0.5});
    }
    
    // Create exactly 6 pairs
    const pairs = [];
    for (let i = 0; i < REQUIRED_PAIRS; i++) {
      const pickup = pickupsSorted[i];
      const delivery = deliveriesSorted[i];
      
      pairs.push({
        pickup: {
          city: pickup.city,
          state: pickup.state_or_province,
          zip: pickup.zip || ''
        },
        delivery: {
          city: delivery.city,
          state: delivery.state_or_province,
          zip: delivery.zip || ''
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
    
    // FINAL VALIDATION: Must have exactly 6 pairs!
    if (pairs.length !== REQUIRED_PAIRS) {
      throw new Error(`Critical error: Expected 6 pairs but got ${pairs.length}`);
    }
    
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
        required: REQUIRED_PAIRS,
        achieved: pairs.length,
        uniquePickupKmas: new Set(pairs.map(p => p.geographic.pickup_kma)).size,
        uniqueDeliveryKmas: new Set(pairs.map(p => p.geographic.delivery_kma)).size
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
        // Add to our database if not exists
        const { data: existing } = await adminSupabase
          .from('cities')
          .select('city')
          .ilike('city', hereCity.city)
          .ilike('state_or_province', hereCity.state)
          .limit(1);
          
        if (!existing?.length) {
          console.log(`🆕 Adding new city from HERE.com: ${hereCity.city}, ${hereCity.state}`);
          await adminSupabase
            .from('cities')
            .insert({
              city: hereCity.city,
              state_or_province: hereCity.state,
              latitude: hereCity.latitude,
              longitude: hereCity.longitude,
              here_verified: true,
              discovered_by: 'here_api',
              discovery_date: new Date().toISOString()
            });
        }
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
    .select('city, state_or_province, zip, latitude, longitude, kma_code, kma_name, here_verified')
    .gte('latitude', baseCity.latitude - latRange)
    .lte('latitude', baseCity.latitude + latRange)
    .gte('longitude', baseCity.longitude - lonRange)
    .lte('longitude', baseCity.longitude + lonRange)
    .not('latitude', 'is', null)
    .not('kma_code', 'is', null)
    .order('here_verified', { ascending: false }) // Prefer HERE.com verified cities
    .limit(100);
  
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
      // Enhanced scoring system
      const intelligenceScore = calculateFreightIntelligence(city, equipment, baseCity);
      const distanceScore = 1 - (distance / maxDistanceMiles);
      const hereBonus = city.here_verified ? 0.15 : 0; // Bonus for HERE.com verified cities
      const sourceBonus = source === 'here' ? 0.1 : 0; // Small bonus for fresh HERE.com results
      const totalScore = intelligenceScore + distanceScore * 0.3 + hereBonus + sourceBonus;
      
      validCities.push({
        ...city,
        distance,
        intelligenceScore,
        totalScore,
        cityKey,
        here_verified: city.here_verified || source === 'here'
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
  
  // Return best scoring cities with detailed logging
  const selectedCities = validCities
    .sort((a, b) => b.totalScore - a.totalScore)
    .slice(0, targetCount);
    
  console.log(`📊 City Selection Results:`);
  console.log(`   Total candidates: ${validCities.length}`);
  console.log(`   HERE.com verified: ${validCities.filter(c => c.here_verified).length}`);
  console.log(`   Selected: ${selectedCities.length}`);
  console.log(`   Average score: ${(selectedCities.reduce((sum, c) => sum + c.totalScore, 0) / selectedCities.length).toFixed(2)}`);
  
  // Log each selected city
  selectedCities.forEach((city, i) => {
    console.log(`   ${i + 1}. ${city.city}, ${city.state_or_province}`);
    console.log(`      Score: ${city.totalScore.toFixed(2)} | Distance: ${city.distance.toFixed(1)}mi | HERE Verified: ${city.here_verified ? '✓' : '×'}`);
  });
  
  return selectedCities;
}
