// lib/geographicCrawl.js
// Smart radius crawl with HERE fallback
// Tries 75 → 100 → 125 miles to find ≥5 unique KMA pairs

import fetch from "node-fetch";
import { adminSupabase } from "../utils/supabaseClient.js";
import { calculateDistance } from "./distanceCalculator.js";

const HERE_API_KEY = process.env.HERE_API_KEY;
const MIN_PAIRS = 5;

// -------------------------
// Helpers
// -------------------------

function sanitizeHereQuery(city, state) {
  const cleanCity = (city || "").toString().replace(/undefined|null/gi, "").trim();
  const cleanState = (state || "").toString().replace(/undefined|null/gi, "").trim();
  return cleanState ? `${cleanCity}, ${cleanState}, USA` : `${cleanCity}, USA`;
}

async function queryHereCities(city, state) {
  if (!HERE_API_KEY) throw new Error("HERE_API_KEY not set");
  const query = sanitizeHereQuery(city, state);
  const url = `https://geocode.search.hereapi.com/v1/geocode?q=${encodeURIComponent(query)}&limit=10&apikey=${HERE_API_KEY}`;
  const response = await fetch(url);
  if (!response.ok) {
    console.error(`❌ HERE API error: ${response.status} ${response.statusText}`);
    return [];
  }
  const data = await response.json();
  return (data.items || []).map(item => ({
    city: item.address?.city || item.title?.split(",")[0] || "",
    state: item.address?.stateCode || item.address?.state || "",
    latitude: item.position?.lat,
    longitude: item.position?.lng,
    zip: item.address?.postalCode || null,
  }));
}

// Get Supabase cities within exactly 100 miles
async function getSupabaseCitiesWithin100Miles(lat, lng, label = "") {
  const radiusMeters = 100 * 1609.34; // 100 miles to meters
  const { data, error } = await adminSupabase.rpc("find_cities_within_radius", {
    lat_param: lat,
    lng_param: lng,
    radius_meters: radiusMeters,
  });

  if (error) {
    console.error(`[${label}] Supabase 100mi query error:`, error.message);
    return [];
  }

  const filtered = (data || []).filter(c => c.kma_code && c.latitude && c.longitude);
  console.log(`[${label}] Supabase 100mi: ${filtered.length} cities with KMAs`);
  return filtered;
}

// Get HERE cities within exactly 100 miles and assign KMAs
async function getHereCitiesWithin100Miles(lat, lng, label = "") {
  if (!HERE_API_KEY) {
    console.warn(`[${label}] HERE API key not available`);
    return [];
  }

  try {
    // HERE API doesn't have radius search, so we'll use a bounding box approximation
    // 100 miles ≈ 1.45 degrees at mid-latitudes
    const radiusDegrees = 1.45;
    const north = lat + radiusDegrees;
    const south = lat - radiusDegrees;
    const east = lng + radiusDegrees;
    const west = lng - radiusDegrees;

    const url = `https://browse.search.hereapi.com/v1/browse?in=bbox:${west},${south},${east},${north}&categories=city&limit=100&apikey=${HERE_API_KEY}`;
    const response = await fetch(url);
    
    if (!response.ok) {
      console.error(`[${label}] HERE API error: ${response.status} ${response.statusText}`);
      return [];
    }

    const data = await response.json();
    const hereCities = [];

    for (const item of (data.items || [])) {
      if (!item.position || !item.address) continue;
      
      const distance = calculateDistance(lat, lng, item.position.lat, item.position.lng);
      if (distance > 100) continue; // Filter to exactly 100 miles

      const hereCity = {
        city: item.address.city || item.title?.split(",")[0] || "",
        state_or_province: item.address.stateCode || item.address.state || "",
        latitude: item.position.lat,
        longitude: item.position.lng,
        zip: item.address.postalCode || null,
      };

      if (hereCity.city && hereCity.state_or_province) {
        // Assign nearest KMA from Supabase data
        const kmaCode = await findNearestKMA(hereCity.latitude, hereCity.longitude);
        if (kmaCode) {
          hereCity.kma_code = kmaCode;
          hereCities.push(hereCity);
        }
      }
    }

    console.log(`[${label}] HERE 100mi: ${hereCities.length} cities with assigned KMAs`);
    return hereCities;
  } catch (error) {
    console.error(`[${label}] HERE lookup failed:`, error.message);
    return [];
  }
}

