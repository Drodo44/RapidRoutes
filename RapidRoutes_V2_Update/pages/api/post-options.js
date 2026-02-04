// pages/api/post-options.js
// Extended: supports two modes
// 1) Legacy single-lane option generation (input: { laneId }) returning nearby origin/destination city options
// 2) New enterprise batch lane ingestion (input: { lanes: [...] }) with chunked coordinate enrichment + insert
//    Returns structured { ok, counts: { total, success, failed }, failed: [...] }
// This preserves backward compatibility for existing UI while enabling scalable batch creation.
// Lazy-load admin client inside handler to allow catching init errors
import { resolveCoords } from "@/lib/resolve-coords";
import { z } from 'zod';
import { MAJOR_HUBS_BY_STATE } from "../../utils/freightHubs";

// Helper to normalize state names to 2-letter codes
const normalizeStateCode = (state) => {
  if (!state) return '';
  const s = String(state).trim().toUpperCase();
  if (s.length === 2) return s;
  
  const stateMap = {
    'ALABAMA': 'AL', 'ALASKA': 'AK', 'ARIZONA': 'AZ', 'ARKANSAS': 'AR', 'CALIFORNIA': 'CA',
    'COLORADO': 'CO', 'CONNECTICUT': 'CT', 'DELAWARE': 'DE', 'FLORIDA': 'FL', 'GEORGIA': 'GA',
    'HAWAII': 'HI', 'IDAHO': 'ID', 'ILLINOIS': 'IL', 'INDIANA': 'IN', 'IOWA': 'IA',
    'KANSAS': 'KS', 'KENTUCKY': 'KY', 'LOUISIANA': 'LA', 'MAINE': 'ME', 'MARYLAND': 'MD',
    'MASSACHUSETTS': 'MA', 'MICHIGAN': 'MI', 'MINNESOTA': 'MN', 'MISSISSIPPI': 'MS', 'MISSOURI': 'MO',
    'MONTANA': 'MT', 'NEBRASKA': 'NE', 'NEVADA': 'NV', 'NEW HAMPSHIRE': 'NH', 'NEW JERSEY': 'NJ',
    'NEW MEXICO': 'NM', 'NEW YORK': 'NY', 'NORTH CAROLINA': 'NC', 'NORTH DAKOTA': 'ND', 'OHIO': 'OH',
    'OKLAHOMA': 'OK', 'OREGON': 'OR', 'PENNSYLVANIA': 'PA', 'RHODE ISLAND': 'RI', 'SOUTH CAROLINA': 'SC',
    'SOUTH DAKOTA': 'SD', 'TENNESSEE': 'TN', 'TEXAS': 'TX', 'UTAH': 'UT', 'VERMONT': 'VT',
    'VIRGINIA': 'VA', 'WASHINGTON': 'WA', 'WEST VIRGINIA': 'WV', 'WISCONSIN': 'WI', 'WYOMING': 'WY',
    'DISTRICT OF COLUMBIA': 'DC'
  };
  return stateMap[s] || s.slice(0, 2);
};

// NOTE: Not using external p-limit dependency to avoid adding new package; implementing lightweight limiter inline.

// Cities rejected by DAT - blacklist these from generation (kept for backward compatibility)
// NOTE: Primary blacklist is now managed via database (blacklisted_cities table)
const LEGACY_BLACKLISTED_CITIES = new Set([
  'SHANNONDALE, WV',
  'BROWNSDALE, FL',
  'MOSKOEITE CORNER, CA',
  'NEW HOPE, OR',
  'EPHESUS, GA',
  'SOUTH ROSEMARY, NC',
  'RAINBOW LAKES ESTATES, FL',
  'BRIAR CHAPEL, NC',
  'COATS BEND, AL',
  'VILLAGE SHIRES, PA',
  'CHUMUCKLA, FL',
  'WHITFIELD, PA',
  'LINCOLN PARK, GA',
  'TUCKAHOE, VA',
  'AUCILLA, FL',
  'ENSLEY, FL',
  'FOREST HEIGHTS, TX',
  'SOUTHWEST CITY, MO',
  'TENKILLER, OK',
  'CEDAR VALLEY, OK',
  'CANYON LAKE, TX',
  'ROCKY MOUNTAIN, OK',
  'LORANE, PA',
  'SCENIC OAKS, TX',
  'GRANTLEY, PA'
]);

// Cache for database blacklist (refreshed on each request)
let dbBlacklistCache = new Set();
let lastBlacklistFetch = 0;
const BLACKLIST_CACHE_TTL = 60000; // 1 minute cache

// City name corrections for DAT compatibility
// NOTE: Primary corrections are now managed via database (city_corrections table)
const LEGACY_CITY_CORRECTIONS = {
  'REDWOOD, OR': 'Redmond, OR',
  'BELLWOOD, VA': 'Elkwood, VA',
  'DASHER, GA': 'Jasper, GA',
  'ENSLEY, FL': 'Ensley, AL',
  'SUNNY SIDE, GA': 'Sunnyside, GA'
};

// Cache for database corrections (refreshed periodically)
let dbCorrectionsCache = new Map();
let lastCorrectionsFetch = 0;
const CORRECTIONS_CACHE_TTL = 60000; // 1 minute cache

async function fetchDatabaseCorrections(supabase) {
  const now = Date.now();
  if (now - lastCorrectionsFetch < CORRECTIONS_CACHE_TTL) {
    return dbCorrectionsCache; // Return cached version
  }

  try {
    const { data, error } = await supabase
      .from('city_corrections')
      .select('incorrect_city, incorrect_state, correct_city, correct_state');

    if (!error && data) {
      const corrections = new Map();
      data.forEach(row => {
        const key = `${row.incorrect_city}, ${row.incorrect_state}`.toUpperCase();
        corrections.set(key, {
          city: row.correct_city,
          state: row.correct_state
        });
      });
      dbCorrectionsCache = corrections;
      lastCorrectionsFetch = now;
    }
  } catch (err) {
    console.error('Error fetching city corrections from database:', err);
  }

  return dbCorrectionsCache;
}

// Fetch major freight hubs for a specific state
async function fetchMajorHubsForState(supabase, stateInput) {
  const code = normalizeStateCode(stateInput);
  if (!code || !MAJOR_HUBS_BY_STATE[code]) return [];
  
  try {
    const hubNames = MAJOR_HUBS_BY_STATE[code];
    // Title case the hub names for DB matching
    const titleCasedHubs = hubNames.map(city => 
      city.replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase())
    );

    const { data, error } = await supabase
      .from("cities")
      .select("id, city, state_or_province, latitude, longitude, zip, kma_code, kma_name")
      .eq('state_or_province', code)
      .in('city', titleCasedHubs);
    
    if (error) {
      console.warn(`[fetchMajorHubsForState] Failed to fetch hubs for ${code}:`, error);
      return [];
    }

    console.log(`[fetchMajorHubsForState] Fetched ${data.length} hubs for ${code}`);
    return data || [];
  } catch (error) {
    console.error(`[fetchMajorHubsForState] Error fetching hubs for ${stateInput}:`, error);
    return [];
  }
}

function correctCityName(city, state, dbCorrections = new Map()) {
  const key = `${city}, ${state}`.toUpperCase();
  
  // Check database corrections first
  if (dbCorrections.has(key)) {
    return dbCorrections.get(key);
  }
  
  // Fall back to legacy corrections
  if (LEGACY_CITY_CORRECTIONS[key]) {
    const corrected = LEGACY_CITY_CORRECTIONS[key].split(', ');
    return { city: corrected[0], state: corrected[1] };
  }
  
  return { city, state };
}

async function fetchDatabaseBlacklist(supabase) {
  const now = Date.now();
  if (now - lastBlacklistFetch < BLACKLIST_CACHE_TTL) {
    return dbBlacklistCache; // Return cached version
  }

  try {
    const { data, error } = await supabase
      .from('blacklisted_cities')
      .select('city, state');

    if (!error && data) {
      dbBlacklistCache = new Set(
        data.map(row => `${row.city}, ${row.state}`.toUpperCase())
      );
      lastBlacklistFetch = now;
    }
  } catch (err) {
    console.warn('Failed to fetch database blacklist:', err);
  }

  return dbBlacklistCache;
}

