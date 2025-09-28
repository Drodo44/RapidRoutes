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

async function enrichKma(cities) {
  if (!cities || cities.length === 0) return cities;
  const map = await getKmaMapping();
  const toPersist = [];
  for (const c of cities) {
    if (c.kma) continue; // already has kma
    if (!c.zip) continue; // cannot enrich without zip
    let entry = null;
    if (map && map._isPrefixMap) {
      const prefix = c.zip.slice(0,3);
      entry = map.prefixes[prefix];
    } else {
      entry = map[c.zip];
    }
    if (entry) {
      c.kma = entry.kma_code;
      c.kma_name = entry.kma_name;
      // queue persistence if original record lacked kma
      if (c.raw && (!c.raw.kma_code && !c.raw.kma)) {
        toPersist.push({ zip: c.zip, kma_code: entry.kma_code });
      }
    } else {
      // If we cannot enrich, throw (strict requirement for full coverage)
      throw new Error(`MISSING_KMA_ENRICHMENT zip=${c.zip}`);
    }
  }
  // Optional persistence back to Supabase (best-effort, non-blocking)
  if (toPersist.length > 0 && supabase) {
    try {
      // Assuming cities table has zip and kma_code columns
      const updates = toPersist.map(r => ({ zip: r.zip, kma_code: r.kma_code }));
      // Upsert by zip if RLS allows; ignore errors silently (debug only)
      const { error } = await supabase.from('cities').upsert(updates, { onConflict: 'zip' });
      if (error) debugLog('KMA persistence error', error.message);
      else debugLog('Persisted enriched KMA entries', { count: updates.length });
    } catch (err) {
      debugLog('KMA persistence exception', err.message);
    }
  }
  return cities;
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

  // Normalize first (may have missing KMA)
  let originCandidates = originRaw.map(normalizeCity);
  let destCandidates = destRaw.map(normalizeCity);
  // Enrich missing KMA codes using RateView mapping
  originCandidates = await enrichKma(originCandidates);
  destCandidates = await enrichKma(destCandidates);
  // After enrichment, all should have kma or we throw earlier
  originCandidates = originCandidates.filter(c => c.kma);
  destCandidates = destCandidates.filter(c => c.kma);
    debugLog('Normalized candidate counts', { origin: originCandidates.length, destination: destCandidates.length });

    if (originCandidates.length === 0) throw new Error('NO_ORIGIN_CANDIDATES');
    if (destCandidates.length === 0) throw new Error('NO_DESTINATION_CANDIDATES');

  // --- NEW FILTERING LOGIC: collect candidates excluding original KMAs (within radius already) ---
  const originInputCityLower = originCity.toLowerCase();
  const destInputCityLower = destCity.toLowerCase();
  const originInputStateUpper = originState.toUpperCase();
  const destInputStateUpper = destState.toUpperCase();

  const originalOriginEntry = originCandidates.find(c => c.city.toLowerCase() === originInputCityLower && c.state === originInputStateUpper);
  const originalDestEntry   = destCandidates.find(c => c.city.toLowerCase() === destInputCityLower && c.state === destInputStateUpper);
  const originalOriginKma = originalOriginEntry?.kma;
  const originalDestKma   = originalDestEntry?.kma;

  if (originalOriginKma && originalDestKma && process.env.PAIRING_DEBUG) {
    console.log(`[PAIRING] Original KMAs: origin=${originalOriginKma} destination=${originalDestKma}`);
  }

  // Exclude candidates in the same KMA as the originals (spec requirement)
  if (originalOriginKma) {
    originCandidates = originCandidates.filter(c => c.kma && c.kma !== originalOriginKma);
  }
  if (originalDestKma) {
    destCandidates = destCandidates.filter(c => c.kma && c.kma !== originalDestKma);
  }

  if (process.env.PAIRING_DEBUG) {
    console.log(`[PAIRING] Origins within 100mi (excl. same KMA): ${originCandidates.length}`);
    console.log(`[PAIRING] Destinations within 100mi (excl. same KMA): ${destCandidates.length}`);
  }

  const uniqueOriginKmasSet = new Set(originCandidates.map(c => c.kma));
  const uniqueDestKmasSet = new Set(destCandidates.map(c => c.kma));
  // Destination set kept as-is aside from KMA exclusion.
    const unionKmasSet = new Set([...uniqueOriginKmasSet, ...uniqueDestKmasSet]);
    debugLog('Unique KMA sets', { origin: [...uniqueOriginKmasSet], destination: [...uniqueDestKmasSet], unionSize: unionKmasSet.size });
  // Minimum required diversity threshold (updated from 6 -> 5)
  const MIN_UNIQUE_KMAS = 5;
    if (unionKmasSet.size < MIN_UNIQUE_KMAS) {
      debugLog('Diversity failure', { union: unionKmasSet.size, required: MIN_UNIQUE_KMAS, originUnique: uniqueOriginKmasSet.size, destUnique: uniqueDestKmasSet.size });
      throw new Error(`INSUFFICIENT_KMA_DIVERSITY union=${unionKmasSet.size} (<${MIN_UNIQUE_KMAS}) originUnique=${uniqueOriginKmasSet.size} destUnique=${uniqueDestKmasSet.size}`);
    }

    // Build city-to-city unique lanes (exclude original entered lane) using city/state uniqueness
    const uniquenessSet = new Set();
    const pairs = [];
    const recommendedByKma = {}; // track recommendation per origin KMA
    const firstIndexPerKma = {}; // fallback index if only same-state lanes
    for (const o of originCandidates) {
      for (const d of destCandidates) {
        if (o.city.toLowerCase() === originInputCityLower && o.state === originInputStateUpper &&
            d.city.toLowerCase() === destInputCityLower && d.state === destInputStateUpper) {
          continue; // skip original lane
        }
        const pairKey = `${o.city}|${o.state}|${d.city}|${d.state}`;
        if (uniquenessSet.has(pairKey)) continue;
        uniquenessSet.add(pairKey);
        const pairObj = { origin: o, destination: d, isRecommended: false };
        if (firstIndexPerKma[o.kma] === undefined) firstIndexPerKma[o.kma] = pairs.length;
        if (!recommendedByKma[o.kma] && o.state !== d.state) {
          pairObj.isRecommended = true;
          recommendedByKma[o.kma] = true;
          if (process.env.PAIRING_DEBUG) {
            console.log(`[PAIRING] KMA ${o.kma} recommended lane: ${o.city}, ${o.state} → ${d.city}, ${d.state}`);
          }
        }
        pairs.push(pairObj);
      }
    }
    // Fallback recommendation assignment for KMAs without cross-state lanes
    for (const [kma, idx] of Object.entries(firstIndexPerKma)) {
      if (!recommendedByKma[kma] && pairs[idx]) {
        pairs[idx].isRecommended = true;
        if (process.env.PAIRING_DEBUG) {
          const p = pairs[idx];
          console.log(`[PAIRING] KMA ${kma} recommended lane (fallback): ${p.origin.city}, ${p.origin.state} → ${p.destination.city}, ${p.destination.state}`);
        }
      }
    }
    if (process.env.PAIRING_DEBUG) {
      console.log(`[PAIRING] Unique generated pairs: ${pairs.length}`);
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
