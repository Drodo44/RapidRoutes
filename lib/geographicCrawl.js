/**
 * Find cities within a radius using Supabase/PostGIS earth_distance
 * @param {number} lat
 * @param {number} lng
 * @param {number} radiusMiles
import fetch from 'node-fetch';
import { adminSupabase } from '../utils/supabaseClient.js';
import { calculateDistance } from './distanceCalculator.js';

const HERE_API_KEY = process.env.HERE_API_KEY;
const TARGET_UNIQUE_KMAS_PER_SIDE = 6;

// Track inserted cities count
let newCitiesInserted = 0;

/**
 * Query Supabase for cities within radius
 */
export async function getSupabaseCitiesWithinRadius(lat, lng, radiusMiles) {
  try {
    const { data, error } = await adminSupabase.rpc('find_cities_within_radius', {
      lat_input: lat,
      lng_input: lng,
      radius_miles: radiusMiles
    });
    if (error) {
      console.error('Supabase radius query error:', error.message);
      return [];
    }
    return data || [];
  } catch (err) {
    console.error('Supabase radius query failed:', err.message);
    return [];
  }
}

/**
 * Query HERE.com for a city
 */
async function queryHereCities(city, state) {
  if (!HERE_API_KEY) return [];
  const query = `${city}, ${state}, USA`;
  const url = `https://geocode.search.hereapi.com/v1/geocode?q=${encodeURIComponent(query)}&apikey=${HERE_API_KEY}&limit=10`;
  const res = await fetch(url);
  if (!res.ok) return [];
  const data = await res.json();
  return (data.items || []).map(item => ({
    city: item.address?.city,
    state_or_province: item.address?.stateCode || item.address?.state,
    latitude: item.position?.lat,
    longitude: item.position?.lng
  }));
}

/**
 * Ensure base city exists in Supabase; if missing, fetch from HERE and insert
 */
async function ensureBaseCity(city, state, label) {
  const { data } = await adminSupabase
    .from('cities')
    .select('city, state_or_province, latitude, longitude, kma_code')
    .eq('city', city)
    .eq('state_or_province', state)
    .limit(1);

  if (data && data.length > 0) return data[0];

  console.warn(`[${label}] ${city}, ${state} not found in Supabase. Querying HERE.com...`);
  const hereCities = await queryHereCities(city, state);
  if (!hereCities.length) return null;

  const hereCity = hereCities[0];

  // Assign nearest KMA from Supabase
  const { data: kmaCities } = await adminSupabase
    .from('cities')
    .select('kma_code, latitude, longitude')
    .not('kma_code', 'is', null)
    .limit(500);

  let nearestKma = null, minDist = Infinity;
  for (const k of kmaCities || []) {
    const d = calculateDistance(hereCity.latitude, hereCity.longitude, k.latitude, k.longitude);
    if (d < minDist) {
      minDist = d;
      nearestKma = k.kma_code;
    }
  }
  hereCity.kma_code = nearestKma;

  await adminSupabase.from('cities').insert({
    city: hereCity.city,
    state_or_province: hereCity.state_or_province,
    latitude: hereCity.latitude,
    longitude: hereCity.longitude,
    kma_code: nearestKma,
    here_verified: true,
    discovered_by: 'here_fallback',
    discovery_date: new Date().toISOString()
  });

  newCitiesInserted++;
  console.log(`[${label}] Inserted missing city ${hereCity.city}, ${hereCity.state_or_province} (KMA ${nearestKma})`);
  return hereCity;
}

/**
 * Generate geographic crawl pairs with Supabase-first, HERE fallback
 */
export async function generateGeographicCrawlPairs({ origin, destination }) {
  const MAX_RADIUS = 100;

  const baseOrigin = await ensureBaseCity(origin.city, origin.state, 'Origin');
  const baseDest = await ensureBaseCity(destination.city, destination.state, 'Destination');
  if (!baseOrigin || !baseDest) return { pairs: [], debug: { error: 'Base city not found' } };

  const originCities = await getSupabaseCitiesWithinRadius(baseOrigin.latitude, baseOrigin.longitude, MAX_RADIUS);
  const destCities = await getSupabaseCitiesWithinRadius(baseDest.latitude, baseDest.longitude, MAX_RADIUS);

  const pickupUnique = {};
  const deliveryUnique = {};

  for (const c of originCities) {
    if (c.kma_code && !pickupUnique[c.kma_code]) pickupUnique[c.kma_code] = c;
  }
  for (const c of destCities) {
    if (c.kma_code && !deliveryUnique[c.kma_code]) deliveryUnique[c.kma_code] = c;
  }

  const uniquePickups = Object.values(pickupUnique);
  const uniqueDeliveries = Object.values(deliveryUnique);

  if (uniquePickups.length < TARGET_UNIQUE_KMAS_PER_SIDE ||
      uniqueDeliveries.length < TARGET_UNIQUE_KMAS_PER_SIDE) {
    console.warn('❌ Not enough KMA diversity after enrichment');
    return { pairs: [], debug: { pickup: uniquePickups.length, delivery: uniqueDeliveries.length } };
  }

  const pairs = [];
  for (let i = 0; i < Math.min(uniquePickups.length, uniqueDeliveries.length); i++) {
    if (pairs.length >= 9) break; // aim for 9, not just 6
    pairs.push({ pickup: uniquePickups[i], delivery: uniqueDeliveries[i] });
  }

  return { pairs, debug: { pickup: uniquePickups.length, delivery: uniqueDeliveries.length } };
}

