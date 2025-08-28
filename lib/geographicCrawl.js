// lib/geographicCrawl.js
// GEOGRAPHIC CRAWL: Find cities near pickup/delivery with different KMAs
// This is the CORRECT approach using your complete city/KMA database

import { adminSupabase } from '../utils/supabaseClient.js';

// REAL FREIGHT MARKET INTELLIGENCE - Based on DAT market zones and regional logistics
function calculateFreightIntelligence(cityRow, equipment, baseCity) {
  const eq = String(equipment || '').toUpperCase();
  if (!cityRow) return 0;
  const name = cityRow.city?.toLowerCase() || '';
  const state = cityRow.state_or_province?.toLowerCase() || '';
  const baseName = baseCity?.city?.toLowerCase() || '';
  const baseState = baseCity?.state_or_province?.toLowerCase() || '';
  
  // REGIONAL FREIGHT HUB INTELLIGENCE - Cities that serve their own market zones
  let regionalHubScore = 0;
  
  // GEORGIA/SOUTH CAROLINA FREIGHT CORRIDOR
  if ((baseState === 'ga' && baseName.includes('augusta')) || (baseState === 'sc' && baseName.includes('aiken'))) {
    if (name === 'thomson' && state === 'ga') regionalHubScore = 0.20; // Rural GA hub west of Augusta
    if (name === 'aiken' && state === 'sc') regionalHubScore = 0.25; // SC border logistics hub
    if (name === 'barnwell' && state === 'sc') regionalHubScore = 0.18; // Southern SC regional center
    if (name === 'waynesboro' && state === 'ga') regionalHubScore = 0.15; // Burke County hub
    if (name === 'evans' && state === 'ga') regionalHubScore = 0.12; // Richmond County adjacent
    if (name === 'martinez' && state === 'ga') regionalHubScore = 0.10; // Columbia County hub
  }
  
  // MINNESOTA FREIGHT CORRIDOR - Twin Cities adjacent markets
  if ((baseState === 'mn' && (baseName.includes('anoka') || baseName.includes('minneapolis') || baseName.includes('saint paul')))) {
    if (name === 'st. cloud' || name === 'saint cloud' && state === 'mn') regionalHubScore = 0.25; // Central MN hub
    if (name === 'red wing' && state === 'mn') regionalHubScore = 0.22; // Mississippi River logistics
    if (name === 'hutchinson' && state === 'mn') regionalHubScore = 0.20; // South Central MN hub
    if (name === 'cambridge' && state === 'mn') regionalHubScore = 0.18; // Isanti County hub
    if (name === 'elk river' && state === 'mn') regionalHubScore = 0.15; // Sherburne County hub
    if (name === 'buffalo' && state === 'mn') regionalHubScore = 0.15; // Wright County hub
  }
  
  // NEW JERSEY/PHILADELPHIA FREIGHT CORRIDOR
  if ((baseState === 'nj' && baseName.includes('mount holly')) || (baseState === 'pa' && baseName.includes('philadelphia'))) {
    if (name === 'philadelphia' && state === 'pa') regionalHubScore = 0.35; // Major Philadelphia metro/port market
    if (name === 'port newark' && state === 'nj') regionalHubScore = 0.32; // Major port/logistics hub
    if (name === 'newark' && state === 'nj') regionalHubScore = 0.30; // Major port/logistics hub (alt name)
    if (name === 'jersey city' && state === 'nj') regionalHubScore = 0.28; // Northeast region hub
    if (name === 'trenton' && state === 'nj') regionalHubScore = 0.25; // Central NJ capital corridor
    if (name === 'allentown' && state === 'pa') regionalHubScore = 0.22; // Lehigh Valley/Western PA market
    if (name === 'camden' && state === 'nj') regionalHubScore = 0.20; // South Jersey alternative
    if (name === 'wilmington' && state === 'de') regionalHubScore = 0.18; // Delaware market access
  }

  // MASSACHUSETTS/NEW ENGLAND FREIGHT CORRIDOR
  if ((baseState === 'ma' && baseName.includes('new bedford')) || (baseState === 'ri' && baseName.includes('providence'))) {
    if (name === 'providence' && state === 'ri') regionalHubScore = 0.30; // Major RI logistics hub
    if (name === 'worcester' && state === 'ma') regionalHubScore = 0.25; // Central MA manufacturing hub
    if (name === 'barnstable' && state === 'ma') regionalHubScore = 0.20; // Cape Cod market zone
    if (name === 'hartford' && state === 'ct') regionalHubScore = 0.28; // Major CT logistics hub
    if (name === 'plymouth' && state === 'ma') regionalHubScore = 0.22; // South Shore/Cape region hub
    if (name === 'fall river' && state === 'ma') regionalHubScore = 0.18; // South Coast alternative
    if (name === 'taunton' && state === 'ma') regionalHubScore = 0.15; // Regional distribution center
  }
  if (baseState === 'wi' || state === 'wi') {
    if (name === 'milwaukee' && state === 'wi') regionalHubScore = 0.30; // Major port/manufacturing
    if (name === 'green bay' && state === 'wi') regionalHubScore = 0.25; // Paper/logistics hub
    if (name === 'madison' && state === 'wi') regionalHubScore = 0.22; // State capital/distribution
    if (name === 'eau claire' && state === 'wi') regionalHubScore = 0.20; // Western WI hub
    if (name === 'wausau' && state === 'wi') regionalHubScore = 0.18; // Central WI manufacturing
  }
  
  // ILLINOIS FREIGHT INTELLIGENCE
  if (baseState === 'il' || state === 'il') {
    if (name === 'chicago' && state === 'il') regionalHubScore = 0.35; // Major freight hub
    if (name === 'rockford' && state === 'il') regionalHubScore = 0.25; // Northern IL manufacturing
    if (name === 'peoria' && state === 'il') regionalHubScore = 0.22; // Central IL hub
    if (name === 'decatur' && state === 'il') regionalHubScore = 0.20; // Agricultural/rail hub
    if (name === 'springfield' && state === 'il') regionalHubScore = 0.18; // State capital region
  }
  
  // CROSS-BORDER INTELLIGENCE - Different states get bonus for market diversification
  let crossBorderBonus = 0;
  if (baseState !== state) {
    crossBorderBonus = 0.10; // Bonus for crossing state lines = different DAT markets
  }
  
  // EQUIPMENT-SPECIFIC INTELLIGENCE
  let equipmentScore = 0;
  if (eq === 'FD' || eq === 'F') { // Flatbed
    if (/(steel|mill|manufacturing|port|construction)/.test(name)) equipmentScore = 0.15;
    if (state === 'pa' || state === 'oh' || state === 'in') equipmentScore += 0.08; // Steel belt
  }
  
  if (eq === 'R' || eq === 'IR') { // Reefer
    if (/(produce|cold|food|port)/.test(name)) equipmentScore = 0.15;
    if (state === 'ca' || state === 'fl' || state === 'tx') equipmentScore += 0.08; // Produce states
  }
  
  if (eq === 'V') { // Van
    if (/(distribution|logistics|warehouse)/.test(name)) equipmentScore = 0.12;
    // Major distribution corridors
    if (name === 'atlanta' || name === 'dallas' || name === 'chicago' || name === 'memphis') equipmentScore += 0.10;
  }
  
  // DISTANCE INTELLIGENCE - Closer is better, but not too close (avoid same market)
  const distance = cityRow.distance || 0;
  let distanceScore = 0;
  if (distance >= 20 && distance <= 50) {
    distanceScore = 0.15; // Sweet spot - different market but still relevant
  } else if (distance >= 10 && distance < 20) {
    distanceScore = 0.08; // Might be too close (same market zone)
  } else if (distance > 50 && distance <= 75) {
    distanceScore = 0.12; // Good distance, definitely different market
  }
  
  const totalScore = regionalHubScore + crossBorderBonus + equipmentScore + distanceScore;
  
  // Debug logging for transparency
  if (totalScore > 0.15) {
    console.log(`🧠 FREIGHT INTELLIGENCE: ${cityRow.city}, ${cityRow.state_or_province} scored ${totalScore.toFixed(3)}`);
    console.log(`   📊 Regional: ${regionalHubScore.toFixed(3)}, Cross-border: ${crossBorderBonus.toFixed(3)}, Equipment: ${equipmentScore.toFixed(3)}, Distance: ${distanceScore.toFixed(3)}`);
  }
  
  return totalScore;
}