function isBlacklisted(city, state, dbBlacklist = new Set()) {
  const key = `${city}, ${state}`.toUpperCase();
  return LEGACY_BLACKLISTED_CITIES.has(key) || dbBlacklist.has(key);
}

const ApiSchema = z.object({
  laneId: z.string().min(1, "Lane ID is required"),
  originCity: z.string().min(1, "Origin city is required"),
  originState: z.string().min(1, "Origin state is required"),
  destinationCity: z.string().min(1, "Destination city is required"),
  destinationState: z.string().min(1, "Destination state is required"),
  equipmentCode: z.string().min(1, "Equipment code is required"),
});

function toRad(value) {
  return (value * Math.PI) / 180;
}

// Haversine distance (miles)
function haversine(lat1, lon1, lat2, lon2) {
  const R = 3958.8; // miles
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Helper for robust name matching (shared logic)
const normalizeCityName = (name) => {
  return (name || '').toLowerCase()
    .replace(/\s+(mkt|market)\s*$/i, '')
    .replace(/^n[\.\s]+/, 'north ')
    .replace(/^s[\.\s]+/, 'south ')
    .replace(/^e[\.\s]+/, 'east ')
    .replace(/^w[\.\s]+/, 'west ')
    .replace(/\b(ft\.?|fort)\b/g, 'fort')
    .replace(/\b(st\.?|saint)\b/g, 'saint')
    .replace(/\b(mt\.?|mount)\b/g, 'mount')
    .replace(/[^a-z0-9]/g, '');
};

// Group results by KMA and spread them evenly
// For each KMA, take the closest cities up to a per-KMA limit
function balanceByKMA(cities, max = 50, dbBlacklist = new Set(), dbCorrections = new Map()) {
  // Filter out blacklisted cities and apply corrections
  const filtered = cities
    .filter(c => !isBlacklisted(c.city, c.state_or_province || c.state, dbBlacklist))
    .map(c => {
      const corrected = correctCityName(c.city, c.state_or_province || c.state, dbCorrections);
      return {
        ...c,
        city: corrected.city,
        state: corrected.state,
        state_or_province: corrected.state
      };
    });
  
  const grouped = {};
  for (const c of filtered) {
    const kma = c.kma_code || 'UNK';
    if (!grouped[kma]) grouped[kma] = [];
    grouped[kma].push(c);
  }

  // Sort each group by distance BUT prioritize Market City
  for (const kma in grouped) {
    // 1. Sort by distance first
    grouped[kma].sort((a, b) => a.distance - b.distance);
    
    // 2. Find Market City and move to front
    const marketCityIndex = grouped[kma].findIndex(c => {
      if (!c.kma_name) return false;
      const kmaName = normalizeCityName(c.kma_name);
      const cityName = normalizeCityName(c.city);
      return kmaName === cityName;
    });

    if (marketCityIndex > 0) { // If found and not already first
      const marketCity = grouped[kma].splice(marketCityIndex, 1)[0];
      grouped[kma].unshift(marketCity); // Move to top
    }
  }

  const kmaKeys = Object.keys(grouped);
  const perKMALimit = Math.max(20, Math.floor(max / Math.max(kmaKeys.length, 2))); // At least 20 per KMA
  
  // Take up to perKMALimit cities from each KMA
  const results = [];
  for (const kma of kmaKeys) {
    const citiesFromKMA = grouped[kma].slice(0, perKMALimit);
    results.push(...citiesFromKMA);
    if (results.length >= max) break;
  }
  
  // If we haven't hit max yet, do round-robin for remaining slots
  if (results.length < max) {
    let added = true;
    while (results.length < max && added) {
      added = false;
      for (const kma of kmaKeys) {
        if (grouped[kma].length > 0 && results.length < max) {
          results.push(grouped[kma].shift());
          added = true;
        }
      }
    }
  }
  
  return results;
}

// Simple haversine utilities retained for legacy option generation
async function generateOptionsForLane(laneId, supabaseAdmin) {
  // Fetch database blacklist and corrections
  const dbBlacklist = await fetchDatabaseBlacklist(supabaseAdmin);
  const dbCorrections = await fetchDatabaseCorrections(supabaseAdmin);
  
  // Fetch lane
  const { data: lane, error: laneErr } = await supabaseAdmin
    .from("lanes")
    .select("*")
    .eq("id", laneId)
    .single();
  if (laneErr || !lane) {
    console.error('[generateOptionsForLane] Lane fetch failed:', laneId, laneErr?.message);
    throw new Error('Lane not found');
  }
  // Debug: log lane and coords
  console.log('[generateOptionsForLane] Lane data:', { 
    id: lane.id,
    origin: `${lane.origin_city}, ${lane.origin_state}`,
    dest: `${lane.destination_city || lane.dest_city}, ${lane.destination_state || lane.dest_state}`,
    coords: { 
      originLat: lane.origin_latitude, 
      originLon: lane.origin_longitude, 
      destLat: lane.dest_latitude, 
      destLon: lane.dest_longitude 
    }
  });
  
  // NEW ENGLAND FILTER: Hard-block NYC/Long Island KMAs for MA/NH/ME/VT/RI/CT destinations
  // NJ is included as a major freight corridor for New England lanes
  const NEW_ENGLAND = new Set(['MA', 'NH', 'ME', 'VT', 'RI', 'CT']);
  const NYC_LI_KMA_BLOCKLIST = new Set([
    'NY_BRN', 'NY_BKN', 'NY_NYC', 'NY_QUE', 'NY_BRX', 'NY_STA', 'NY_NAS', 'NY_SUF'
  ]);
  const originState = (lane.origin_state || '').toUpperCase();
  const destState = (lane.destination_state || lane.dest_state || '').toUpperCase();
  const isNewEnglandLane = NEW_ENGLAND.has(destState);
  const isFloridaLane = originState === 'FL' || destState === 'FL';
  const isNewJerseyLane = originState === 'NJ' || destState === 'NJ';
  const isTexasLane = originState === 'TX' || destState === 'TX';
  const isCanadianLane = ['BC', 'ON', 'QC', 'AB', 'MB', 'SK', 'NS', 'NB', 'NL', 'PE', 'YT', 'NT', 'NU'].includes(destState);
  
  console.log(`[generateOptionsForLane] Lane ${laneId}: Origin = '${originState}', Destination = '${destState}', isNewEnglandLane = ${isNewEnglandLane}, isFloridaLane = ${isFloridaLane}, isNewJerseyLane = ${isNewJerseyLane}, isTexasLane = ${isTexasLane}, isCanadianLane = ${isCanadianLane}`);
  
  if (isNewEnglandLane) {
    console.log(`[generateOptionsForLane] 🔒 New England destination detected (${destState}), will filter NYC/LI cities`);
  }
  if (isFloridaLane) {
    console.log(`[generateOptionsForLane] 🌴 Florida lane detected, will include all major FL cities for deadheading`);
  }
  if (isNewJerseyLane) {
    console.log(`[generateOptionsForLane] 🚛 New Jersey lane detected, will include all major NJ freight cities`);
  }
  if (isTexasLane) {
    console.log(`[generateOptionsForLane] 🤠 Texas lane detected, will include all TX cities for statewide coverage`);
  }
  if (isCanadianLane) {
    console.log(`[generateOptionsForLane] 🍁 Canadian lane detected, will include all cities in ${destState}`);
  }
  
  const originLat = lane.origin_latitude;
  const originLon = lane.origin_longitude;
  const destLat = lane.dest_latitude;
  const destLon = lane.dest_longitude;
  if (originLat == null || originLon == null || destLat == null || destLon == null) {
    console.error('[generateOptionsForLane] Missing coordinates for lane:', laneId, { originLat, originLon, destLat, destLon });
    throw new Error('Lane missing coordinates');
  }
  
  // Always use bounding box for initial city fetch (covers both origin and destination)
  const latMin = Math.min(originLat, destLat) - 3;
  const latMax = Math.max(originLat, destLat) + 3;
  const lonMin = Math.min(originLon, destLon) - 3;
  const lonMax = Math.max(originLon, destLon) + 3;
  
  const boxHeight = Math.abs(latMax - latMin);
  const boxWidth = Math.abs(lonMax - lonMin);
  let cities = [];
  let cityErr = null;

  // OPTIMIZATION: If the search box is too large (> 6 degrees), split into two focused queries
  // to avoid hitting the 1000-row Supabase limit with irrelevant intermediate cities.
  if (boxHeight > 6 || boxWidth > 6) {
    console.log(`[generateOptionsForLane] 📏 Long lane detected (${boxHeight.toFixed(1)}x${boxWidth.toFixed(1)}), using split queries`);
    
    // Query 1: Origin Radius (1.5 deg ~= 100 miles)
    const { data: originData, error: e1 } = await supabaseAdmin
      .from("cities")
      .select("id, city, state_or_province, latitude, longitude, zip, kma_code, kma_name")
      .gte("latitude", originLat - 1.5)
      .lte("latitude", originLat + 1.5)
      .gte("longitude", originLon - 1.5)
      .lte("longitude", originLon + 1.5);

    // Query 2: Destination Radius
    const { data: destData, error: e2 } = await supabaseAdmin
      .from("cities")
      .select("id, city, state_or_province, latitude, longitude, zip, kma_code, kma_name")
      .gte("latitude", destLat - 1.5)
      .lte("latitude", destLat + 1.5)
      .gte("longitude", destLon - 1.5)
      .lte("longitude", destLon + 1.5);

    if (e1 || e2) {
      cityErr = e1 || e2;
    } else {
      // Merge results
      const cityMap = new Map();
      (originData || []).forEach(c => cityMap.set(c.id, c));
      (destData || []).forEach(c => cityMap.set(c.id, c));
      cities = Array.from(cityMap.values());
    }
  } else {
    // Standard single-box query for short lanes
    const { data, error } = await supabaseAdmin
      .from("cities")
      .select("id, city, state_or_province, latitude, longitude, zip, kma_code, kma_name")
      .gte("latitude", latMin)
      .lte("latitude", latMax)
      .gte("longitude", lonMin)
      .lte("longitude", lonMax);
    cities = data;
    cityErr = error;
  }
  
  if (cityErr) throw new Error('Failed to fetch cities');
  
  // If no cities found in bounding box, check if we have special handling that might find cities elsewhere
  const hasSpecialHandling = isNewEnglandLane || isFloridaLane || isTexasLane || isCanadianLane || isNewJerseyLane;
  if ((!cities || cities.length === 0) && !hasSpecialHandling) {
    throw new Error('No cities found near lane');
  }
  const safeCities = cities || [];
  
  // For New England lanes, also fetch ALL cities in New England and upstate NY states
  let neStateCities = [];
  if (isNewEnglandLane) {
    const states = ['MA', 'NH', 'ME', 'VT', 'RI', 'CT', 'NY'];
    const { data: neData } = await supabaseAdmin
      .from("cities")
      .select("id, city, state_or_province, latitude, longitude, zip, kma_code, kma_name")
      .in('state_or_province', states);
    if (neData) {
      neStateCities = neData;
      console.log(`[generateOptionsForLane] 🔍 Fetched ${neStateCities.length} New England + NY cities from DB`);
      const stateCounts = {};
      for (const c of neStateCities) {
        stateCounts[c.state_or_province] = (stateCounts[c.state_or_province] || 0) + 1;
      }
      console.log(`[generateOptionsForLane] 🔍 State breakdown:`, stateCounts);
    }
  }
  
  // For Florida lanes, fetch major FL cities to support long deadheading patterns (300-500 miles)
  let flCities = [];
  let mcdavidCities = [];
  if (isFloridaLane) {
    const majorFLCities = [
      'Tallahassee', 'Lake City', 'Jacksonville', 'Gainesville', 'St Augustine',
      'Daytona Beach', 'Ocala', 'Orlando', 'The Villages', 'Kissimmee',
      'Bartow', 'Lakeland', 'Tampa', 'Sarasota', 'Clearwater',
      'St. Petersburg', 'Bradenton', 'Sebring', 'Melbourne', 'Fort Pierce',
      'Vero Beach', 'Punta Gorda', 'Fort Myers', 'Cape Coral', 'Fort Lauderdale',
      'Bornton Beach', 'Boca Raton', 'West Palm Beach', 'Doral', 'Port St Lucie',
      'Delray Beach', 'Miami', 'Homestead', 'Naples', 'Bonita Springs',
      'Hollywood', 'Pembroke Pines', 'Hialeah', 'Lehigh Acres', 'Labelle',
      'Ft Meade', 'Auburndale', 'Zephyrhills', 'Dade City', 'Silver Springs',
      'Panama City', 'Alachua', 'Lady Lake', 'Belleview', 'Clermont',
      'Oviedo', 'Apopka', 'Winter Park', 'Winter Garden', 'Bay Lake',
      'Polk City', 'Land O Lakes', 'New Port Richey', 'Odessa', 'Spring Hill',
      'Holiday', 'Williston'
    ];
    
    const { data: flData } = await supabaseAdmin
      .from("cities")
      .select("id, city, state_or_province, latitude, longitude, zip, kma_code, kma_name")
      .eq('state_or_province', 'FL')
      .in('city', majorFLCities);
    
    if (flData) {
      flCities = flData;
      console.log(`[generateOptionsForLane] 🌴 Fetched ${flCities.length} major FL cities from DB for deadheading coverage`);
      if (flCities.length > 0) {
        console.log(`[generateOptionsForLane] 🌴 FL cities found:`, flCities.map(c => c.city).sort().join(', '));
      }
      if (flCities.length < majorFLCities.length) {
        console.log(`[generateOptionsForLane] ⚠️  Only found ${flCities.length} of ${majorFLCities.length} requested FL cities in database`);
        const foundCityNames = new Set(flCities.map(c => c.city));
        const missing = majorFLCities.filter(c => !foundCityNames.has(c));
        console.log(`[generateOptionsForLane] ⚠️  Missing cities:`, missing.join(', '));
      }
    }

    // Fetch proximity cities around McDavid, FL (covers AL, MS, GA, FL Panhandle)
    const MCDAVID_LAT = 30.8632;
    const MCDAVID_LON = -87.3222;
    const PROXIMITY_RADIUS_MILES = 150;
    const latRadius = PROXIMITY_RADIUS_MILES / 69;
    const lonRadius = PROXIMITY_RADIUS_MILES / 53;

    const { data: proxData } = await supabaseAdmin
      .from("cities")
      .select("id, city, state_or_province, latitude, longitude, zip, kma_code, kma_name")
      .gte("latitude", MCDAVID_LAT - latRadius)
      .lte("latitude", MCDAVID_LAT + latRadius)
      .gte("longitude", MCDAVID_LON - lonRadius)
      .lte("longitude", MCDAVID_LON + lonRadius)
      .in('state_or_province', ['FL', 'AL', 'MS', 'GA']);

    if (proxData) {
      mcdavidCities = proxData.filter(c => {
        const dist = haversine(MCDAVID_LAT, MCDAVID_LON, c.latitude, c.longitude);
        return dist <= PROXIMITY_RADIUS_MILES;
      });
      console.log(`[generateOptionsForLane] 📍 Fetched ${mcdavidCities.length} cities near McDavid, FL (within ${PROXIMITY_RADIUS_MILES} miles)`);
    }
  }

  // For Texas lanes, fetch ALL cities in TX to ensure full market coverage (user request)
  let txCities = [];
  if (isTexasLane) {
    try {
      // TX has ~1850 cities. Fetch in optimized chunks to prevent memory/timeout issues.
      // Selecting ONLY necessary columns is critical here.
      const CHUNK_SIZE = 1000;
      const fetchChunk = (page) => 
        supabaseAdmin
          .from("cities")
          .select("id, city, state_or_province, latitude, longitude, zip, kma_code, kma_name")
          .eq('state_or_province', 'TX')
          //.not('kma_code', 'is', null) // REMOVED: Allow null KMA cities so they can be healed by ZIP logic
          .range(page * CHUNK_SIZE, (page + 1) * CHUNK_SIZE - 1);

      // Fetch first 3000 rows (sufficient for ~2200 cities) in parallel safe-mode
      const [r1, r2, r3] = await Promise.all([fetchChunk(0), fetchChunk(1), fetchChunk(2)]);
      
      if (r1.error) console.error('[generateOptionsForLane] TX Fetch Error Chunk 1:', r1.error);
      if (r2.error) console.error('[generateOptionsForLane] TX Fetch Error Chunk 2:', r2.error);

      if (r1.data) txCities.push(...r1.data);
      if (r2.data) txCities.push(...r2.data);
      if (r3 && r3.data) txCities.push(...r3.data);
      
      console.log(`[generateOptionsForLane] 🤠 Fetched ${txCities.length} TX cities from DB (paged) for statewide coverage`);
    } catch (txErr) {
      console.error('[generateOptionsForLane] CRITICAL ERROR fetching TX cities:', txErr);
      // Fallback: don't crash, just have partial data
    }
  }

  // For NJ lanes, fetch ALL cities in NJ to ensure full market coverage
  let njCities = [];
  if (isNewJerseyLane) {
    const { data: njData } = await supabaseAdmin
      .from("cities")
      .select("id, city, state_or_province, latitude, longitude, zip, kma_code, kma_name")
      .eq('state_or_province', 'NJ')
      .not('kma_code', 'is', null);
    
    if (njData) {
      njCities = njData;
      console.log(`[generateOptionsForLane] 🚛 Fetched ${njCities.length} NJ cities from DB for statewide coverage`);
    }
  }

  // For Canadian lanes, fetch ALL cities in the destination province
  let canCities = [];
  if (isCanadianLane) {
    const { data: canData } = await supabaseAdmin
      .from("cities")
      .select("id, city, state_or_province, latitude, longitude, zip, kma_code, kma_name")
      .eq('state_or_province', destState)
      .not('kma_code', 'is', null);
    
    if (canData) {
      canCities = canData;
      console.log(`[generateOptionsForLane] 🍁 Fetched ${canCities.length} cities in ${destState} for Canadian coverage`);
    }
  }

  // Fetch Major Hubs for Origin and Destination (Universal Logic)
  // This ensures key market cities (e.g. Charlotte, NC) are included even if they are outside the 100mi radius
  let originHubs = [];
  let destHubs = [];
  
  // Skip if we already fetched ALL cities for these states (Flags checked above)
  const originAlreadyCovered = (isFloridaLane && originState === 'FL') || (isTexasLane && originState === 'TX') || (isNewJerseyLane && originState === 'NJ');
  const destAlreadyCovered = isNewEnglandLane || (isFloridaLane && destState === 'FL') || (isTexasLane && destState === 'TX') || (isNewJerseyLane && destState === 'NJ') || isCanadianLane;

  if (!originAlreadyCovered) {
    originHubs = await fetchMajorHubsForState(supabaseAdmin, originState);
  }
  if (!destAlreadyCovered) {
    destHubs = await fetchMajorHubsForState(supabaseAdmin, destState);
  }
  
  // Combine cities: bounding box + Hubs + Special Handling Lists (Dedupe by city+state)
  const allCitiesMap = new Map();
  
  const addCitiesToMap = (list) => {
    for (const c of list) {
        // Robust key generation to prevent duplicates
        const city = (c.city || '').trim().toUpperCase();
        const state = (c.state_or_province || c.state || '').trim().toUpperCase();
        const key = `${city}|${state}`;
        
        if (!allCitiesMap.has(key)) {
            allCitiesMap.set(key, c);
        }
    }
  };

  addCitiesToMap(safeCities);
  addCitiesToMap(neStateCities);
  addCitiesToMap(flCities);
  addCitiesToMap(mcdavidCities);
  addCitiesToMap(txCities);
  addCitiesToMap(njCities);
  addCitiesToMap(canCities);
  addCitiesToMap(originHubs);
  addCitiesToMap(destHubs);

  const allCities = Array.from(allCitiesMap.values());
  
  if (isNewEnglandLane) {
    console.log(`[generateOptionsForLane] 🔍 After deduplication: ${allCities.length} total cities`);
    const dedupedStateCounts = {};
    for (const c of allCities) {
      dedupedStateCounts[c.state_or_province] = (dedupedStateCounts[c.state_or_province] || 0) + 1;
    }
    console.log(`[generateOptionsForLane] 🔍 Deduped state breakdown:`, dedupedStateCounts);
  }
  if (isFloridaLane) {
    console.log(`[generateOptionsForLane] 🌴 After FL city merge: ${allCities.length} total cities (${flCities.length} FL cities added)`);
  }
  
  const enriched = [];
  for (const c of allCities) {
    let kma = c.kma_code;
    // If no KMA code, try to look it up from zip (first 3 digits)
    if (!kma && c.zip) {
      const zip3 = c.zip.toString().substring(0, 3);
      const { data: zipRow } = await supabaseAdmin
        .from("zip3s")
        .select("kma_code, kma_name")
        .eq("zip3", zip3)
        .maybeSingle();
      if (zipRow) kma = zipRow.kma_code;
    }
    enriched.push({ 
      ...c, 
      kma_code: kma || 'UNK',
      state: c.state_or_province // Normalize state field name
    });
  }
  
  // Calculate distances for all cities
  const originWithDistances = enriched
    .map(c => ({ ...c, distance: haversine(originLat, originLon, c.latitude, c.longitude) }));
  const destWithDistances = enriched
    .map(c => ({ ...c, distance: haversine(destLat, destLon, c.latitude, c.longitude) }));
  
  // For FL lanes, also calculate distances for the major FL cities from the database
  let flOriginWithDistances = [];
  let flDestWithDistances = [];
  if (isFloridaLane && flCities.length > 0) {
    flOriginWithDistances = flCities.map(c => ({
      ...c,
      state: c.state_or_province,
      kma_code: c.kma_code || 'UNK',
      distance: haversine(originLat, originLon, c.latitude, c.longitude)
    }));
    flDestWithDistances = flCities.map(c => ({
      ...c,
      state: c.state_or_province,
      kma_code: c.kma_code || 'UNK',
      distance: haversine(destLat, destLon, c.latitude, c.longitude)
    }));
    console.log(`[generateOptionsForLane] 🌴 Calculated distances for ${flCities.length} major FL cities`);
  }

  // For TX lanes, calculate distances for all TX cities
  let txOriginWithDistances = [];
  let txDestWithDistances = [];
  if (isTexasLane && txCities.length > 0) {
    txOriginWithDistances = txCities.map(c => ({
      ...c,
      state: c.state_or_province,
      kma_code: c.kma_code || 'UNK',
      distance: haversine(originLat, originLon, c.latitude, c.longitude)
    }));
    txDestWithDistances = txCities.map(c => ({
      ...c,
      state: c.state_or_province,
      kma_code: c.kma_code || 'UNK',
      distance: haversine(destLat, destLon, c.latitude, c.longitude)
    }));
    console.log(`[generateOptionsForLane] 🤠 Calculated distances for ${txCities.length} TX cities`);
  }

  // For NJ lanes, calculate distances for all NJ cities
  let njOriginWithDistances = [];
  let njDestWithDistances = [];
  if (isNewJerseyLane && njCities.length > 0) {
    njOriginWithDistances = njCities.map(c => ({
      ...c,
      state: c.state_or_province,
      kma_code: c.kma_code || 'UNK',
      distance: haversine(originLat, originLon, c.latitude, c.longitude)
    }));
    njDestWithDistances = njCities.map(c => ({
      ...c,
      state: c.state_or_province,
      kma_code: c.kma_code || 'UNK',
      distance: haversine(destLat, destLon, c.latitude, c.longitude)
    }));
    console.log(`[generateOptionsForLane] 🚛 Calculated distances for ${njCities.length} NJ cities`);
  }

  // For Canadian lanes, calculate distances for all cities in the province
  let canDestWithDistances = [];
  if (isCanadianLane && canCities.length > 0) {
    canDestWithDistances = canCities.map(c => ({
      ...c,
      state: c.state_or_province,
      kma_code: c.kma_code || 'UNK',
      distance: haversine(destLat, destLon, c.latitude, c.longitude)
    }));
    console.log(`[generateOptionsForLane] 🍁 Calculated distances for ${canCities.length} Canadian cities`);
  }

  // Calculate distances for Major Hubs (Universal)
  let originHubsWithDistances = [];
  let destHubsWithDistances = [];
  
  if (originHubs.length > 0) {
    originHubsWithDistances = originHubs.map(c => ({
      ...c,
      state: c.state_or_province,
      kma_code: c.kma_code || 'UNK',
      distance: haversine(originLat, originLon, c.latitude, c.longitude)
    }));
  }
  
  if (destHubs.length > 0) {
    destHubsWithDistances = destHubs.map(c => ({
      ...c,
      state: c.state_or_province,
      kma_code: c.kma_code || 'UNK',
      distance: haversine(destLat, destLon, c.latitude, c.longitude)
    }));
  }
  

  // =========================================================================

  // Helper to extract real city name from KMA name for DB querying
  const cleanKmaNameForFetch = (kmaName) => {
    let name = (kmaName || '').replace(/\s+(Mkt|Market)\s*$/i, '');
    
    // Directions - High confidence matches
    if (name.match(/^N[\.\s]/)) { name = name.replace(/^N[\.\s]+/, 'North '); }
    else if (name.match(/^S[\.\s]/)) { name = name.replace(/^S[\.\s]+/, 'South '); }
    else if (name.match(/^E[\.\s]/)) { name = name.replace(/^E[\.\s]+/, 'East '); }
    else if (name.match(/^W[\.\s]/)) { name = name.replace(/^W[\.\s]+/, 'West '); }

    // Fort/Saint/Mount matches
    if (name.match(/^Ft[\.\s]/)) { name = name.replace(/^Ft[\.\s]+/, 'Fort '); }
    
    return name.trim();
  };

  // SMART MARKET FILLING: Ensure we fetch Market Centers for ANY probed KMA
  // =========================================================================
  const fillMarketCenters = async (nearbyList, currentHubs, refLat, refLon) => {
    // 1. Identify states touched by nearby cities and active KMAS
    const touchedStates = new Set(nearbyList.map(c => c.state_or_province));
    const activeKmas = new Map(); // Code -> Name

    nearbyList.forEach(c => {
         if(c.kma_code) {
             activeKmas.set(c.kma_code, c.kma_name);
             // Logic to handle Cross-Border KMAs (TN_CHA for AL origin)
             const match = c.kma_code.match(/^([A-Z]{2})_/);
             if (match && match[1]) touchedStates.add(match[1]);
         }
    });

    // 2. Fetch Generic Major Hubs for these states (Baseline coverage)
    const extraHubs = [];
    for (const st of touchedStates) {
      if (!st) continue;
      const safeState = normalizeStateCode(st);
      // Skip if likely covered (optimization can be improved, but safety first)
      // We check if we already have hubs for this state in currentHubs to avoid redundancy
      const hasStateCoverage = currentHubs.some(h => h.state_or_province === safeState);
      if (hasStateCoverage && !activeKmas.size) continue; 

      const newHubs = await fetchMajorHubsForState(supabaseAdmin, safeState);
      extraHubs.push(...newHubs);
    }

    // 3. PRECISE MARKET CITY FETCHING (The "Lexington/South Bend" Fix)
    // Explicitly fetch the city named in the KMA label to ensure it's available
    const preciseHubs = [];
    const directFetchPromises = Array.from(activeKmas.entries()).map(async ([code, name]) => {
        if (!name) return;
        const state = code.split('_')[0]; // Valid state from KMA code
        const targetCity = cleanKmaNameForFetch(name);
        
        // Build OR query for St/Saint variations
        let orQuery = `city.ilike.${targetCity}`;
        if (targetCity.startsWith('St ')) {
             orQuery += `,city.ilike.${targetCity.replace('St ', 'St. ')}`;
             orQuery += `,city.ilike.${targetCity.replace('St ', 'Saint ')}`;
        }

        const { data } = await supabaseAdmin
            .from('cities')
            .select('*')
            .eq('state_or_province', state)
            .or(orQuery)
            .limit(1); // Just get the main one
        
        if (data && data[0]) {
            preciseHubs.push(data[0]);
        }
    });

    await Promise.all(directFetchPromises);
    
    const allAvailableHubs = [...currentHubs, ...extraHubs, ...preciseHubs];
    
    // 4. Calculate distances and Filter
    const allHubsWithDist = allAvailableHubs.map(c => ({
      ...c,
      state: c.state_or_province,
      kma_code: c.kma_code || 'UNK',
      distance: haversine(refLat, refLon, c.latitude, c.longitude)
    }));

    // Dedup by City+State to prevent duplicates from multiple fetch methods
    const seen = new Set();
    const uniqueHubs = [];
    
    for (const h of allHubsWithDist) {
        const key = `${normalizeCityName(h.city)}_${h.state}`;
        if (seen.has(key)) continue;
        seen.add(key);
        uniqueHubs.push(h);
    }

    // 5. Keep valid hubs:
    //    A) Is it close?
    //    B) DOES IT MATCH AN ACTIVE KMA CODE? (Bubble up logic)
    return uniqueHubs.filter(h => {
        if (h.distance <= 100) return true; // Close anyway
        if (activeKmas.has(h.kma_code)) return true; // MARKET CENTER FILL!!
        return false;
    });
  };

    // Standard logic with Hub inclusion
    let originOptions;
    if (!isFloridaLane && !isTexasLane && !isNewJerseyLane) {
        const nearby = originWithDistances.filter(c => c.distance <= 100);
        
        // Perform smart fill
      const smartHubs = await fillMarketCenters(nearby, originHubs, originLat, originLon);
      
      // Add Hubs regardless of distance if they are in the origin state OR matched a KMA
      originOptions = [...nearby, ...originHubsWithDistances, ...smartHubs];
      
      // Dedupe
      const uniqueMap = new Map();
      originOptions.forEach(c => {
          const key = `${c.city.trim().toUpperCase()}|${c.state.trim().toUpperCase()}`;
          if (!uniqueMap.has(key)) uniqueMap.set(key, c);
      });
      originOptions = Array.from(uniqueMap.values());
  } else if (isFloridaLane && originState === 'FL') {
     // ... (Existing FL logic seems robust for user needs, skip for now to minimize regression risk)
     // But essentially we use the logic block replacement, so I will wrap the existing FL block structure carefully.
     // RE-INSERTING ORIGINAL FL/TX/NJ LOGIC UNTOUCHED BELOW
     
     // For FL origin lanes...
    const mcdavidProxWithDist = mcdavidCities.map(c => ({
      ...c,
      state: c.state_or_province,
      kma_code: c.kma_code || 'UNK',
      distance: haversine(originLat, originLon, c.latitude, c.longitude)
    }));

    const nearbyNonFL = originWithDistances.filter(c => c.state !== 'FL' && c.distance <= 100);
    
    // Merge and Dedupe
    const combinedMap = new Map();
    [...flOriginWithDistances, ...mcdavidProxWithDist, ...nearbyNonFL].forEach(c => {
        const key = `${c.city}|${c.state}`.toUpperCase();
        if (!combinedMap.has(key)) {
            combinedMap.set(key, c);
        }
    });
    originOptions = Array.from(combinedMap.values());
  } else if (isTexasLane && originState === 'TX') {
    const nearbyNonTX = originWithDistances.filter(c => c.state !== 'TX' && c.distance <= 100);
    originOptions = [...txOriginWithDistances, ...nearbyNonTX];
  } else if (isNewJerseyLane && originState === 'NJ') {
    const nearbyNonNJ = originWithDistances.filter(c => c.state !== 'NJ' && c.distance <= 100);
    originOptions = [...njOriginWithDistances, ...nearbyNonNJ];
  } else {
     // Standard logic for origin (non-specialty states)
     const nearby = originWithDistances.filter(c => c.distance <= 100);
     
     // Perform smart fill for origin
     const smartHubs = await fillMarketCenters(nearby, originHubs, originLat, originLon);
 
     // Add Hubs regardless of distance
     originOptions = [...nearby, ...originHubsWithDistances, ...smartHubs];
     
     // Dedupe
     const uniqueMap = new Map();
     originOptions.forEach(c => {
         const key = `${c.city.trim().toUpperCase()}|${c.state.trim().toUpperCase()}`;
         if (!uniqueMap.has(key)) uniqueMap.set(key, c);
     });
     originOptions = Array.from(uniqueMap.values());
  }

  
  let destOptions;
  if (isNewEnglandLane) {
    // For New England lanes, don't apply distance filter to destination cities
    // We want ALL New England and upstate NY cities, regardless of distance
    destOptions = destWithDistances;
    console.log(`[generateOptionsForLane] 🔒 New England lane: including all destination cities (${destOptions.length}) without distance filter`);
  } else if (isFloridaLane && destState === 'FL') {
    // For FL destination lanes, include ONLY the major FL cities from database query, plus nearby non-FL cities
    const nearbyNonFL = destWithDistances.filter(c => c.state !== 'FL' && c.distance <= 100);
    destOptions = [...flDestWithDistances, ...nearbyNonFL];
    console.log(`[generateOptionsForLane] 🌴 FL destination: ${flDestWithDistances.length} major FL cities (from user list) + ${nearbyNonFL.length} nearby non-FL cities`);
  } else if (isTexasLane && destState === 'TX') {
    // For TX destination lanes, include ALL TX cities from database query, plus nearby non-TX cities
    const nearbyNonTX = destWithDistances.filter(c => c.state !== 'TX' && c.distance <= 100);
    destOptions = [...txDestWithDistances, ...nearbyNonTX];
    console.log(`[generateOptionsForLane] 🤠 TX destination: ${txDestWithDistances.length} TX cities + ${nearbyNonTX.length} nearby non-TX cities`);
  } else if (isNewJerseyLane && destState === 'NJ') {
    // For NJ destination lanes, include ALL NJ cities from database query, plus nearby non-NJ cities
    const nearbyNonNJ = destWithDistances.filter(c => c.state !== 'NJ' && c.distance <= 100);
    destOptions = [...njDestWithDistances, ...nearbyNonNJ];
    console.log(`[generateOptionsForLane] 🚛 NJ destination: ${njDestWithDistances.length} NJ cities + ${nearbyNonNJ.length} nearby non-NJ cities`);
  } else if (isCanadianLane) {
    // For Canadian destination lanes, include ALL cities in that province
    destOptions = canDestWithDistances;
    console.log(`[generateOptionsForLane] 🍁 Canadian destination: ${canDestWithDistances.length} cities in ${destState}`);
  } else {
    // Standard logic with Hub inclusion
    const nearby = destWithDistances.filter(c => c.distance <= 100);
    
    // Perform smart fill for destination
    const smartHubs = await fillMarketCenters(nearby, destHubs, destLat, destLon);

    // Add Hubs regardless of distance if they are in the destination state or matched a KMA
    destOptions = [...nearby, ...destHubsWithDistances, ...smartHubs];
    
    // Dedupe again to be safe
    const uniqueMap = new Map();
    destOptions.forEach(c => {
        const key = `${c.city.trim().toUpperCase()}|${c.state.trim().toUpperCase()}`;
        if (!uniqueMap.has(key)) uniqueMap.set(key, c);
    });
    destOptions = Array.from(uniqueMap.values());
  }
  
  // If we have very few options (coastal/sparse areas), expand radius progressively
  // Skip expansion for FL/TX/NJ origin lanes since they already have all state cities
  if ((!isFloridaLane || originState !== 'FL') && (!isTexasLane || originState !== 'TX') && (!isNewJerseyLane || originState !== 'NJ')) {
    if (originOptions.length < 30) {
      console.log(`⚠️  Only ${originOptions.length} origin cities within 100 miles, expanding to 150 miles`);
      originOptions = originWithDistances.filter(c => c.distance <= 150);
    }
    if (originOptions.length < 15) {
      console.log(`⚠️  Still only ${originOptions.length} origin cities, expanding to 200 miles for sparse area`);
      originOptions = originWithDistances.filter(c => c.distance <= 200);
    }
  }
  
  // Only expand destination radius for non-New England, non-FL, non-TX, non-NJ, and non-Canadian destination lanes
  if (!isNewEnglandLane && (!isFloridaLane || destState !== 'FL') && (!isTexasLane || destState !== 'TX') && (!isNewJerseyLane || destState !== 'NJ') && !isCanadianLane) {
    if (destOptions.length < 30) {
      console.log(`⚠️  Only ${destOptions.length} destination cities within 100 miles, expanding to 150 miles`);
      destOptions = destWithDistances.filter(c => c.distance <= 150);
    }
    if (destOptions.length < 15) {
      console.log(`⚠️  Still only ${destOptions.length} destination cities, expanding to 200 miles for sparse area`);
      destOptions = destWithDistances.filter(c => c.distance <= 200);
    }
  }
  
  console.log(`[generateOptionsForLane] 📍 BEFORE balanceByKMA: ${destOptions.length} destination cities`);
  if (destOptions.length > 0) {
    const samples = destOptions.slice(0, 10).map(c => ({
      city: c.city,
      state: c.state_or_province,
      kma: c.kma_code,
      dist: Math.round(c.distance)
    }));
    console.log(`[generateOptionsForLane] Sample dest cities BEFORE balance:`, JSON.stringify(samples, null, 2));
  } else {
    console.log(`[generateOptionsForLane] ❌ NO destination cities found within 200 miles!`);
    console.log(`[generateOptionsForLane] Destination coords: lat=${destLat}, lon=${destLon}`);
    console.log(`[generateOptionsForLane] Query bounding box: lat [${latMin}, ${latMax}], lon [${lonMin}, ${lonMax}]`);
    console.log(`[generateOptionsForLane] Total cities from DB query: ${enriched.length}`);
  }
  
  // NEW ENGLAND FILTER: Apply BEFORE balanceByKMA
  // Keep MA/NH/ME/VT/RI/CT + upstate NY (but block NYC/LI KMAs)
  if ((isNewEnglandLane || isNewJerseyLane) && destOptions.length > 0) {
    const preFilterCount = destOptions.length;
    
    const normalizeStateName = (state) => {
      if (!state) return '';
      const s = String(state).trim().toUpperCase();
      if (s.length === 2) return s;
      const stateMap = {
        'MASSACHUSETTS': 'MA', 'NEW HAMPSHIRE': 'NH', 'MAINE': 'ME',
        'VERMONT': 'VT', 'RHODE ISLAND': 'RI', 'CONNECTICUT': 'CT',
        'NEW YORK': 'NY', 'NEW JERSEY': 'NJ', 'PENNSYLVANIA': 'PA'
      };
      return stateMap[s] || s.slice(0, 2);
    };
    
    destOptions = destOptions.filter(c => {
      const cState = normalizeStateName(c.state_or_province || '');
      
      // Block NYC/Long Island KMAs explicitly
      if (NYC_LI_KMA_BLOCKLIST.has(c.kma_code)) {
        return false;
      }
      
      if (isNewEnglandLane) {
        // Keep New England states + NY + NJ (NJ is major freight corridor, upstate NY will remain after KMA filter)
        return NEW_ENGLAND.has(cState) || cState === 'NY' || cState === 'NJ';
      } else {
        // For NJ lanes, we just want to block NYC/LI, but keep everything else (especially NJ)
        return true;
      }
    });
    
    console.log(`[generateOptionsForLane] 🔒 NE/NJ Pre-filter: ${preFilterCount} → ${destOptions.length} cities (blocked NYC/LI KMAs)`);
    
    if (destOptions.length > 0) {
      const filteredStateCounts = {};
      for (const c of destOptions) {
        filteredStateCounts[c.state_or_province] = (filteredStateCounts[c.state_or_province] || 0) + 1;
      }
      console.log(`[generateOptionsForLane] 🔍 After NE/NJ filter state breakdown:`, filteredStateCounts);
    }
  }
  
  const balancedOrigin = balanceByKMA(originOptions, 100, dbBlacklist, dbCorrections); // Keep up to 100 diverse cities

  // FINAL SAFETY DEDUPLICATION
  // This ensures absolutely no duplicates exist in the final response
  const dedupeFinal = (list) => {
    const seen = new Set();
    return list.filter(c => {
      // Create a unique key using city, state AND kma to be safe, but mostly city|state
      const key = `${c.city.trim().toUpperCase()}|${(c.state_or_province || c.state || '').trim().toUpperCase()}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  };

  const finalOrigin = dedupeFinal(balancedOrigin);
  
  // For New England lanes, prioritize by distance instead of KMA balance to show nearby MA/NH/VT/RI/ME/CT cities
  let balancedDest;
  if (isNewEnglandLane) {
    // Sort by distance and take closest 100, ensuring state diversity
    const sortedByDistance = [...destOptions].sort((a, b) => a.distance - b.distance);
    
    // Group by state to ensure representation
    const byState = {};
    for (const c of sortedByDistance) {
      const state = c.state_or_province || c.state;
      if (!byState[state]) byState[state] = [];
      byState[state].push(c);
    }
    
    // Take closest cities from each state, prioritizing MA/NH/VT/RI/ME/CT/NJ
    const priorityStates = ['MA', 'NH', 'VT', 'RI', 'ME', 'CT', 'NJ'];
    const result = [];
    
    // First pass: 15 closest from each priority state
    for (const state of priorityStates) {
      if (byState[state]) {
        result.push(...byState[state].slice(0, 15));
      }
    }
    
    // Second pass: fill remaining slots with closest cities from any state
    const remaining = 100 - result.length;
    if (remaining > 0) {
      const alreadyAdded = new Set(result.map(c => c.id));
      for (const city of sortedByDistance) {
        if (!alreadyAdded.has(city.id) && result.length < 100) {
          result.push(city);
          alreadyAdded.add(city.id);
        }
      }
    }
    
    // Apply blacklist filter
    balancedDest = result.filter(c => !isBlacklisted(c.city, c.state_or_province || c.state, dbBlacklist));
    
    console.log(`[generateOptionsForLane] ✅ NE lane: Selected ${balancedDest.length} cities by distance priority`);
    const stateBreakdown = {};
    balancedDest.forEach(c => {
      stateBreakdown[c.state_or_province] = (stateBreakdown[c.state_or_province] || 0) + 1;
    });
    console.log(`[generateOptionsForLane] 📊 Final state breakdown:`, stateBreakdown);
  } else if (isNewJerseyLane) {
    // For NJ lanes, ensure NJ cities are well-represented
    const sortedByDistance = [...destOptions].sort((a, b) => a.distance - b.distance);
    
    // Group by state
    const byState = {};
    for (const c of sortedByDistance) {
      const state = c.state_or_province || c.state;
      if (!byState[state]) byState[state] = [];
      byState[state].push(c);
    }
    
    // Prioritize NJ cities, then nearby states
    const priorityStates = ['NJ', 'PA', 'NY', 'CT', 'MA'];
    const result = [];
    
    // First pass: 20 closest from each priority state
    for (const state of priorityStates) {
      if (byState[state]) {
        result.push(...byState[state].slice(0, 20));
      }
    }
    
    // Fill remaining slots
    const remaining = 100 - result.length;
    if (remaining > 0) {
      const alreadyAdded = new Set(result.map(c => c.id));
      for (const city of sortedByDistance) {
        if (!alreadyAdded.has(city.id) && result.length < 100) {
          result.push(city);
          alreadyAdded.add(city.id);
        }
      }
    }
    
    // Apply blacklist filter
    balancedDest = result.filter(c => !isBlacklisted(c.city, c.state_or_province || c.state, dbBlacklist));
    
    console.log(`[generateOptionsForLane] ✅ NJ lane: Selected ${balancedDest.length} cities with NJ priority`);
    const stateBreakdown = {};
    balancedDest.forEach(c => {
      stateBreakdown[c.state_or_province] = (stateBreakdown[c.state_or_province] || 0) + 1;
    });
    console.log(`[generateOptionsForLane] 📊 Final state breakdown:`, stateBreakdown);
  } else if (isTexasLane && destState === 'TX') {
    // For TX lanes, ensure we get a good distribution of TX cities across all KMAs
    // User Update: "pull the best 10 cities in each KMA"
    const sortedByDistance = [...destOptions].sort((a, b) => a.distance - b.distance);
    
    // Group by KMA
    const byKMA = {};
    for (const c of sortedByDistance) {
      const kma = c.kma_code || 'UNK';
      if (!byKMA[kma]) byKMA[kma] = [];
      byKMA[kma].push(c);
    }
    
    // Prioritize Market City in each KMA (Same logic as balanceByKMA)
    for (const kma in byKMA) {
      const marketCityIndex = byKMA[kma].findIndex(c => {
        if (!c.kma_name) return false;
        const kmaName = normalizeCityName(c.kma_name);
        const cityName = normalizeCityName(c.city);
        return kmaName === cityName;
      });

      if (marketCityIndex > 0) { // If found and not already first
        const marketCity = byKMA[kma].splice(marketCityIndex, 1)[0];
        byKMA[kma].unshift(marketCity); // Move to top
      }
    }

    // Take best 10 from each KMA
    const result = [];
    const kmaKeys = Object.keys(byKMA);
    
    // Pass: 10 best from each KMA
    for (const kma of kmaKeys) {
      result.push(...byKMA[kma].slice(0, 10));
    }
    
    // Apply blacklist filter
    balancedDest = result.filter(c => !isBlacklisted(c.city, c.state_or_province || c.state, dbBlacklist));
    
    console.log(`[generateOptionsForLane] ✅ TX lane: Selected ${balancedDest.length} cities with "Top 10 per KMA" priority`);
    const stateBreakdown = {};
    balancedDest.forEach(c => {
      stateBreakdown[c.state_or_province] = (stateBreakdown[c.state_or_province] || 0) + 1;
    });
    console.log(`[generateOptionsForLane] 📊 Final state breakdown:`, stateBreakdown);
  } else if (isCanadianLane) {
    // For Canadian lanes, just take all available cities (since we only have major ones)
    balancedDest = destOptions;
    console.log(`[generateOptionsForLane] ✅ Canadian lane: Selected ${balancedDest.length} cities`);
  } else {
    balancedDest = balanceByKMA(destOptions, 100, dbBlacklist, dbCorrections); // Keep up to 100 diverse cities
    console.log(`[generateOptionsForLane] ✅ After balanceByKMA: ${balancedDest.length} destination cities`);
  }
  
  const finalDest = dedupeFinal(balancedDest);

  console.log(`📊 Final counts: ${finalOrigin.length} origin cities, ${finalDest.length} destination cities`);
  
  return {
    laneId,
    origin: { city: lane.origin_city, state: lane.origin_state, options: finalOrigin },
    destination: { 
      city: lane.destination_city || lane.dest_city, 
      state: lane.destination_state || lane.dest_state, 
      options: finalDest 
    },
    originOptions: finalOrigin,
    destOptions: finalDest,
    _debug: {
      isNewEnglandLane,
      destStateCode: normalizeStateCode(destState),
      originStateCode: normalizeStateCode(originState),
      hubsFetched: {
        origin: originHubs.length,
        dest: destHubs.length
      },
      preFilterDestCount: isNewEnglandLane ? 'see logs' : 'N/A',
      finalDestCount: finalDest.length,
      sampleDestCities: finalDest.slice(0, 5).map(c => ({
        city: c.city,
        state: c.state || c.state_or_province,
        kma: c.kma_code
      })),
      boundingBox: { latMin, latMax, lonMin, lonMax },
      destCoords: { destLat, destLon },
      totalCitiesFromDB: enriched.length
    }
  };
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'Method not allowed' });

  // Normalize the request body to handle both snake_case and camelCase
  let normalizedBody = req.body;
  if (normalizedBody) {
    normalizedBody = {
      ...normalizedBody,
      laneId: normalizedBody.laneId || normalizedBody.lane_id || '',
      originCity: normalizedBody.originCity || normalizedBody.origin_city || '',
      originState: normalizedBody.originState || normalizedBody.origin_state || '',
      destinationCity: normalizedBody.destinationCity || normalizedBody.destination_city || normalizedBody.dest_city || '',
      destinationState: normalizedBody.destinationState || normalizedBody.destination_state || normalizedBody.dest_state || '',
      equipmentCode: normalizedBody.equipmentCode || normalizedBody.equipment_code || '',
    };
  }

  const parsed = ApiSchema.safeParse(normalizedBody);
  if (!parsed.success) {
    console.error('API validation failed:', parsed.error.flatten());
    return res.status(400).json({ 
      ok: false, 
      error: 'Missing or invalid body', 
      detail: parsed.error.flatten(),
      receivedBody: JSON.stringify(req.body)
    });
  }

  try {
    // Initialize admin client lazily so we can catch env errors
    let supabaseAdmin;
    try {
      supabaseAdmin = (await import('@/lib/supabaseAdmin')).default;
    } catch (e) {
      console.error('[API/post-options] Admin client init failed:', e?.message || e);
      return res.status(500).json({ ok: false, error: 'Server configuration error: admin client unavailable' });
    }
    // Branch detection
    const { lanes: batchLanes } = req.body || {};
    const laneId = parsed.data.laneId;

    // --- Batch Mode ---------------------------------------------------------
    if (Array.isArray(batchLanes)) {
      if (batchLanes.length === 0) return res.status(400).json({ ok: false, error: 'No lanes provided' });

      // Timeout wrapper for coordinate lookups (3s max)
      function withTimeout(promise, ms = 3000) {
        return Promise.race([
          promise,
          new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), ms))
        ]);
      }

      // Concurrency limiter (max 5)
      function limitPool(limit) {
        let active = 0; const queue = [];
        const run = (fn, resolve, reject) => {
          active++;
          fn().then(resolve).catch(reject).finally(() => {
            active--; if (queue.length) { const next = queue.shift(); next(); }
          });
        };
        return fn => new Promise((resolve, reject) => {
          if (active < limit) run(fn, resolve, reject); else queue.push(() => run(fn, resolve, reject));
        });
      }
      const limiter = limitPool(5);

      const CHUNK_SIZE = 20;
      let success = 0; let failed = 0; const results = [];

      // Process lanes in chunks immediately after enrichment
      for (let i = 0; i < batchLanes.length; i += CHUNK_SIZE) {
        const slice = batchLanes.slice(i, i + CHUNK_SIZE);

        // Deduplicate ZIPs for this chunk
        const zipSet = new Set();
        slice.forEach(l => {
          if (l.origin_zip5) zipSet.add(l.origin_zip5);
          if (l.dest_zip5) zipSet.add(l.dest_zip5);
        });
        const uniqueZips = Array.from(zipSet);

        // Concurrent coord lookup with timeout
        const zipCache = new Map();
        const lookupResults = await Promise.allSettled(
          uniqueZips.map(z => limiter(() => withTimeout(resolveCoords(z))))
        );
        uniqueZips.forEach((z, idx) => {
          const result = lookupResults[idx];
          if (result.status === 'fulfilled') {
            zipCache.set(z, result.value);
          } else {
            console.error(`[post-options] coord lookup failed for ${z}:`, result.reason?.message);
            zipCache.set(z, null);
          }
        });

        // Enrich chunk
        const enriched = slice.map(l => {
          const o = l.origin_zip5 ? zipCache.get(l.origin_zip5) : null;
          const d = l.dest_zip5 ? zipCache.get(l.dest_zip5) : null;
          return {
            ...l,
            origin_zip: l.origin_zip5 ? l.origin_zip5.slice(0,3) : (l.origin_zip || null),
            dest_zip: l.dest_zip5 ? l.dest_zip5.slice(0,3) : (l.dest_zip || null),
            origin_latitude: o?.latitude ?? null,
            origin_longitude: o?.longitude ?? null,
            dest_latitude: d?.latitude ?? null,
            dest_longitude: d?.longitude ?? null,
            lane_status: l.lane_status || 'current',
            origin_kma: o?.kma_code ?? null,
            dest_kma: d?.kma_code ?? null,
          };
        });

        // Per-lane upsert with tracking
        const upsertResults = await Promise.allSettled(
          enriched.map(async (c) => {
            const payload = {
              origin_city: c.origin_city,
              origin_state: c.origin_state,
              origin_zip5: c.origin_zip5,
              origin_zip: c.origin_zip,
              dest_city: c.dest_city,
              dest_state: c.dest_state,
              dest_zip5: c.dest_zip5,
              dest_zip: c.dest_zip,
              equipment_code: c.equipment_code || 'V',
              length_ft: c.length_ft || 48,
              full_partial: c.full_partial || 'full',
              pickup_earliest: c.pickup_earliest || new Date().toISOString().split('T')[0],
              pickup_latest: c.pickup_latest || c.pickup_earliest || new Date().toISOString().split('T')[0],
              randomize_weight: !!c.randomize_weight,
              weight_lbs: c.weight_lbs || null,
              weight_min: c.weight_min || null,
              weight_max: c.weight_max || null,
              comment: c.comment || null,
              commodity: c.commodity || null,
              lane_status: c.lane_status,
              origin_latitude: c.origin_latitude,
              origin_longitude: c.origin_longitude,
              dest_latitude: c.dest_latitude,
              dest_longitude: c.dest_longitude,
            };
            const { error } = await supabaseAdmin.from('lanes').upsert([payload], { onConflict: 'id' });
            if (error) throw new Error(error.message);
            return { lane: c, status: 'success' };
          })
        );

        // Track per-lane results
        upsertResults.forEach((r, idx) => {
          const lane = enriched[idx];
          if (r.status === 'fulfilled') {
            success++;
            results.push({ laneId: lane.id || `${lane.origin_city}-${lane.dest_city}`, status: 'success' });
          } else {
            failed++;
            results.push({ laneId: lane.id || `${lane.origin_city}-${lane.dest_city}`, status: 'failed', error: r.reason?.message || 'Unknown error' });
          }
        });
      }

      return res.status(200).json({ ok: true, total: batchLanes.length, success, failed, results });
    }

    // --- Legacy Single-Lane Options Mode ------------------------------------
    try {
      const details = await generateOptionsForLane(laneId, supabaseAdmin);
      console.log('[post-options] Generated options for lane:', laneId, 'Details:', JSON.stringify(details).substring(0, 200));
      return res.status(200).json({ ok: true, ...details });
    } catch (laneErr) {
      console.error('[post-options] Error generating options for lane:', laneId, 'Error:', laneErr.message);
      return res.status(400).json({ ok: false, error: laneErr.message });
    }
  } catch (err) {
    console.error('post-options API fatal', err);
    return res.status(500).json({ ok: false, error: err.message || 'Internal error' });
  }
}
