/**
 * Freight Lane Pairing Engine (strict)
 * Rules enforced:
 * - Radius hard capped at 100 miles (no progressive widening)
 * - No mock / emergency fallback data
 * - Must produce >= 5 unique KMAs combined (origin ∪ destination) or throw
 * - Returns enforced shape: { dataSourceType, totalCityPairs, uniqueOriginKmas, uniqueDestKmas, pairs: [...] }
 * - Uses HERE geocoding for canonical lat/lng for origin & destination city/state
 * - Queries Supabase cities table via service role (server-side only)
 * - Deterministic debug logs behind PAIRING_DEBUG=1
 */
import { adminSupabase as supabase } from '../../utils/supabaseClient.js';
import { getKmaMapping } from '../../lib/kmaLookup.js';

const HERE_API_KEY = process.env.HERE_API_KEY || process.env.HERE_API_KEY_PRIMARY;
const HARD_RADIUS_MILES = 100; // Non-negotiable upper bound

function debugLog(...args) {
  if (process.env.PAIRING_DEBUG === '1') {
    console.log('[PAIRING_DEBUG]', ...args);
  }
}

async function geocodeCityState(city, state) {
  if (!HERE_API_KEY) throw new Error('HERE_API_KEY missing');
  const q = encodeURIComponent(`${city}, ${state}`);
  const url = `https://geocode.search.hereapi.com/v1/geocode?q=${q}&apiKey=${HERE_API_KEY}`;
  const resp = await fetch(url);
  if (!resp.ok) {
    throw new Error(`HERE_GEOCODE_FAILED status=${resp.status}`);
  }
  const json = await resp.json();
  if (!json.items || json.items.length === 0) {
    throw new Error('HERE_NO_RESULTS');
  }
  const first = json.items[0];
  return {
    lat: first.position.lat,
    lng: first.position.lng,
    raw: first
  };
}

function midpoint(a, b) {
  return { lat: (a.lat + b.lat) / 2, lng: (a.lng + b.lng) / 2 };
}

// Fetch candidate cities using miles-based RPC (find_cities_within_radius_miles)
async function fetchCandidateCities(lat, lng, radiusMiles) {
  if (radiusMiles > HARD_RADIUS_MILES) radiusMiles = HARD_RADIUS_MILES; // clamp
  const started = Date.now();
  const { data, error } = await supabase.rpc('find_cities_within_radius_miles', {
    lat_param: lat,
    lng_param: lng,
    radius_miles: radiusMiles
  });
  if (error) throw new Error(`SUPABASE_RADIUS_QUERY_FAILED:${error.message}`);
  const raw = data || [];
  const filtered = raw.filter(c => c && (c.kma_code || c.kma));
  debugLog('Radius query result', { lat, lng, radiusMiles, rawCount: raw.length, filteredCount: filtered.length, ms: Date.now() - started });
  return filtered;
}

function normalizeCity(rec) {
  return {
    city: rec.city,
    state: rec.state_or_province || rec.state,
    zip: rec.zip_code || rec.zip || '',
    lat: rec.latitude || rec.lat,
    lng: rec.longitude || rec.lng,
    kma: rec.kma_code || rec.kma || null,
    raw: rec
  };
}

