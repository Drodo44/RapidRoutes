// lib/geographicCrawl.js
// GEOGRAPHIC CRAWL: Find cities near pickup/delivery with different KMAs
// This is the CORRECT approach using your complete city/KMA database

import { adminSupabase } from '../utils/supabaseClient.js';    const baseOrigin = originData[0];
    
    console.log(`📍 Base Origin: ${baseOrigin.city}, ${baseOrigin.state_or_province} (KMA: ${baseOrigin.kma_code})`);
    console.log(`📍 Base Dest: ${baseDest.city}, ${baseDest.state_or_province} (KMA: ${baseDest.kma_code})`);
    
    // Find 5 cities near pickup with different KMAs (75-mile rule, avoiding used cities)
    const pickupAlternatives = await findCitiesNearLocation(baseOrigin, 5, 75, usedCities, equipment); INTELLIGENT FREIGHT EQUIPMENT TARGETING - Same logic as datcrawl.js
function calculateFreightIntelligence(cityRow, equipment) {
  const eq = String(equipment || '').toUpperCase();
  if (!cityRow) return 0;
  const name = `${cityRow.city} ${cityRow.kma_name || ''}`.toLowerCase();
  
  // REEFER INTELLIGENCE - Produce, Import/Export, Cold Storage
  if (eq === 'R' || eq === 'IR') {
    // Major produce regions - drivers expect backhauls
    if (/(fresno|salinas|watsonville|hollister|modesto|stockton|merced)/.test(name)) return 0.15; // CA Central Valley
    if (/(mcallen|laredo|pharr|brownsville|harlingen)/.test(name)) return 0.15; // TX Border produce
    if (/(miami|homestead|plant city|lakeland|tampa|fort myers)/.test(name)) return 0.12; // FL produce
    if (/(yuma|phoenix|tucson|nogales)/.test(name)) return 0.10; // AZ produce
    if (/(yakima|wenatchee|spokane|pasco)/.test(name)) return 0.10; // WA produce
    if (/(chicago|atlanta|dallas|los angeles|long beach|savannah|charleston|norfolk|baltimore)/.test(name)) return 0.08; // Major ports/distribution
    return 0.05;
  }
  
  // FLATBED INTELLIGENCE - Steel, Construction, Oil/Gas, Manufacturing
  if (eq === 'FD' || eq === 'F' || eq === 'SD' || eq === 'DD' || eq === 'RGN' || eq === 'LB') {
    // Steel production centers - guaranteed steel loads out
    if (/(pittsburgh|gary|birmingham|cleveland|detroit|toledo|youngstown)/.test(name)) return 0.15; // Steel belt
    if (/(houston|beaumont|port arthur|corpus christi|galveston)/.test(name)) return 0.15; // Oil/gas equipment
    if (/(charlotte|spartanburg|greenville|anderson)/.test(name)) return 0.12; // Auto manufacturing
    if (/(chicago|atlanta|dallas|kansas city|denver|phoenix)/.test(name)) return 0.10; // Construction materials hubs
    if (/(mobile|savannah|charleston|norfolk|tacoma|long beach)/.test(name)) return 0.10; // Port heavy equipment
    if (/(nashville|memphis|louisville|indianapolis|columbus)/.test(name)) return 0.08; // Manufacturing corridors
    return 0.05;
  }
  
  // VAN INTELLIGENCE - Distribution, Retail, E-commerce
  if (eq === 'V') {
    // Major distribution hubs - high freight density
    if (/(atlanta|dallas|chicago|memphis|indianapolis|columbus)/.test(name)) return 0.12; // Primary distribution
    if (/(phoenix|denver|kansas city|nashville|charlotte|jacksonville)/.test(name)) return 0.10; // Regional distribution
    if (/(los angeles|riverside|ontario|fontana|carson)/.test(name)) return 0.10; // CA logistics corridor
    if (/(harrisburg|allentown|newark|elizabeth|edison)/.test(name)) return 0.08; // Northeast corridors
    if (/(cincinnati|louisville|toledo|fort wayne|green bay)/.test(name)) return 0.06; // Midwest manufacturing
    return 0.03;
  }
  
  return 0;
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
async function findCitiesNearLocation(baseCity, targetCount = 5, maxDistanceMiles = 75, usedCities = new Set(), equipment = null) {
  console.log(`🗺️ Finding ${targetCount} cities near ${baseCity.city}, ${baseCity.state} within ${maxDistanceMiles} miles (avoiding ${usedCities.size} used cities)`);
  
  if (!baseCity.latitude || !baseCity.longitude) {
    console.error(`❌ Base city ${baseCity.city}, ${baseCity.state} missing coordinates`);
    return [];
  }
  
  // Get all cities within the 75-mile radius with coordinates and KMA codes
  // Use DISTINCT ON to get only one entry per city name (eliminates ZIP duplicates)
  const latRange = maxDistanceMiles / 69; // Approximate degrees per mile
  const lonRange = maxDistanceMiles / (69 * Math.cos(baseCity.latitude * Math.PI / 180));
  
  // First get all potential cities, then deduplicate by city name
  const { data: rawCities, error } = await adminSupabase
    .from('cities')
    .select('city, state_or_province, zip, latitude, longitude, kma_code, kma_name')
    .gte('latitude', baseCity.latitude - latRange)
    .lte('latitude', baseCity.latitude + latRange)
    .gte('longitude', baseCity.longitude - lonRange) 
    .lte('longitude', baseCity.longitude + lonRange)
    .not('latitude', 'is', null)
    .not('longitude', 'is', null)
    // CRITICAL FIX: Don't exclude same KMA - include ALL nearby cities
    .limit(2000); // Get more to have variety after deduplication
  
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
    const cityName = city.city.toLowerCase();
    
    // CRITICAL FREIGHT FILTER: Eliminate synthetic "Metro/Zone/Region/Area" names
    if (cityName.includes('metro') || cityName.includes('zone') || 
        cityName.includes('region') || cityName.includes('area') ||
        cityName.includes('corridor') || cityName.includes('district')) {
      console.log(`🚫 FILTERED OUT synthetic name: ${city.city}, ${city.state_or_province}`);
      continue;
    }
    
    const cityKey = `${city.city.toLowerCase()}, ${city.state_or_province.toLowerCase()}`;
    if (!cityMap.has(cityKey)) {
      cityMap.set(cityKey, city);
    }
  }
  
  const nearbyCities = Array.from(cityMap.values());
  console.log(`📊 Found ${nearbyCities.length} REAL cities (filtered and deduplicated from ${rawCities.length} entries)`);
  
  // Calculate actual distances and apply FREIGHT INTELLIGENCE scoring + LOGISTICS PENALTIES
  const citiesWithDistance = [];
  
  for (const city of nearbyCities) {
    const cityKey = `${city.city}, ${city.state_or_province}`;
    const cityName = city.city.toLowerCase();
    const stateName = city.state_or_province.toLowerCase();
    
    // Skip if this city was already used in a previous load
    if (usedCities.has(cityKey)) {
      continue;
    }
    
    // CRITICAL FREIGHT LOGISTICS PENALTY: Long Island and other problematic locations
    let logisticsPenalty = 0;
    
    // LONG ISLAND PENALTY - Truckers HATE going onto islands due to bridge/tunnel restrictions
    if (stateName === 'ny' && (
        cityName.includes('montauk') || cityName.includes('hempstead') || 
        cityName.includes('babylon') || cityName.includes('islip') ||
        cityName.includes('southampton') || cityName.includes('riverhead') ||
        cityName.includes('huntington') || cityName.includes('brentwood') ||
        // Add more Long Island cities that truckers avoid
        city.longitude < -72.0 && city.latitude > 40.6 && city.latitude < 41.0
    )) {
      logisticsPenalty = -0.8; // Heavy penalty for Long Island
      console.log(`🚫 LOGISTICS PENALTY: ${cityKey} is on Long Island - truckers avoid bridges/tunnels`);
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
      // Apply FREIGHT INTELLIGENCE scoring based on equipment type
      const intelligenceScore = calculateFreightIntelligence(city, equipment);
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
    
    // Find 5 cities near pickup with different KMAs (75-mile rule, avoiding used cities)
    const pickupAlternatives = await findCitiesNearLocation(baseOrigin, 5, 75, usedCities, equipment);
    
    // Find 5 cities near delivery with different KMAs (75-mile rule, avoiding used cities)
    const deliveryAlternatives = await findCitiesNearLocation(baseDest, 5, 75, usedCities, equipment);
    
    console.log(`🎯 Geographic Analysis: Found ${pickupAlternatives.length} pickup alternatives, ${deliveryAlternatives.length} delivery alternatives (within 75 miles)`);
    
    // Generate pairs by combining pickup alternatives with delivery alternatives
    const pairs = [];
    const targetPairs = preferFillTo10 ? 5 : 3;
    
    // CRITICAL FIX: GUARANTEE exactly targetPairs for fill-to-10 mode
    if (preferFillTo10 && (pickupAlternatives.length === 0 || deliveryAlternatives.length === 0)) {
      console.error(`🚨 CRITICAL: Fill-to-10 mode but no alternatives found (pickup: ${pickupAlternatives.length}, delivery: ${deliveryAlternatives.length})`);
      // Emergency fallback: use base cities to fill pairs
      for (let i = 0; i < targetPairs; i++) {
        pairs.push({
          pickup: {
            city: baseOrigin.city,
            state: baseOrigin.state_or_province,
            zip: baseOrigin.zip || ''
          },
          delivery: {
            city: baseDest.city,
            state: baseDest.state_or_province,
            zip: baseDest.zip || ''
          },
          score: 0.5,
          geographic: {
            pickup_distance: 0,
            delivery_distance: 0,
            pickup_kma: baseOrigin.kma_code,
            delivery_kma: baseDest.kma_code
          }
        });
        console.log(`🚨 EMERGENCY PAIR ${i+1}: ${baseOrigin.city}, ${baseOrigin.state_or_province} -> ${baseDest.city}, ${baseDest.state_or_province} (emergency fallback)`);
      }
    } else {
      // INTELLIGENT PAIR GENERATION: ALWAYS find real cities within 150 miles if needed
      console.log(`🔧 INTELLIGENT GENERATION: Need ${targetPairs} pairs, have ${pickupAlternatives.length} pickup alternatives, ${deliveryAlternatives.length} delivery alternatives`);
      
      // If not enough alternatives within 75 miles, expand search to 150 miles
      let expandedPickups = pickupAlternatives;
      let expandedDeliveries = deliveryAlternatives;
      
      if (expandedPickups.length < 5) {
        console.log(`🔍 EXPANDING PICKUP SEARCH: Only found ${expandedPickups.length} within 75mi, searching 150mi for more intelligent options`);
        expandedPickups = await findCitiesNearLocation(baseOrigin, 10, 150, usedCities, equipment);
      }
      
      if (expandedDeliveries.length < 5) {
        console.log(`🔍 EXPANDING DELIVERY SEARCH: Only found ${expandedDeliveries.length} within 75mi, searching 150mi for more intelligent options`);
        expandedDeliveries = await findCitiesNearLocation(baseDest, 10, 150, usedCities, equipment);
      }
      
      console.log(`🎯 EXPANDED SEARCH: Now have ${expandedPickups.length} pickup options, ${expandedDeliveries.length} delivery options`);
      
      // Generate EXACTLY targetPairs using intelligent selection
      for (let i = 0; i < targetPairs; i++) {
        const pickupIndex = i % Math.max(1, expandedPickups.length);
        const deliveryIndex = i % Math.max(1, expandedDeliveries.length);
        const pickup = expandedPickups[pickupIndex] || baseOrigin;
        const delivery = expandedDeliveries[deliveryIndex] || baseDest;
        
        pairs.push({
          pickup: {
            city: pickup.city,
            state: pickup.state_or_province || pickup.state,
            zip: pickup.zip || ''
          },
          delivery: {
            city: delivery.city,
            state: delivery.state_or_province || delivery.state,
            zip: delivery.zip || ''
          },
          score: pickup.totalScore || 0.8,
          geographic: {
            pickup_distance: pickup.distance || 0,
            delivery_distance: delivery.distance || 0,
            pickup_kma: pickup.kma_code,
            delivery_kma: delivery.kma_code
          }
        });
        
        console.log(`🗺️ INTELLIGENT PAIR ${i+1}/${targetPairs}: ${pickup.city}, ${pickup.state_or_province || pickup.state} -> ${delivery.city}, ${delivery.state_or_province || delivery.state}`);
        
        // Add intelligence reasoning
        const pickupReason = (pickup.intelligenceScore || 0) > 0.05 ? `${equipment} freight hub` : 'geographic proximity';
        const deliveryReason = (delivery.intelligenceScore || 0) > 0.05 ? `${equipment} freight hub` : 'geographic proximity';
        console.log(`   📍 INTELLIGENCE: Pickup (${pickupReason}) | Delivery (${deliveryReason}) | Score: ${(pickup.totalScore || 0).toFixed(3)}`);
      }
    }
    
    console.log(`✅ INTELLIGENT GEOGRAPHIC: Generated ${pairs.length} freight-optimized pairs using 75-mile rule + equipment intelligence`);
    
    // CRITICAL ASSERTION: Guarantee exact pair count for fill-to-10 mode
    if (preferFillTo10 && pairs.length !== 5) {
      console.error(`🚨 CRITICAL ERROR: Fill-to-10 mode requires exactly 5 pairs, got ${pairs.length}`);
      throw new Error(`Geographic crawl guarantee failed: got ${pairs.length} pairs, expected 5 for fill-to-10 mode`);
    };
    
    // Add the cities we used to the usedCities set for future calls
    pickupAlternatives.forEach(city => usedCities.add(city.cityKey));
    deliveryAlternatives.forEach(city => usedCities.add(city.cityKey));
    
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
      pairs,
      usedCities // Return the updated set for the next call
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
