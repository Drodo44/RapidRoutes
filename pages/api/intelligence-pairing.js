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
    kma: rec.kma_code || rec.kma || null
  };
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

    const originCandidates = originRaw.map(normalizeCity).filter(c => c.kma);
    const destCandidates = destRaw.map(normalizeCity).filter(c => c.kma);
    debugLog('Normalized candidate counts', { origin: originCandidates.length, destination: destCandidates.length });

    if (originCandidates.length === 0) throw new Error('NO_ORIGIN_CANDIDATES');
    if (destCandidates.length === 0) throw new Error('NO_DESTINATION_CANDIDATES');

    const uniqueOriginKmasSet = new Set(originCandidates.map(c => c.kma));
    const uniqueDestKmasSet = new Set(destCandidates.map(c => c.kma));
    const unionKmasSet = new Set([...uniqueOriginKmasSet, ...uniqueDestKmasSet]);
    debugLog('Unique KMA sets', { origin: [...uniqueOriginKmasSet], destination: [...uniqueDestKmasSet], unionSize: unionKmasSet.size });
  // Minimum required diversity threshold (updated from 6 -> 5)
  const MIN_UNIQUE_KMAS = 5;
    if (unionKmasSet.size < MIN_UNIQUE_KMAS) {
      debugLog('Diversity failure', { union: unionKmasSet.size, required: MIN_UNIQUE_KMAS, originUnique: uniqueOriginKmasSet.size, destUnique: uniqueDestKmasSet.size });
      throw new Error(`INSUFFICIENT_KMA_DIVERSITY union=${unionKmasSet.size} (<${MIN_UNIQUE_KMAS}) originUnique=${uniqueOriginKmasSet.size} destUnique=${uniqueDestKmasSet.size}`);
    }

    // Build cartesian product with dedupe & cap
    const MAX_CARTESIAN = 200; // defensive cap
    const pairSet = new Set();
    const pairs = [];
    for (const o of originCandidates) {
      for (const d of destCandidates) {
        if (o.city === d.city && o.state === d.state) continue; // skip self
        const key = `${o.kma}|${d.kma}|${o.zip}|${d.zip}`;
        if (pairSet.has(key)) continue;
        pairSet.add(key);
        pairs.push({ origin: o, destination: d });
        if (pairs.length >= MAX_CARTESIAN) break;
      }
      if (pairs.length >= MAX_CARTESIAN) break;
    }

    if (pairs.length === 0) throw new Error('NO_CITY_PAIRS');

    debugLog('Final pairs built', { count: pairs.length, uniqueOriginKmas: uniqueOriginKmasSet.size, uniqueDestKmas: uniqueDestKmasSet.size, sample: pairs.slice(0, 3) });

    const response = {
      dataSourceType: 'database',
      totalCityPairs: pairs.length,
      uniqueOriginKmas: uniqueOriginKmasSet.size,
      uniqueDestKmas: uniqueDestKmasSet.size,
      pairs
    };
    return res.status(200).json(response);
  } catch (err) {
    debugLog('Error', { message: err.message, stack: err.stack });
    const status = err.message.startsWith('NO_') || err.message.startsWith('INSUFFICIENT_') ? 400 : 500;
    return res.status(status).json({ error: err.message, dataSourceType: 'database', pairs: [], totalCityPairs: 0 });
  } finally {
    debugLog('Processing time ms', Date.now() - startTime, 'requestId', requestId);
  }
}

console.log('🚀 Pairing Logic Version: strict-v2.0 (radius=100, no-fallbacks)');