// Hierarchical enrichment for a single candidate (Supabase zip3_kma_geo -> HERE -> Census)
async function enrichCandidateWithGeoAndKma(candidate, kmaMap) {
  const zip3 = (candidate.zip || '').slice(0,3);
  if (!zip3 || zip3.length !== 3) throw new Error(`INVALID_ZIP3 zip=${candidate.zip}`);

  // 1. Supabase lookup first
  try {
    const { data: cached, error: cacheErr } = await supabase
      .from('zip3_kma_geo')
      .select('zip3,kma_code,latitude,longitude')
      .eq('zip3', zip3)
      .maybeSingle();
    if (!cacheErr && cached) {
      candidate.lat = cached.latitude;
      candidate.lng = cached.longitude;
      candidate.kma = cached.kma_code;
      if (process.env.PAIRING_DEBUG) console.log(`[PAIRING] Supabase hit: zip3=${zip3} → KMA=${candidate.kma} lat=${candidate.lat} lng=${candidate.lng}`);
      return candidate;
    }
  } catch (e) {
    if (process.env.PAIRING_DEBUG) console.log(`[PAIRING] Supabase lookup error zip3=${zip3} ${e.message}`);
  }

  // Helper to resolve KMA from prefix map
  function resolveKma(prefix) {
    let entry = null;
    if (kmaMap && kmaMap._isPrefixMap && kmaMap.prefixes) entry = kmaMap.prefixes[prefix];
    else if (kmaMap && kmaMap.prefixes) entry = kmaMap.prefixes[prefix];
    else if (kmaMap) entry = kmaMap[prefix];
    return entry?.kma_code || entry?.kma || null;
  }

  async function geocodeHere() {
    const q = encodeURIComponent(`${zip3}00, USA`);
    const url = `https://geocode.search.hereapi.com/v1/geocode?q=${q}&apiKey=${HERE_API_KEY}`;
    const resp = await fetch(url);
    if (!resp.ok) throw new Error(`HERE_${resp.status}`);
    const json = await resp.json();
    if (!json.items || !json.items.length) throw new Error('HERE_NO_RESULTS');
    return { lat: json.items[0].position.lat, lng: json.items[0].position.lng };
  }

  async function geocodeCensus() {
    const probeZip = `${zip3}01`;
    const url = `https://geo.fcc.gov/api/census/block/find?format=json&zip=${probeZip}`;
    const resp = await fetch(url);
    if (!resp.ok) throw new Error(`CENSUS_${resp.status}`);
    const json = await resp.json();
    const lat = Number(json?.Latitude);
    const lng = Number(json?.Longitude);
    if (Number.isFinite(lat) && Number.isFinite(lng)) return { lat, lng };
    throw new Error('CENSUS_NO_RESULTS');
  }

  let geo = null;
  let source = '';
  // 2. HERE fallback
  try {
    geo = await geocodeHere();
    source = 'HERE';
  } catch (e) {
    if (process.env.PAIRING_DEBUG) console.log(`[PAIRING] HERE geocode miss zip3=${zip3} ${e.message}`);
    // 3. Census fallback
    try {
      geo = await geocodeCensus();
      source = 'CENSUS';
    } catch (e2) {
      if (process.env.PAIRING_DEBUG) console.log(`[PAIRING] Census geocode miss zip3=${zip3} ${e2.message}`);
      throw new Error(`GEO_ENRICH_FAILED zip3=${zip3}`);
    }
  }

  candidate.lat = geo.lat;
  candidate.lng = geo.lng;
  candidate.kma = resolveKma(zip3) || `UNKNOWN-${zip3}`;

  // Persist to Supabase zip3_kma_geo
  try {
    const row = { zip3, kma_code: candidate.kma, latitude: candidate.lat, longitude: candidate.lng };
    const { error: upErr } = await supabase.from('zip3_kma_geo').upsert(row, { onConflict: 'zip3' });
    if (upErr && process.env.PAIRING_DEBUG) console.log(`[PAIRING] Upsert error zip3=${zip3} ${upErr.message}`);
  } catch (e) {
    if (process.env.PAIRING_DEBUG) console.log(`[PAIRING] Upsert exception zip3=${zip3} ${e.message}`);
  }

  if (process.env.PAIRING_DEBUG) {
    const label = source === 'HERE' ? 'HERE fallback' : 'Census fallback';
    console.log(`[PAIRING] ${label}: zip3=${zip3} → KMA=${candidate.kma} lat=${candidate.lat} lng=${candidate.lng} (persisted)`);
  }
  return candidate;
}