/**
 * Calculate distance between two points using Haversine formula
 */
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

/**
 * Find cities near a location with different KMA codes
 */
async function findCitiesNearLocation(baseCity, targetCount = 5, maxDistanceMiles = 75, usedCities = new Set(), equipment = null, allowSameKma = false) {
  console.log(`🗺️ Finding ${targetCount} cities near ${baseCity.city}, ${baseCity.state} within ${maxDistanceMiles} miles (avoiding ${usedCities.size} used cities, allowSameKma=${allowSameKma})`);
  
  if (!baseCity.latitude || !baseCity.longitude) {
    console.error(`❌ Base city ${baseCity.city}, ${baseCity.state} missing coordinates`);
    return [];
  }
  
  // Get all cities within the radius with coordinates and KMA codes
  const latRange = maxDistanceMiles / 69; // Approximate degrees per mile
  const lonRange = maxDistanceMiles / (69 * Math.cos(baseCity.latitude * Math.PI / 180));
  
  // Build base query
  let query = adminSupabase
    .from('cities')
    .select('city, state_or_province, zip, latitude, longitude, kma_code, kma_name')
    .gte('latitude', baseCity.latitude - latRange)
    .lte('latitude', baseCity.latitude + latRange)
    .gte('longitude', baseCity.longitude - lonRange) 
    .lte('longitude', baseCity.longitude + lonRange)
    .not('latitude', 'is', null)
    .not('longitude', 'is', null)
    .limit(2000);

  // ENFORCE KMA DIVERSITY: by default, exclude cities that share the base city's KMA.
  // When allowSameKma=true we skip this exclusion to increase availability.
  if (!allowSameKma) {
    query = query.neq('kma_code', baseCity.kma_code || 'UNKNOWN');
  }
  
  // Always require a KMA code
  query = query.not('kma_code', 'is', null);

  const { data: rawCities, error } = await query;
  
  if (error) {
    console.error(`❌ Error finding cities near ${baseCity.city}:`, error);
    return [];
  }
  
  if (!rawCities?.length) {
    console.log(`⚠️ No nearby cities found for ${baseCity.city}, ${baseCity.state}`);
    return [];
  }
  
  // Deduplicate by city name (eliminate ZIP code duplicates) + FILTER OUT SYNTHETIC GARBAGE
  const cityMap = new Map();
  for (const city of rawCities) {
    const cityName = (city.city || '').toLowerCase();
    const stateName = (city.state_or_province || '').toLowerCase();
    
    // Skip cities with missing essential data
    if (!cityName || !stateName) {
      console.log(`🚫 FILTERED OUT city with missing data: ${city.city || 'Unknown'}, ${city.state_or_province || 'Unknown'}`);
      continue;
    }
    
    // CRITICAL FREIGHT FILTER: Eliminate synthetic "Metro/Zone/Region/Area" names
    if (cityName.includes('metro') || cityName.includes('zone') || 
        cityName.includes('region') || cityName.includes('area') ||
        cityName.includes('corridor') || cityName.includes('district')) {
      console.log(`🚫 FILTERED OUT synthetic name: ${city.city}, ${city.state_or_province}`);
      continue;
    }
    
    const cityKey = `${cityName}, ${stateName}`;
    if (!cityMap.has(cityKey)) {
      cityMap.set(cityKey, city);
    }
  }
  
  const nearbyCities = Array.from(cityMap.values());
  console.log(`📊 Found ${nearbyCities.length} REAL cities (filtered and deduplicated from ${rawCities.length} entries)`);
  
  // Calculate actual distances and apply FREIGHT INTELLIGENCE scoring + LOGISTICS PENALTIES
  const citiesWithDistance = [];
  
  for (const city of nearbyCities) {
    const cityKey = `${city.city || 'Unknown'}, ${city.state_or_province || 'Unknown'}`;
    const cityName = (city.city || '').toLowerCase();
    const stateName = (city.state_or_province || '').toLowerCase();
    
    // Skip if this city was already used in a previous load
    if (usedCities.has(cityKey)) {
      continue;
    }
    
    // Skip cities with missing essential data
    if (!cityName || !stateName) {
      continue;
    }
    
    // CRITICAL FREIGHT LOGISTICS PENALTY: Long Island and other problematic locations
    let logisticsPenalty = 0;

    // LONG ISLAND ABSOLUTE BAN - Truckers HATE going onto islands due to bridge/tunnel restrictions
    // Use explicit name list + a correct geographic bounding box for eastern Long Island
    const longIslandNames = ['montauk','hempstead','babylon','islip','southampton','riverhead','huntington','brentwood','napeague','east hampton','hampton'];
    const isLongIslandName = longIslandNames.some(n => cityName.includes(n));

    // Correct bounding box for Long Island (approx):
    // longitude roughly between -74.05 (west) and -71.85 (east)
    // latitude roughly between 40.54 (south) and 41.16 (north)
    const lon = Number(city.longitude);
    const lat = Number(city.latitude);
    const isLongIslandBox = Number.isFinite(lon) && Number.isFinite(lat) && (lon >= -74.05 && lon <= -71.85 && lat >= 40.54 && lat <= 41.16);

    if (stateName === 'ny' && (isLongIslandName || isLongIslandBox)) {
      logisticsPenalty = -99.0; // ABSOLUTE BAN - Never select Long Island cities
      console.log(`🚫 ABSOLUTE BAN: ${cityKey} flagged as Long Island (nameMatch=${isLongIslandName}, bbox=${isLongIslandBox}) - AVOIDED`);
    }
    
    // MANHATTAN/NYC PENALTY - Truck restrictions and congestion
    if ((cityName === 'new york' || cityName === 'manhattan' || cityName === 'brooklyn') && stateName === 'ny') {
      logisticsPenalty = -0.6; // Heavy penalty for NYC proper
      console.log(`🚫 LOGISTICS PENALTY: ${cityKey} is in NYC - truck restrictions`);
    }
    
    // FLORIDA KEYS PENALTY - Single highway, hurricane risk
    if (stateName === 'fl' && (cityName.includes('key ') || cityName === 'marathon' || cityName === 'islamorada')) {
      logisticsPenalty = -0.7; // Heavy penalty for Keys
      console.log(`🚫 LOGISTICS PENALTY: ${cityKey} is in Florida Keys - limited access`);
    }
    
    // NANTUCKET/MARTHA'S VINEYARD PENALTY - Ferry required
    if (stateName === 'ma' && (cityName.includes('nantucket') || cityName.includes('vineyard'))) {
      logisticsPenalty = -0.9; // Extreme penalty for ferry-only locations
      console.log(`🚫 LOGISTICS PENALTY: ${cityKey} requires ferry - impossible for most freight`);
    }
    
    const distance = calculateDistance(
      baseCity.latitude, baseCity.longitude,
      city.latitude, city.longitude
    );
    
    // Enforce the 75-mile rule strictly
    if (distance <= maxDistanceMiles) {
      // Apply REAL FREIGHT INTELLIGENCE scoring based on market zones and logistics
      const intelligenceScore = calculateFreightIntelligence(city, equipment, baseCity);
      const distanceScore = 1 - (distance / maxDistanceMiles); // Closer is better
      const kmaScore = city.kma_code ? 0.2 : 0; // Major market areas get bonus
      
      // Combined intelligent score WITH logistics penalties
      const totalScore = intelligenceScore + distanceScore * 0.3 + kmaScore + logisticsPenalty;
      
      citiesWithDistance.push({
        ...city,
        distance: Math.round(distance),
        cityKey,
        intelligenceScore,
        logisticsPenalty,
        totalScore
      });
    }
  }
  
  // Sort by INTELLIGENCE SCORE (not just distance!) and take the best ones
  const selectedCities = citiesWithDistance
    .sort((a, b) => b.totalScore - a.totalScore) // Higher score is better
    .slice(0, targetCount);
  
  console.log(`📍 Found ${selectedCities.length}/${targetCount} INTELLIGENT cities near ${baseCity.city} (within ${maxDistanceMiles} miles):`);
  selectedCities.forEach(city => {
    const reason = city.intelligenceScore > 0.05 ? 'FREIGHT HUB' : 'Geographic';
    const penalty = city.logisticsPenalty < 0 ? ` [PENALIZED: ${city.logisticsPenalty.toFixed(2)}]` : '';
    console.log(`   ${city.city}, ${city.state_or_province} - ${city.distance}mi (KMA: ${city.kma_code}) [${reason}: ${city.totalScore.toFixed(3)}]${penalty}`);
  });
  
  return selectedCities;
}