/**
 * Final summary log after export
 */
process.on('beforeExit', () => {
  console.log(`✅ Export complete — ${newCitiesInserted} new cities inserted into Supabase this run.`);
});
    .trim();
  
  // Format query
  if (cleanState && cleanState.toLowerCase() !== 'undefined') {
    return `${cleanCity}, ${cleanState}, USA`;
  } else {
    return `${cleanCity}, USA`;
  }
}

/**
 * Get cities from HERE.com Discover API with comprehensive fallback and KMA enrichment
 */
async function getHereCitiesWithKmaEnrichment(baseCity, targetCount, maxDistanceMiles) {
  if (!HERE_API_KEY) {
    console.warn('⚠️ HERE.com API key not configured');
    return { cities: [], stats: { queries: 0, accepted: 0, rejected: 0 } };
  }

  const stats = { queries: 0, accepted: 0, rejected: 0 };
  let allHereCities = [];
  
  try {
    // Primary query: Full city, state format
    const primaryQuery = sanitizeHereQuery(baseCity.city, baseCity.state_or_province);
    console.log(`🌐 HERE.com Query 1: ${primaryQuery}`);
    
    let hereCities = await queryHereDiscoverAPI(primaryQuery, 100, stats);
    allHereCities = allHereCities.concat(hereCities);
    
    // If insufficient results, try city-only query
    if (hereCities.length < targetCount) {
      const cityOnlyQuery = sanitizeHereQuery(baseCity.city, null);
      console.log(`🌐 HERE.com Query 2 (fallback): ${cityOnlyQuery}`);
      
      const fallbackCities = await queryHereDiscoverAPI(cityOnlyQuery, 100, stats);
      allHereCities = allHereCities.concat(fallbackCities);
    }
    
    // If still insufficient, try nearby coordinate searches
    if (allHereCities.length < targetCount && baseCity.latitude && baseCity.longitude) {
      console.log(`🌐 HERE.com Query 3 (coordinate-based): Lat ${baseCity.latitude}, Lng ${baseCity.longitude}`);
      
      const coordCities = await queryHereNearbyCoordinates(baseCity.latitude, baseCity.longitude, 100, stats);
      allHereCities = allHereCities.concat(coordCities);
    }
    
    // Remove duplicates by city+state combination
    const uniqueCities = new Map();
    for (const city of allHereCities) {
      const key = `${city.city}_${city.state}`;
      if (!uniqueCities.has(key)) {
        uniqueCities.set(key, city);
      }
    }
    
    const deduplicatedCities = Array.from(uniqueCities.values());
    
    // Apply distance filtering AFTER fetching results
    const filteredCities = deduplicatedCities.filter(city => {
      const distance = calculateDistance(
        baseCity.latitude, baseCity.longitude,
        city.latitude, city.longitude
      );
      
      if (distance <= maxDistanceMiles) {
        stats.accepted++;
        return true;
      } else {
        stats.rejected++;
        return false;
      }
    });
    
    // Enrich with KMA assignments and save to database
    const enrichedCities = await enrichHereCitiesWithKMA(filteredCities);
    
    console.log(`📊 HERE.com Results: ${stats.queries} queries, ${filteredCities.length} cities within ${maxDistanceMiles}mi, ${stats.accepted} accepted, ${stats.rejected} rejected`);
    
    return { cities: enrichedCities, stats };
    
  } catch (error) {
    console.warn('⚠️ HERE.com enrichment failed:', error.message);
    return { cities: [], stats };
  }
}

/**
 * Query HERE.com Discover API with proper error handling
 */
async function queryHereDiscoverAPI(query, limit, stats) {
  try {
    stats.queries++;
    
    const encodedQuery = encodeURIComponent(query);
    const url = `https://discover.search.hereapi.com/v1/discover?q=${encodedQuery}&limit=${Math.min(limit, 100)}&apikey=${HERE_API_KEY}`;
    
    const response = await fetch(url);
    
    if (response.status === 429) {
      console.log('🕐 HERE.com rate limit, waiting 5 seconds...');
      await new Promise(resolve => setTimeout(resolve, 5000));
      return queryHereDiscoverAPI(query, limit, stats); // Retry
    }
    
    if (!response.ok) {
      console.error(`❌ HERE API error: ${response.status} ${response.statusText}`);
      return [];
    }
    
    const data = await response.json();
    
    if (!data.items || data.items.length === 0) {
      console.log(`📭 No results from HERE.com for: ${query}`);
      return [];
    }
    
    return data.items.map(item => ({
      city: item.address?.city || item.title?.split(',')[0] || 'Unknown',
      state: item.address?.stateCode || item.address?.state || null,
      latitude: item.position?.lat || 0,
      longitude: item.position?.lng || 0,
      zip: item.address?.postalCode || null,
      here_verified: true,
      here_confidence: 0.9,
      source: 'here_discover'
    }));
    
  } catch (error) {
    console.warn(`⚠️ HERE.com query failed for "${query}":`, error.message);
    return [];
  }
}