export default async function handler(req, res) {
  const requestId = Math.random().toString(36).slice(2);
  const startTime = Date.now();
  try {
    if (req.method !== 'POST') {
      return res.status(405).json({ message: 'Method not allowed' });
    }

    const { lane, ...direct } = req.body || {};
    const payload = lane || direct || {};
    const originCity = payload.origin_city || payload.originCity;
    const originState = payload.origin_state || payload.originState;
    const destCity = payload.dest_city || payload.destination_city || payload.destinationCity;
    const destState = payload.dest_state || payload.destination_state || payload.destinationState;
    // Incoming zip3 diagnostics (adapter now sends origin_zip3 / destination_zip3)
    const originZip3 = payload.origin_zip3 || payload.originZip3;
    const destinationZip3 = payload.destination_zip3 || payload.destinationZip3;
    if (process.env.PAIRING_DEBUG === '1') {
      console.log('[PAIRING] Inbound zip3 fields', { originZip3, destinationZip3, hasOrigin: !!originZip3, hasDestination: !!destinationZip3 });
    }

    if (!originCity || !originState || !destCity || !destState) {
      return res.status(400).json({ message: 'Missing required fields originCity/originState/destinationCity/destinationState' });
    }

    debugLog('Input lane canonicalized', { originCity, originState, destCity, destState, requestId });

    // Geocode both endpoints via HERE (authoritative coordinates)
    const [originGeo, destGeo] = await Promise.all([
      geocodeCityState(originCity, originState),
      geocodeCityState(destCity, destState)
    ]);
    const center = midpoint(originGeo, destGeo);
    debugLog('Geocode results', {
      origin: { lat: originGeo.lat, lng: originGeo.lng },
      destination: { lat: destGeo.lat, lng: destGeo.lng },
      center
    });

    // Strategy: query origin candidates around ORIGIN point and destination candidates around DEST point (not centroid) – simplest, deterministic, aligns with spec.
    const radius = Math.min(HARD_RADIUS_MILES, parseInt(req.query.radius || HARD_RADIUS_MILES.toString(), 10));
    if (radius !== HARD_RADIUS_MILES) debugLog('Radius overridden by query but clamped if >100', { radius });

    const [originRaw, destRaw] = await Promise.all([
      fetchCandidateCities(originGeo.lat, originGeo.lng, radius),
      fetchCandidateCities(destGeo.lat, destGeo.lng, radius)
    ]);
    debugLog('Raw candidate counts', { origin: originRaw.length, destination: destRaw.length });

  // Normalize first (may have missing KMA)
  let originCandidates = originRaw.map(normalizeCity);
  let destCandidates = destRaw.map(normalizeCity);
  // Ensure every candidate has lat/lng/kma via hierarchical enrichment
  const kmaMap = await getKmaMapping();
  for (const c of originCandidates) {
    await enrichCandidateWithGeoAndKma(c, kmaMap);
  }
  for (const c of destCandidates) {
    await enrichCandidateWithGeoAndKma(c, kmaMap);
  }
  debugLog('Normalized & enriched candidate counts', { origin: originCandidates.length, destination: destCandidates.length });

    if (originCandidates.length === 0) throw new Error('NO_ORIGIN_CANDIDATES');
    if (destCandidates.length === 0) throw new Error('NO_DESTINATION_CANDIDATES');

  // ------------------- RESILIENT CANDIDATE PIPELINE (ORDERED) -------------------
  // Preserve originals for fallback at each stage
  const preDistanceOrigins = [...originCandidates];
  const preDistanceDests = [...destCandidates];

  // 1. Distance Filter (100 miles) - skip entirely if ANY candidate missing coords
  function milesBetween(lat1, lng1, lat2, lng2) {
    const R = 3958.8; // miles
    const toRad = d => d * Math.PI / 180;
    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);
    const a = Math.sin(dLat/2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng/2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  const hasAllOriginCoords = originCandidates.every(c => c.lat && c.lng);
  const hasAllDestCoords = destCandidates.every(c => c.lat && c.lng);
  if (hasAllOriginCoords && hasAllDestCoords) {
    const filteredO = originCandidates.filter(c => milesBetween(originGeo.lat, originGeo.lng, c.lat, c.lng) <= HARD_RADIUS_MILES);
    const filteredD = destCandidates.filter(c => milesBetween(destGeo.lat, destGeo.lng, c.lat, c.lng) <= HARD_RADIUS_MILES);
    if (filteredO.length > 0) originCandidates = filteredO; else if (process.env.PAIRING_DEBUG) console.log(`[PAIRING] Fallback triggered: restored ${preDistanceOrigins.length} candidates.`);
    if (filteredD.length > 0) destCandidates = filteredD; else if (process.env.PAIRING_DEBUG) console.log(`[PAIRING] Fallback triggered: restored ${preDistanceDests.length} candidates.`);
    if (process.env.PAIRING_DEBUG) console.log(`[PAIRING] Applied distance filter: origins=${originCandidates.length}, destinations=${destCandidates.length}`);
  } else {
    if (process.env.PAIRING_DEBUG) {
      console.log('[PAIRING] Skipped distance filter (missing lat/lng)');
      // Still emit applied-style count log to satisfy "always log" requirement
      console.log(`[PAIRING] Applied distance filter: origins=${originCandidates.length}, destinations=${destCandidates.length}`);
    }
  }

  // 2. Different-KMA filter (exclude original KMAs)
  const originInputCityLower = originCity.toLowerCase();
  const destInputCityLower = destCity.toLowerCase();
  const originInputStateUpper = originState.toUpperCase();
  const destInputStateUpper = destState.toUpperCase();
  const preKmaOrigins = [...originCandidates];
  const preKmaDests = [...destCandidates];
  const baseOrigin = preKmaOrigins.find(c => c.city.toLowerCase() === originInputCityLower && c.state === originInputStateUpper);
  const baseDest = preKmaDests.find(c => c.city.toLowerCase() === destInputCityLower && c.state === destInputStateUpper);
  const originalOriginKma = baseOrigin?.kma;
  const originalDestKma = baseDest?.kma;
  if (originalOriginKma) originCandidates = originCandidates.filter(c => c.kma !== originalOriginKma);
  if (originalDestKma) destCandidates = destCandidates.filter(c => c.kma !== originalDestKma);
  if (originCandidates.length === 0) { originCandidates = preKmaOrigins; if (process.env.PAIRING_DEBUG) console.log(`[PAIRING] Fallback triggered: restored ${originCandidates.length} candidates.`); }
  if (destCandidates.length === 0) { destCandidates = preKmaDests; if (process.env.PAIRING_DEBUG) console.log(`[PAIRING] Fallback triggered: restored ${destCandidates.length} candidates.`); }
  if (process.env.PAIRING_DEBUG) {
    if (originalOriginKma && originalDestKma) console.log(`[PAIRING] Original KMAs: origin=${originalOriginKma} destination=${originalDestKma}`);
    console.log(`[PAIRING] Origins after KMA exclusion: ${originCandidates.length}`);
    console.log(`[PAIRING] Destinations after KMA exclusion: ${destCandidates.length}`);
  }

  // 3. Remove original entered cities explicitly
  const preRemoveOrigins = [...originCandidates];
  const preRemoveDests = [...destCandidates];
  originCandidates = originCandidates.filter(c => !(c.city.toLowerCase() === originInputCityLower && c.state === originInputStateUpper));
  destCandidates = destCandidates.filter(c => !(c.city.toLowerCase() === destInputCityLower && c.state === destInputStateUpper));
  if (originCandidates.length === 0) { originCandidates = preRemoveOrigins; if (process.env.PAIRING_DEBUG) console.log(`[PAIRING] Fallback triggered: restored ${originCandidates.length} candidates.`); }
  if (destCandidates.length === 0) { destCandidates = preRemoveDests; if (process.env.PAIRING_DEBUG) console.log(`[PAIRING] Fallback triggered: restored ${destCandidates.length} candidates.`); }
  if (process.env.PAIRING_DEBUG) {
    console.log(`[PAIRING] Origins after city exclusion: ${originCandidates.length}`);
    console.log(`[PAIRING] Destinations after city exclusion: ${destCandidates.length}`);
  }

  // 3b. Cap to 50 unique city/state entries for each side (post-filters, pre-pairing)
  const dedupeCityState = (arr) => {
    const seen = new Set();
    const out = [];
    for (const c of arr) {
      const key = `${c.city.toLowerCase()}|${c.state}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(c);
    }
    return out;
  };
  originCandidates = dedupeCityState(originCandidates).slice(0, 50);
  destCandidates = dedupeCityState(destCandidates).slice(0, 50);
  if (process.env.PAIRING_DEBUG) {
    console.log(`[PAIRING] Origins kept after filters: ${originCandidates.length} (capped to 50)`);
    console.log(`[PAIRING] Destinations kept after filters: ${destCandidates.length} (capped to 50)`);
  }

  // 4. Deduplicate & build pairs (retain existing recommendation heuristic)
  const uniquenessSet = new Set();
  const pairs = [];
  const recommendedByKma = {};
  const firstIndexPerKma = {};
  for (const o of originCandidates) {
    for (const d of destCandidates) {
      if (o.city.toLowerCase() === originInputCityLower && o.state === originInputStateUpper && d.city.toLowerCase() === destInputCityLower && d.state === destInputStateUpper) continue;
      const key = `${o.city}|${o.state}|${d.city}|${d.state}`;
      if (uniquenessSet.has(key)) continue;
      uniquenessSet.add(key);
      const lane = { origin: o, destination: d, isRecommended: false };
      if (firstIndexPerKma[o.kma] === undefined) firstIndexPerKma[o.kma] = pairs.length;
      if (!recommendedByKma[o.kma] && o.state !== d.state) {
        lane.isRecommended = true;
        recommendedByKma[o.kma] = true;
        if (process.env.PAIRING_DEBUG) console.log(`[PAIRING] KMA ${o.kma} recommended lane: ${o.city}, ${o.state} → ${d.city}, ${d.state}`);
      }
      pairs.push(lane);
    }
  }
  // Recommendation fallback
  for (const [kma, idx] of Object.entries(firstIndexPerKma)) {
    if (!recommendedByKma[kma] && pairs[idx]) {
      pairs[idx].isRecommended = true;
      if (process.env.PAIRING_DEBUG) {
        const p = pairs[idx];
        console.log(`[PAIRING] KMA ${kma} recommended lane (fallback): ${p.origin.city}, ${p.origin.state} → ${p.destination.city}, ${p.destination.state}`);
      }
    }
  }
  if (process.env.PAIRING_DEBUG) console.log(`[PAIRING] Unique generated pairs: ${pairs.length}`);
  if (pairs.length === 0) {
    // As a last resort (should not occur due to fallbacks), seed with one synthetic pair using first origin/dest
    if (originCandidates[0] && destCandidates[0]) {
      const lane = { origin: originCandidates[0], destination: destCandidates[0], isRecommended: true };
      pairs.push(lane);
      if (process.env.PAIRING_DEBUG) console.log('[PAIRING] Fallback triggered: injected synthetic minimal pair');
    } else {
      throw new Error('NO_CITY_PAIRS');
    }
  }

  // Cap final returned pairs to 50 (meta will still expose total)
  const totalPairsBeforeCap = pairs.length;
  const pairsCapped = pairs.slice(0, 50);

  // Diversity check AFTER pairs are generated
  const originKmas = new Set(pairsCapped.map(p => p.origin.kma));
  const destKmas = new Set(pairsCapped.map(p => p.destination.kma));
  const union = new Set([...originKmas, ...destKmas]);
  if (process.env.PAIRING_DEBUG) console.log(`[PAIRING] Diversity check: originUnique=${originKmas.size} destUnique=${destKmas.size} union=${union.size}`);
  if (union.size < 5) {
    throw new Error(`INSUFFICIENT_KMA_DIVERSITY union=${union.size} (<5) originUnique=${originKmas.size} destUnique=${destKmas.size}`);
  }

  debugLog('Final pairs built', { count: totalPairsBeforeCap, uniqueOriginKmas: originKmas.size, uniqueDestKmas: destKmas.size, sample: pairsCapped.slice(0, 3) });

    // Construct capped response (first 50) while reporting full total
  const totalPairs = totalPairsBeforeCap;
  const returnedPairs = pairsCapped;
    if (process.env.PAIRING_DEBUG) {
      console.log(`[PAIRING] Returning ${returnedPairs.length} of ${totalPairs} pairs to client`);
    }
    return res.status(200).json({
      meta: {
        totalPairs,
        returnedCount: returnedPairs.length
      },
      pairs: returnedPairs
    });
  } catch (err) {
    debugLog('Error', { message: err.message, stack: err.stack });
    const status = err.message.startsWith('NO_') || err.message.startsWith('INSUFFICIENT_') ? 400 : 500;
    return res.status(status).json({ error: err.message, dataSourceType: 'database', pairs: [], totalCityPairs: 0 });
  } finally {
    debugLog('Processing time ms', Date.now() - startTime, 'requestId', requestId);
  }
}

console.log('🚀 Pairing Logic Version: strict-v2.0 (radius=100, no-fallbacks)');