// Find nearest KMA for a HERE city
async function findNearestKMA(lat, lng) {
  try {
    const { data: kmaCities } = await adminSupabase
      .from("cities")
      .select("kma_code, latitude, longitude")
      .not("kma_code", "is", null)
      .limit(1000);

    if (!kmaCities) return null;

    let nearestKma = null, minDist = Infinity;
    for (const kmaCity of kmaCities) {
      const d = calculateDistance(lat, lng, kmaCity.latitude, kmaCity.longitude);
      if (d < minDist) {
        minDist = d;
        nearestKma = kmaCity.kma_code;
      }
    }
    return nearestKma;
  } catch (error) {
    console.error('Error finding nearest KMA:', error.message);
    return null;
  }
}

// Merge and deduplicate cities from Supabase and HERE
function mergeAndDeduplicateCities(supabaseCities, hereCities) {
  const cityMap = new Map();
  
  // Add Supabase cities first (they have priority)
  for (const city of supabaseCities) {
    const key = `${city.city}_${city.state_or_province}`;
    cityMap.set(key, city);
  }
  
  // Add HERE cities only if not already present
  for (const city of hereCities) {
    const key = `${city.city}_${city.state_or_province}`;
    if (!cityMap.has(key)) {
      cityMap.set(key, city);
    }
  }
  
  return Array.from(cityMap.values());
}

// Deduplicate by KMA - keep one city per KMA
function deduplicateByKMA(cities) {
  const kmaMap = new Map();
  
  for (const city of cities) {
    if (!city.kma_code) continue;
    
    // Keep first city for each KMA (prioritizes higher activity cities if pre-sorted)
    if (!kmaMap.has(city.kma_code)) {
      kmaMap.set(city.kma_code, city);
    }
  }
  
  return Array.from(kmaMap.values());
}

// Rank pairings with freight intelligence
function rankPairingsWithFreightIntelligence(pickups, deliveries, equipment) {
  // Create all possible pickup-delivery pairs
  const allPairs = [];
  
  for (const pickup of pickups) {
    for (const delivery of deliveries) {
      if (pickup.kma_code !== delivery.kma_code) { // Don't pair same KMA
        const distance = calculateDistance(pickup.latitude, pickup.longitude, delivery.latitude, delivery.longitude);
        
        // Freight intelligence scoring
        const score = calculateFreightScore(pickup, delivery, distance, equipment);
        
        allPairs.push({
          pickup,
          delivery,
          distance,
          score
        });
      }
    }
  }
  
  // Sort by freight intelligence score (higher is better)
  allPairs.sort((a, b) => b.score - a.score);
  
  // Return all pairs (no artificial limits)
  console.log(`🎯 Ranked ${allPairs.length} pairs by freight intelligence`);
  return allPairs;
}

// Calculate freight intelligence score for a pickup-delivery pair
function calculateFreightScore(pickup, delivery, distance, equipment) {
  let score = 0;
  
  // Base score from distance (prefer medium distances)
  if (distance > 100 && distance < 800) {
    score += 10; // Sweet spot for freight
  } else if (distance > 50) {
    score += 5;
  }
  
  // Bonus for major freight KMAs (you could expand this list)
  const majorFreightKMAs = ['ATL', 'CHI', 'DAL', 'LAX', 'NYC', 'DEN', 'PHX', 'SEA'];
  if (majorFreightKMAs.includes(pickup.kma_code)) score += 5;
  if (majorFreightKMAs.includes(delivery.kma_code)) score += 5;
  
  // Equipment-specific bonuses
  if (equipment === 'V' && distance > 300) score += 3; // Dry van long haul
  if (equipment === 'R' && distance < 500) score += 3; // Reefer regional
  if (['F', 'FD'].includes(equipment) && distance > 200) score += 3; // Flatbed medium/long
  
  return score;
}