/**
 * Query HERE.com using coordinate-based search
 */
async function queryHereNearbyCoordinates(lat, lng, limit, stats) {
  try {
    stats.queries++;
    
    const url = `https://discover.search.hereapi.com/v1/discover?at=${lat},${lng}&limit=${Math.min(limit, 100)}&apikey=${HERE_API_KEY}`;
    
    const response = await fetch(url);
    
    if (response.status === 429) {
      console.log('🕐 HERE.com rate limit, waiting 5 seconds...');
      await new Promise(resolve => setTimeout(resolve, 5000));
      return queryHereNearbyCoordinates(lat, lng, limit, stats);
    }
    
    if (!response.ok) {
      console.error(`❌ HERE coordinate API error: ${response.status}`);
      return [];
    }
    
    const data = await response.json();
    
    if (!data.items || data.items.length === 0) {
      return [];
    }
    
    return data.items.map(item => ({
      city: item.address?.city || item.title?.split(',')[0] || 'Unknown',
      state: item.address?.stateCode || item.address?.state || null,
      latitude: item.position?.lat || 0,
      longitude: item.position?.lng || 0,
      zip: item.address?.postalCode || null,
      here_verified: true,
      here_confidence: 0.8,
      source: 'here_coordinates'
    }));
    
  } catch (error) {
    console.warn(`⚠️ HERE.com coordinate query failed:`, error.message);
    return [];
  }
}

/**
 * Enrich HERE cities with KMA assignments and save to database
 */
async function enrichHereCitiesWithKMA(hereCities) {
  const enrichedCities = [];
  
  for (const hereCity of hereCities) {
    try {
      // Find nearest KMA assignment
      let assignedKMA = null;
      let minDistance = Infinity;
      
      const { data: nearbyKMAs } = await adminSupabase
        .from('cities')
        .select('kma_code, kma_name, latitude, longitude')
        .not('kma_code', 'is', null)
        .limit(50);
        
      if (nearbyKMAs) {
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
      
      if (assignedKMA) {
        // Check if city already exists in database
        const { data: existing } = await adminSupabase
          .from('cities')
          .select('id, kma_code')
          .eq('city', hereCity.city)
          .eq('state_or_province', hereCity.state)
          .limit(1);
          
        if (!existing?.length) {
          // Save new city to database
          console.log(`💾 Saving HERE.com city: ${hereCity.city}, ${hereCity.state} → ${assignedKMA}`);
          await adminSupabase
            .from('cities')
            .insert({
              city: hereCity.city,
              state_or_province: hereCity.state,
              latitude: hereCity.latitude,
              longitude: hereCity.longitude,
              zip: hereCity.zip,
              kma_code: assignedKMA,
              here_verified: true,
              here_confidence: hereCity.here_confidence,
              discovered_by: 'here_api_enhanced_crawl',
              discovery_date: new Date().toISOString()
            });
        }
        
        // Add KMA to city object
        hereCity.kma_code = assignedKMA;
        enrichedCities.push(hereCity);
      }
      
    } catch (error) {
      console.warn(`⚠️ KMA enrichment failed for ${hereCity.city}:`, error.message);
    }
  }
  
  return enrichedCities;
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
  
  // Step 2: Enhanced HERE.com integration with comprehensive fallback
  let hereResult = { cities: [], stats: { queries: 0, accepted: 0, rejected: 0 } };
  if (supabaseKmas.size < TARGET_UNIQUE_KMAS_PER_SIDE) {
    console.log(`⚠️ Insufficient KMA diversity in Supabase (${supabaseKmas.size} < ${TARGET_UNIQUE_KMAS_PER_SIDE}), querying HERE.com`);
    hereResult = await getHereCitiesWithKmaEnrichment(baseCity, targetCount, maxDistanceMiles);
    console.log(`📊 HERE.com expansion completed: ${hereResult.cities.length} cities found, ${hereResult.stats.queries} queries executed, ${hereResult.stats.accepted} accepted, ${hereResult.stats.rejected} rejected`);
  } else {
    console.log(`✅ Sufficient KMA diversity found in Supabase, skipping HERE.com`);
  }
  
  const hereCities = hereResult.cities;

        
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

}