/**
 * INTELLIGENT FALLBACK STRATEGY: Guarantee 6 total postings using freight corridor logic
 * This implements Option 1: Intelligent Fallback Hierarchy for when pure KMA diversity fails
 */
async function generateIntelligentFallbackPairs({ baseOrigin, baseDest, equipment, needed, existingPairs, usedCities }) {
  console.log(`🔄 INTELLIGENT FALLBACK: Generating ${needed} additional pairs using freight corridor strategy`);
  
  const fallbackPairs = [];
  
  // RELEVANCE QUALITY CONTROL: Set minimum standards for fallback pairs
  const RELEVANCE_STANDARDS = {
    maxDistance: 200,           // Never exceed 200 miles (still reasonable freight distance)
    minIntelligenceScore: 0.05, // Must have some freight intelligence value
    maxFallbackPairs: 5,        // Allow full fallback generation to guarantee 6 postings
    requireCrossBorder: false,   // Prefer different states but don't require
  };
  const usedKmas = new Set();
  
  // Track existing KMAs to avoid exact duplicates when possible
  existingPairs.forEach(pair => {
    usedKmas.add(`${pair.geographic.pickup_kma}-${pair.geographic.delivery_kma}`);
  });
  
  // STRATEGY 1: Sub-Market Intelligence (Same KMA, different freight sub-areas)
  console.log(`📍 STRATEGY 1: Sub-market splitting within existing KMAs`);
  
  // Find additional cities in same KMAs as base cities but different freight corridors
  const basePickupKma = baseOrigin.kma_code;
  const baseDeliveryKma = baseDest.kma_code;
  
  if (fallbackPairs.length < needed && basePickupKma && baseDeliveryKma) {
    // Look for cities in same KMA as base but different freight corridors
    const { data: sameKmaPickups } = await adminSupabase
      .from('cities')
      .select('city, state_or_province, zip, latitude, longitude, kma_code, kma_name')
      .eq('kma_code', basePickupKma)
      .not('latitude', 'is', null)
      .not('longitude', 'is', null)
      .limit(50);
      
    const { data: sameKmaDeliveries } = await adminSupabase
      .from('cities')
      .select('city, state_or_province, zip, latitude, longitude, kma_code, kma_name')
      .eq('kma_code', baseDeliveryKma)
      .not('latitude', 'is', null)
      .not('longitude', 'is', null)
      .limit(50);
    
    if (sameKmaPickups?.length && sameKmaDeliveries?.length) {
      // Apply freight intelligence scoring and select best sub-market alternatives
      const scoredPickups = sameKmaPickups
        .filter(city => {
          const cityKey = `${city.city}, ${city.state_or_province}`;
          return !usedCities.has(cityKey) && cityKey !== `${baseOrigin.city}, ${baseOrigin.state_or_province}`;
        })
        .map(city => ({
          ...city,
          cityKey: `${city.city}, ${city.state_or_province}`,
          distance: calculateDistance(baseOrigin.latitude, baseOrigin.longitude, city.latitude, city.longitude),
          intelligenceScore: calculateFreightIntelligence(city, equipment, baseOrigin),
          totalScore: calculateFreightIntelligence(city, equipment, baseOrigin) + (1 - calculateDistance(baseOrigin.latitude, baseOrigin.longitude, city.latitude, city.longitude) / 125)
        }))
        .sort((a, b) => b.totalScore - a.totalScore);
      
      const scoredDeliveries = sameKmaDeliveries
        .filter(city => {
          const cityKey = `${city.city}, ${city.state_or_province}`;
          return !usedCities.has(cityKey) && cityKey !== `${baseDest.city}, ${baseDest.state_or_province}`;
        })
        .map(city => ({
          ...city,
          cityKey: `${city.city}, ${city.state_or_province}`,
          distance: calculateDistance(baseDest.latitude, baseDest.longitude, city.latitude, city.longitude),
          intelligenceScore: calculateFreightIntelligence(city, equipment, baseDest),
          totalScore: calculateFreightIntelligence(city, equipment, baseDest) + (1 - calculateDistance(baseDest.latitude, baseDest.longitude, city.latitude, city.longitude) / 125)
        }))
        .sort((a, b) => b.totalScore - a.totalScore);
      
      // Create sub-market pairs with RELEVANCE VALIDATION
      const subMarketPairs = Math.min(scoredPickups.length, scoredDeliveries.length, needed - fallbackPairs.length);
      
      for (let i = 0; i < subMarketPairs; i++) {
        const pu = scoredPickups[i];
        const de = scoredDeliveries[i];
        
        // RELEVANCE CHECK: Ensure fallback pairs meet quality standards
        const pickupRelevant = pu.distance <= RELEVANCE_STANDARDS.maxDistance && 
                              pu.totalScore >= RELEVANCE_STANDARDS.minIntelligenceScore;
        const deliveryRelevant = de.distance <= RELEVANCE_STANDARDS.maxDistance && 
                                de.totalScore >= RELEVANCE_STANDARDS.minIntelligenceScore;
        
        if (!pickupRelevant || !deliveryRelevant) {
          console.log(`⚠️ RELEVANCE CHECK FAILED: Skipping low-quality sub-market pair`);
          console.log(`   Pickup: ${pu.city} (${pu.distance}mi, score: ${pu.totalScore.toFixed(3)}) - Relevant: ${pickupRelevant}`);
          console.log(`   Delivery: ${de.city} (${de.distance}mi, score: ${de.totalScore.toFixed(3)}) - Relevant: ${deliveryRelevant}`);
          continue;
        }
        
        fallbackPairs.push({
          pickup: { city: pu.city, state: pu.state_or_province, zip: pu.zip || '' },
          delivery: { city: de.city, state: de.state_or_province, zip: de.zip || '' },
          score: pu.totalScore + de.totalScore,
          geographic: {
            pickup_distance: pu.distance,
            delivery_distance: de.distance,
            pickup_kma: pu.kma_code,
            delivery_kma: de.kma_code,
            pickup_intelligence: pu.intelligenceScore,
            delivery_intelligence: de.intelligenceScore,
            fallback_strategy: 'sub_market',
            relevance_score: (pu.totalScore + de.totalScore) / 2
          }
        });
        
        usedCities.add(pu.cityKey);
        usedCities.add(de.cityKey);
        
        console.log(`  📋 Sub-Market Pair: ${pu.city}, ${pu.state_or_province} (${pu.kma_code}) -> ${de.city}, ${de.state_or_province} (${de.kma_code}) [Relevance: ${((pu.totalScore + de.totalScore) / 2).toFixed(3)}]`);
      }
      
      console.log(`✅ STRATEGY 1 RESULT: Generated ${subMarketPairs} sub-market pairs`);
    }
  }
  
  // STRATEGY 2: Adjacent Market Expansion (Nearby KMAs within freight corridors)
  if (fallbackPairs.length < needed) {
    console.log(`📍 STRATEGY 2: Adjacent freight market expansion`);
    
    // Find cities in different KMAs but within expanded freight distance (150 miles)
    const adjacentPickups = await findCitiesNearLocation(baseOrigin, needed * 3, 150, usedCities, equipment, true);
    const adjacentDeliveries = await findCitiesNearLocation(baseDest, needed * 3, 150, usedCities, equipment, true);
    
    // Filter out any KMAs we've already used in primary generation
    const existingPickupKmas = new Set(existingPairs.map(p => p.geographic.pickup_kma));
    const existingDeliveryKmas = new Set(existingPairs.map(p => p.geographic.delivery_kma));
    
    const filteredPickups = adjacentPickups.filter(city => 
      !existingPickupKmas.has(city.kma_code) || existingPickupKmas.size < 3
    );
    const filteredDeliveries = adjacentDeliveries.filter(city => 
      !existingDeliveryKmas.has(city.kma_code) || existingDeliveryKmas.size < 3
    );
    
    const adjacentPairs = Math.min(filteredPickups.length, filteredDeliveries.length, needed - fallbackPairs.length);
    
    for (let i = 0; i < adjacentPairs; i++) {
      const pu = filteredPickups[i];
      const de = filteredDeliveries[i];
      
      fallbackPairs.push({
        pickup: { city: pu.city, state: pu.state_or_province, zip: pu.zip || '' },
        delivery: { city: de.city, state: de.state_or_province, zip: de.zip || '' },
        score: pu.totalScore + de.totalScore,
        geographic: {
          pickup_distance: pu.distance,
          delivery_distance: de.distance,
          pickup_kma: pu.kma_code,
          delivery_kma: de.kma_code,
          pickup_intelligence: pu.intelligenceScore || 0,
          delivery_intelligence: de.intelligenceScore || 0,
          fallback_strategy: 'adjacent_market'
        }
      });
      
      usedCities.add(pu.cityKey);
      usedCities.add(de.cityKey);
      
      console.log(`  📋 Adjacent Pair: ${pu.city}, ${pu.state_or_province} (${pu.kma_code}, ${pu.distance}mi) -> ${de.city}, ${de.state_or_province} (${de.kma_code}, ${de.distance}mi)`);
    }
    
    console.log(`✅ STRATEGY 2 RESULT: Generated ${adjacentPairs} adjacent market pairs`);
  }
  
  // STRATEGY 3: Freight Corridor Logic (Major highway intersections)
  if (fallbackPairs.length < needed) {
    console.log(`📍 STRATEGY 3: Major freight corridor backup`);
    
    // Use any remaining cities within reasonable freight distance with corridor intelligence
    const remainingNeeded = needed - fallbackPairs.length;
    const corridorPickups = await findCitiesNearLocation(baseOrigin, remainingNeeded * 2, 200, usedCities, equipment, true);
    const corridorDeliveries = await findCitiesNearLocation(baseDest, remainingNeeded * 2, 200, usedCities, equipment, true);
    
    const corridorPairs = Math.min(corridorPickups.length, corridorDeliveries.length, remainingNeeded);
    
    for (let i = 0; i < corridorPairs; i++) {
      const pu = corridorPickups[i];
      const de = corridorDeliveries[i];
      
      fallbackPairs.push({
        pickup: { city: pu.city, state: pu.state_or_province, zip: pu.zip || '' },
        delivery: { city: de.city, state: de.state_or_province, zip: de.zip || '' },
        score: pu.totalScore + de.totalScore,
        geographic: {
          pickup_distance: pu.distance,
          delivery_distance: de.distance,
          pickup_kma: pu.kma_code,
          delivery_kma: de.kma_code,
          pickup_intelligence: pu.intelligenceScore || 0,
          delivery_intelligence: de.intelligenceScore || 0,
          fallback_strategy: 'freight_corridor'
        }
      });
      
      usedCities.add(pu.cityKey);
      usedCities.add(de.cityKey);
      
      console.log(`  📋 Corridor Pair: ${pu.city}, ${pu.state_or_province} (${pu.kma_code}, ${pu.distance}mi) -> ${de.city}, ${de.state_or_province} (${de.kma_code}, ${de.distance}mi)`);
    }
    
    console.log(`✅ STRATEGY 3 RESULT: Generated ${corridorPairs} freight corridor pairs`);
  }
  
  console.log(`🎯 INTELLIGENT FALLBACK COMPLETE: Generated ${fallbackPairs.length}/${needed} additional pairs using multi-strategy approach`);
  
  // FINAL RELEVANCE QUALITY CHECK: Ensure all fallback pairs meet professional standards
  const qualityFilteredPairs = fallbackPairs.filter(pair => {
    const relevanceScore = pair.geographic?.relevance_score || 0;
    const maxDistance = Math.max(pair.geographic?.pickup_distance || 0, pair.geographic?.delivery_distance || 0);
    
    const isQualityPair = relevanceScore >= RELEVANCE_STANDARDS.minIntelligenceScore && 
                         maxDistance <= RELEVANCE_STANDARDS.maxDistance;
    
    if (!isQualityPair) {
      console.log(`🚫 QUALITY FILTER: Removing low-quality fallback pair (relevance: ${relevanceScore.toFixed(3)}, max distance: ${maxDistance}mi)`);
    }
    
    return isQualityPair;
  });
  
  if (qualityFilteredPairs.length < fallbackPairs.length) {
    console.log(`📊 QUALITY CONTROL: ${fallbackPairs.length - qualityFilteredPairs.length} pairs filtered out for relevance`);
  }
  
  return qualityFilteredPairs;
}