async function getCityCoords(city, state, label = "", zip = null) {
  // HERE-first strategy (per business rule): use HERE as primary if key is present
  if (HERE_API_KEY) {
    try {
      const hereResults = await queryHereCities(city, state);
      const hereCity = hereResults.find(c => c.city && c.state && c.latitude && c.longitude);
      if (hereCity) {
        // Map to nearest KMA using Supabase cities
        const { data: kmaCities } = await adminSupabase
          .from("cities")
          .select("kma_code, latitude, longitude")
          .not("kma_code", "is", null)
          .limit(1000);

        let nearestKma = null, minDist = Infinity;
        if (kmaCities) {
          for (const kmaCity of kmaCities) {
            const d = calculateDistance(hereCity.latitude, hereCity.longitude, kmaCity.latitude, kmaCity.longitude);
            if (d < minDist) {
              minDist = d;
              nearestKma = kmaCity.kma_code;
            }
          }
        }
        if (nearestKma) {
          hereCity.kma_code = nearestKma;
          // Upsert for future cache efficiency
          try {
            await adminSupabase.from("cities").upsert({
              city: hereCity.city,
              state_or_province: hereCity.state,
              latitude: hereCity.latitude,
              longitude: hereCity.longitude,
              zip: hereCity.zip,
              kma_code: nearestKma,
              here_verified: true,
              here_confidence: 0.9,
              discovered_by: "here_api_basecity",
              discovery_date: new Date().toISOString(),
            }, { onConflict: ["city", "state_or_province"] });
            console.log(`[GEOCRAWL] Inserted via HERE: ${hereCity.city}, ${hereCity.state}`);
          } catch (e) {
            console.warn('[GEOCRAWL] HERE upsert failed:', e.message);
          }
          return hereCity;
        }
      }
    } catch (e) {
      console.warn(`[GEOCRAWL] HERE lookup failed for ${label}:`, e.message);
    }
  }

  // Fallbacks (Supabase-driven) only if HERE unavailable or failed
  // 1) Exact city/state match
  try {
    const { data } = await adminSupabase
      .from("cities")
      .select("city, state_or_province, latitude, longitude, kma_code, zip")
      .eq("city", city)
      .eq("state_or_province", state)
      .not("latitude", "is", null)
      .not("kma_code", "is", null)
      .limit(1);
    if (data && data.length > 0) return data[0];
  } catch (e) {
    console.warn(`[GEOCRAWL] Supabase exact lookup failed for ${label}:`, e.message);
  }

  // 2) ZIP-based lookup if provided
  if (zip) {
    try {
      const { data: zipRows } = await adminSupabase
        .from("cities")
        .select("city, state_or_province, latitude, longitude, kma_code, zip")
        .eq("zip", String(zip))
        .not("latitude", "is", null)
        .not("kma_code", "is", null)
        .limit(1);
      if (zipRows && zipRows.length > 0) return zipRows[0];
    } catch (e) {
      console.warn(`[GEOCRAWL] ZIP lookup failed for ${label}:`, e.message);
    }
  }

  // 3) Fuzzy city match within same state (case-insensitive, prefix match)
  try {
    const cityPrefix = (city || '').split(/\s+/)[0];
    if (cityPrefix) {
      const { data: fuzzyRows } = await adminSupabase
        .from("cities")
        .select("city, state_or_province, latitude, longitude, kma_code, zip")
        .ilike("city", `${cityPrefix}%`)
        .eq("state_or_province", state)
        .not("latitude", "is", null)
        .not("kma_code", "is", null)
        .limit(5);
      if (fuzzyRows && fuzzyRows.length > 0) return fuzzyRows[0];
    }
  } catch (e) {
    console.warn(`[GEOCRAWL] Fuzzy lookup failed for ${label}:`, e.message);
  }

  // 4) Cross-state fuzzy (last resort)
  try {
    const cityPrefix = (city || '').split(/\s+/)[0];
    if (cityPrefix) {
      const { data: broadRows } = await adminSupabase
        .from("cities")
        .select("city, state_or_province, latitude, longitude, kma_code, zip")
        .ilike("city", `${cityPrefix}%`)
        .not("latitude", "is", null)
        .not("kma_code", "is", null)
        .limit(5);
      if (broadRows && broadRows.length > 0) return broadRows[0];
    }
  } catch (e) {
    console.warn(`[GEOCRAWL] Broad fuzzy lookup failed for ${label}:`, e.message);
  }

  console.error(`[GEOCRAWL] ${label} not found via HERE or Supabase: ${city}, ${state}${zip ? ` (${zip})` : ''}`);
  return null;
}

// -------------------------
// Main Function
// -------------------------

export async function generateGeographicCrawlPairs({ origin, destination, equipment }) {
  console.log(`🎯 INTELLIGENCE: Starting pairing for ${origin.city}, ${origin.state} → ${destination.city}, ${destination.state}`);
  
  try {
    // Step 1: Get base coordinates for origin and destination
    const baseOrigin = await getCityCoords(origin.city, origin.state, "Origin", origin.zip);
    if (!baseOrigin) throw new Error(`Origin not found: ${origin.city}, ${origin.state}`);

    const baseDest = await getCityCoords(destination.city, destination.state, "Destination", destination.zip);
    if (!baseDest) throw new Error(`Destination not found: ${destination.city}, ${destination.state}`);

    console.log(`🎯 Base coordinates found: Origin(${baseOrigin.latitude}, ${baseOrigin.longitude}) Dest(${baseDest.latitude}, ${baseDest.longitude})`);

    // Step 2: Start with Supabase cities within 100 miles
    const supabasePickups = await getSupabaseCitiesWithin100Miles(baseOrigin.latitude, baseOrigin.longitude, "Pickup");
    const supabaseDeliveries = await getSupabaseCitiesWithin100Miles(baseDest.latitude, baseDest.longitude, "Delivery");
    
    console.log(`🎯 Supabase found: ${supabasePickups.length} pickup cities, ${supabaseDeliveries.length} delivery cities`);

    // Step 3: Collect unique KMAs from Supabase results
    const allKMAs = new Set();
    supabasePickups.forEach(c => c.kma_code && allKMAs.add(c.kma_code));
    supabaseDeliveries.forEach(c => c.kma_code && allKMAs.add(c.kma_code));
    
    console.log(`🎯 Supabase unique KMAs: ${allKMAs.size}`);

    // Step 4: If fewer than 10 unique KMAs, call HERE API and merge results
    let allPickups = [...supabasePickups];
    let allDeliveries = [...supabaseDeliveries];
    
    if (allKMAs.size < 10) {
      console.log(`🎯 Need more KMAs (${allKMAs.size}/10), calling HERE API...`);
      
      const herePickups = await getHereCitiesWithin100Miles(baseOrigin.latitude, baseOrigin.longitude, "Pickup");
      const hereDeliveries = await getHereCitiesWithin100Miles(baseDest.latitude, baseDest.longitude, "Delivery");
      
      console.log(`🎯 HERE found: ${herePickups.length} pickup cities, ${hereDeliveries.length} delivery cities`);
      
      // Merge HERE results with Supabase results
      allPickups = mergeAndDeduplicateCities(supabasePickups, herePickups);
      allDeliveries = mergeAndDeduplicateCities(supabaseDeliveries, hereDeliveries);
      
      // Update KMA count after merge
      allKMAs.clear();
      allPickups.forEach(c => c.kma_code && allKMAs.add(c.kma_code));
      allDeliveries.forEach(c => c.kma_code && allKMAs.add(c.kma_code));
      
      console.log(`🎯 After HERE merge: ${allPickups.length} pickup cities, ${allDeliveries.length} delivery cities, ${allKMAs.size} unique KMAs`);
    }

    // Step 5: Guarantee at least 5 unique KMAs (failure not allowed)
    if (allKMAs.size < 5) {
      throw new Error('Intelligence system failed: fewer than 5 unique KMAs found within 100mi');
    }

    // Step 6: Create unique pickup/delivery lists by KMA (no duplicates)
    const uniquePickups = deduplicateByKMA(allPickups);
    const uniqueDeliveries = deduplicateByKMA(allDeliveries);
    
    console.log(`🎯 Deduplicated: ${uniquePickups.length} unique pickup KMAs, ${uniqueDeliveries.length} unique delivery KMAs`);

    // Step 7: Rank final pairings with freight intelligence
    const rankedPairs = rankPairingsWithFreightIntelligence(uniquePickups, uniqueDeliveries, equipment);
    
    console.log(`🎯 INTELLIGENCE: Generated ${rankedPairs.length} ranked pairs with ${allKMAs.size} unique KMAs`);

    return { 
      pairs: rankedPairs, 
      debug: { 
        supabase_pickups: supabasePickups.length,
        supabase_deliveries: supabaseDeliveries.length,
        total_pickups: allPickups.length,
        total_deliveries: allDeliveries.length,
        unique_kmas: allKMAs.size,
        final_pairs: rankedPairs.length,
        here_used: allKMAs.size >= 10 ? false : true
      } 
    };
  } catch (err) {
    console.error("❌ Error in generateGeographicCrawlPairs:", err.message);
    return { pairs: [], debug: { error: err.message } };
  }
}