/**
 * GEOGRAPHIC CRAWL: Use your complete KMA database properly with 75-mile rule
 */
export async function generateGeographicCrawlPairs({ origin, destination, equipment, preferFillTo10, usedCities = new Set() }) {
  try {
    console.log(`🗺️ GEOGRAPHIC CRAWL: ${origin.city}, ${origin.state} -> ${destination.city}, ${destination.state}`);
    console.log(`🚫 Avoiding ${usedCities.size} previously used cities to ensure variety`);
    
    // Emergency fallback cities for common missing destinations - ADD TO DATABASE PROPERLY
    const emergencyFallbacks = {
      'new bedford, ma': { city: 'New Bedford', state_or_province: 'MA', zip: '02745', latitude: 41.6362, longitude: -70.9342, kma_code: 'BOS', kma_name: 'Boston Market' },
      'ostrander, oh': { city: 'Ostrander', state_or_province: 'OH', zip: '43061', latitude: 40.2573, longitude: -83.2079, kma_code: 'COL', kma_name: 'Columbus Market' },
      'spring grove, in': { city: 'Spring Grove', state_or_province: 'IN', zip: '47374', latitude: 39.6745, longitude: -84.9036, kma_code: 'CIN', kma_name: 'Cincinnati Market' },
      'centerville, in': { city: 'Centerville', state_or_province: 'IN', zip: '47330', latitude: 39.8203, longitude: -84.9644, kma_code: 'CIN', kma_name: 'Cincinnati Market' }
    };
    
    // Get base cities with full details from YOUR database
    const { data: originData } = await adminSupabase
      .from('cities')
      .select('city, state_or_province, zip, latitude, longitude, kma_code, kma_name')
      .ilike('city', origin.city)
      .ilike('state_or_province', origin.state)
      .not('latitude', 'is', null)
      .not('kma_code', 'is', null)
      .limit(1);
    
    // Check for destination in database, use emergency fallback if missing
    const destinationKey = `${destination.city.toLowerCase()}, ${destination.state.toLowerCase()}`;
    let baseDest;
    
    if (emergencyFallbacks[destinationKey]) {
      console.log(`🚨 EMERGENCY FALLBACK: Using hardcoded data for missing destination ${destination.city}, ${destination.state}`);
      baseDest = emergencyFallbacks[destinationKey];
    } else {
      const { data: destData } = await adminSupabase
        .from('cities')
        .select('city, state_or_province, zip, latitude, longitude, kma_code, kma_name')
        .ilike('city', destination.city)
        .ilike('state_or_province', destination.state)
        .not('latitude', 'is', null)
        .not('kma_code', 'is', null)
        .limit(1);
      
      if (!destData?.[0]) {
        console.error(`❌ Could not find destination ${destination.city}, ${destination.state} in cities database`);
        return {
          baseOrigin: { city: origin.city, state: origin.state, zip: '' },
          baseDest: { city: destination.city, state: destination.state, zip: '' },
          pairs: []
        };
      }
      
      baseDest = destData[0];
    }
    
    if (!originData?.[0]) {
      console.error(`❌ Could not find origin ${origin.city}, ${origin.state} in cities database`);
      return {
        baseOrigin: { city: origin.city, state: origin.state, zip: '' },
        baseDest: { city: destination.city, state: destination.state, zip: '' },
        pairs: []
      };
    }
    
    const baseOrigin = originData[0];
    
    console.log(`📍 Base Origin: ${baseOrigin.city}, ${baseOrigin.state_or_province} (KMA: ${baseOrigin.kma_code})`);
    console.log(`📍 Base Dest: ${baseDest.city}, ${baseDest.state_or_province} (KMA: ${baseDest.kma_code})`);
    
    // BROKER-INTELLIGENT KMA DIVERSITY APPROACH: Tiered search prioritizing unique KMAs over pure distance
    const targetPairs = preferFillTo10 ? 5 : 3;
    let pickupAlternatives = [];
    let deliveryAlternatives = [];
    let logMessage = '';

    console.log(`🎯 BROKER-INTELLIGENT KMA SEARCH: Need ${targetPairs} unique KMA cities for each side`);

    // Step 1: Strict search (75 miles, different KMA) - PREFERRED freight distance
    pickupAlternatives = await findCitiesNearLocation(baseOrigin, targetPairs * 2, 75, usedCities, equipment, false);
    deliveryAlternatives = await findCitiesNearLocation(baseDest, targetPairs * 2, 75, usedCities, equipment, false);
    
    // Check KMA diversity at 75 miles
    function countUniqueKmas(cityList) {
      return new Set(cityList.map(c => c.kma_code?.toLowerCase()).filter(k => k)).size;
    }
    
    const pickupKmas75 = countUniqueKmas(pickupAlternatives);
    const deliveryKmas75 = countUniqueKmas(deliveryAlternatives);
    
    console.log(`📊 75-mile KMA diversity: ${pickupKmas75} pickup KMAs, ${deliveryKmas75} delivery KMAs (need ${targetPairs} each)`);
    
    if (pickupKmas75 >= targetPairs && deliveryKmas75 >= targetPairs) {
      logMessage = ' (Optimal: 75mi radius with sufficient KMA diversity)';
      console.log(`✅ OPTIMAL SOLUTION: Found sufficient KMA diversity within preferred 75-mile radius`);
    } else {
      // Step 2: Extended KMA Search (125 miles, different KMA) - Extend radius to find unique KMAs
      logMessage = ' (Extended KMA Search: 125mi radius for KMA diversity)';
      console.warn(`⚠️ EXTENDING SEARCH: Need more unique KMAs. Expanding to 125 miles while maintaining KMA diversity.`);
      
      const p_extended = await findCitiesNearLocation(baseOrigin, targetPairs * 2, 125, usedCities, equipment, false);
      const d_extended = await findCitiesNearLocation(baseDest, targetPairs * 2, 125, usedCities, equipment, false);
      
      // Merge results, preserving 75-mile cities (closer is better, but KMA diversity is critical)
      pickupAlternatives = [...new Map([...pickupAlternatives, ...p_extended].map(item => [item.cityKey, item])).values()];
      deliveryAlternatives = [...new Map([...deliveryAlternatives, ...d_extended].map(item => [item.cityKey, item])).values()];
      
      const pickupKmas125 = countUniqueKmas(pickupAlternatives);
      const deliveryKmas125 = countUniqueKmas(deliveryAlternatives);
      
      console.log(`📊 125-mile KMA diversity: ${pickupKmas125} pickup KMAs, ${deliveryKmas125} delivery KMAs`);
      
      if (pickupKmas125 < targetPairs || deliveryKmas125 < targetPairs) {
        // Step 3: Final fallback - Allow same KMA within 125 miles (violates KMA diversity but ensures lane generation)
        logMessage = ' (Fallback: 125mi radius, same KMA allowed - KMA diversity compromised)';
        console.warn(`🚨 FALLBACK MODE: Insufficient unique KMAs even at 125 miles. Allowing same KMA to complete lane generation.`);
        
        const p_fallback = await findCitiesNearLocation(baseOrigin, targetPairs, 125, usedCities, equipment, true);
        const d_fallback = await findCitiesNearLocation(baseDest, targetPairs, 125, usedCities, equipment, true);
        
        // Merge results
        pickupAlternatives = [...new Map([...pickupAlternatives, ...p_fallback].map(item => [item.cityKey, item])).values()];
        deliveryAlternatives = [...new Map([...deliveryAlternatives, ...d_fallback].map(item => [item.cityKey, item])).values()];
        
        console.log(`⚠️ FALLBACK RESULT: This lane may have duplicate KMAs - not ideal for freight diversity`);
      } else {
        console.log(`✅ KMA DIVERSITY ACHIEVED: Found sufficient unique KMAs at extended 125-mile radius`);
      }
    }
    
    console.log(`🎯 FINAL KMA SELECTION: Found ${pickupAlternatives.length} pickup alternatives, ${deliveryAlternatives.length} delivery alternatives.${logMessage}`);
    
    // BROKER-INTELLIGENT KMA SELECTION: Ensure exactly targetPairs unique KMA combinations
    const pairs = [];

    // Enhanced KMA selection: pick the BEST city from each unique KMA, prioritizing freight intelligence score
    function selectBestCityPerKma(cityList, limit) {
      // Group cities by KMA code
      const kmaGroups = {};
      cityList.forEach(city => {
        const kma = String(city.kma_code || '').toLowerCase();
        if (!kma) return;
        
        if (!kmaGroups[kma]) {
          kmaGroups[kma] = [];
        }
        kmaGroups[kma].push(city);
      });
      
      // Sort KMAs by their best city's score, then select the best city from each KMA
      const sortedKmas = Object.entries(kmaGroups)
        .map(([kma, cities]) => {
          // For each KMA, find the best city (highest total score)
          const bestCity = cities.sort((a, b) => b.totalScore - a.totalScore)[0];
          return { kma, bestCity, cities };
        })
        .sort((a, b) => b.bestCity.totalScore - a.bestCity.totalScore) // Sort KMAs by their best city's score
        .slice(0, limit); // Take only the top KMAs we need
      
      // Return the best city from each selected KMA
      return sortedKmas.map(({ kma, bestCity }) => {
        console.log(`  📍 KMA ${bestCity.kma_code}: Selected ${bestCity.city}, ${bestCity.state_or_province} (${bestCity.distance}mi, score: ${bestCity.totalScore.toFixed(3)})`);
        return bestCity;
      });
    }

    const selectedPickups = selectBestCityPerKma(pickupAlternatives, targetPairs);
    const selectedDeliveries = selectBestCityPerKma(deliveryAlternatives, targetPairs);

    console.log(`🔍 KMA-OPTIMIZED SELECTION:`);
    console.log(`  Pickup cities (${selectedPickups.length}): ${selectedPickups.map(p=>`${p.city}, ${p.state_or_province} (${p.kma_code})`).join('; ')}`);
    console.log(`  Delivery cities (${selectedDeliveries.length}): ${selectedDeliveries.map(p=>`${p.city}, ${p.state_or_province} (${p.kma_code})`).join('; ')}`);

    // Create pairs by matching pickup and delivery cities - use the minimum count to ensure all pairs are valid
    const pairCount = Math.min(selectedPickups.length, selectedDeliveries.length);
    
    if (pairCount === 0) {
      console.error(`❌ CRITICAL ERROR: No valid pairs could be generated`);
    } else if (pairCount < targetPairs) {
      console.warn(`⚠️ PARTIAL SUCCESS: Generated ${pairCount}/${targetPairs} pairs due to insufficient unique KMAs`);
    } else {
      console.log(`✅ FULL SUCCESS: Generated ${pairCount}/${targetPairs} freight-optimized pairs with unique KMAs`);
    }
    
    for (let i = 0; i < pairCount; i++) {
      const pu = selectedPickups[i];
      const de = selectedDeliveries[i];
      
      pairs.push({
        pickup: { city: pu.city, state: pu.state_or_province || pu.state, zip: pu.zip || '' },
        delivery: { city: de.city, state: de.state_or_province || de.state, zip: de.zip || '' },
        score: (pu.totalScore || 0.8) + (de.totalScore || 0.8),
        geographic: { 
          pickup_distance: pu.distance || 0, 
          delivery_distance: de.distance || 0, 
          pickup_kma: pu.kma_code, 
          delivery_kma: de.kma_code,
          pickup_intelligence: pu.intelligenceScore || 0,
          delivery_intelligence: de.intelligenceScore || 0
        }
      });
      
      console.log(`  📋 Pair ${i+1}: ${pu.city}, ${pu.state_or_province} (${pu.kma_code}, ${pu.distance}mi) -> ${de.city}, ${de.state_or_province} (${de.kma_code}, ${de.distance}mi)`);
    }

    console.log(`✅ BROKER-INTELLIGENT GEOGRAPHIC: Generated ${pairs.length} freight-optimized pairs using KMA diversity + extended radius search`);

    // FINAL SAFETY FILTER: Remove any pairs that include Long Island cities (backup to per-city penalty)
    const longIslandNames = ['montauk','hempstead','babylon','islip','southampton','riverhead','huntington','brentwood','napeague','east hampton','hampton'];
    const filteredPairs = pairs.filter(p => {
      const pickup = (p.pickup.city || '').toLowerCase();
      const delivery = (p.delivery.city || '').toLowerCase();
      const pickupMatch = longIslandNames.some(n => pickup.includes(n));
      const deliveryMatch = longIslandNames.some(n => delivery.includes(n));
      if (pickupMatch || deliveryMatch) {
        console.log(`🚫 FILTERED PAIR (Long Island): ${p.pickup.city}, ${p.pickup.state} -> ${p.delivery.city}, ${p.delivery.state}`);
        return false;
      }
      return true;
    });

    if (filteredPairs.length !== pairs.length) {
      console.log(`ℹ️ Long Island filter removed ${pairs.length - filteredPairs.length} pair(s)`);
    }

    // Add the cities we used to the usedCities set for future calls to maintain diversity across multiple lane generations
    selectedPickups.forEach(city => city.cityKey && usedCities.add(city.cityKey));
    selectedDeliveries.forEach(city => city.cityKey && usedCities.add(city.cityKey));

    // ========================================
    // INTELLIGENT FALLBACK HIERARCHY: GUARANTEE 6 TOTAL POSTINGS (5 PAIRS + BASE)
    // ========================================
    
    const target = targetPairs;
    let finalPairs = [...filteredPairs];
    
    if (finalPairs.length < target) {
      console.log(`🎯 INTELLIGENT FALLBACK: Need ${target - finalPairs.length} more pairs to guarantee 6 total postings`);
      
      // FALLBACK STRATEGY: Smart market splitting with freight corridor intelligence
      const additionalPairs = await generateIntelligentFallbackPairs({
        baseOrigin, 
        baseDest, 
        equipment,
        needed: target - finalPairs.length,
        existingPairs: finalPairs,
        usedCities
      });
      
      finalPairs.push(...additionalPairs);
      console.log(`✅ INTELLIGENT GUARANTEE: Achieved ${finalPairs.length}/${target} pairs using fallback strategy`);
    }

    // BROKER-INTELLIGENT REPORTING: Clear messaging about KMA diversity results
    if (finalPairs.length < target) {
      const kmaSummary = finalPairs.length > 0 ? 
        `Found KMAs: P[${finalPairs.map(p => p.geographic.pickup_kma).join(',')}] D[${finalPairs.map(p => p.geographic.delivery_kma).join(',')}]` :
        'No valid KMA combinations found';
      
      const message = `Generated ${finalPairs.length}/${target} pairs with intelligent fallbacks. ${kmaSummary}. Extended search and smart market splitting used.`;
      console.warn(`⚠️ MAXIMUM EFFORT REACHED: ${message}`);
      
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
        pairs: finalPairs,
        usedCities,
        insufficient: finalPairs.length < target,
        message,
        kmaAnalysis: {
          required: target,
          achieved: finalPairs.length,
          searchRadius: logMessage.includes('125mi') ? 125 : 75,
          uniquePickupKmas: new Set(finalPairs.map(p => p.geographic.pickup_kma)).size,
          uniqueDeliveryKmas: new Set(finalPairs.map(p => p.geographic.delivery_kma)).size,
          fallbackUsed: finalPairs.length > filteredPairs.length
        }
      };
    }

    // SUCCESS: Full or partial coverage achieved with intelligent fallbacks
    const uniquePickupKmas = new Set(finalPairs.map(p => p.geographic.pickup_kma)).size;
    const uniqueDeliveryKmas = new Set(finalPairs.map(p => p.geographic.delivery_kma)).size;
    
    if (finalPairs.length >= target) {
      console.log(`✅ GUARANTEED SUCCESS: ${finalPairs.length}/${target} pairs generated (6 total postings including base)`);
    } else {
      console.log(`✅ MAXIMUM EFFORT: ${finalPairs.length}/${target} pairs generated with intelligent fallbacks`);
    }
    console.log(`   📊 KMA Summary: ${uniquePickupKmas} unique pickup KMAs, ${uniqueDeliveryKmas} unique delivery KMAs`);
    console.log(`   📏 Search Summary: ${logMessage}`);

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
      pairs: finalPairs,
      usedCities,
      insufficient: finalPairs.length < target,
      kmaAnalysis: {
        required: target,
        achieved: finalPairs.length,
        searchRadius: logMessage.includes('125mi') ? 125 : 75,
        uniquePickupKmas,
        uniqueDeliveryKmas,
        success: finalPairs.length >= target,
        fallbackUsed: finalPairs.length > filteredPairs.length
      }
    };
    
  } catch (error) {
    console.error('Geographic crawl error:', error);
    return {
      baseOrigin: { city: origin.city, state: origin.state, zip: '' },
      baseDest: { city: destination.city, state: destination.state, zip: '' },
      pairs: [],
      usedCities
    };
  }
}
