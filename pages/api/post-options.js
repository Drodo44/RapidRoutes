// pages/api/post-options.js
// Extended: supports two modes
// 1) Legacy single-lane option generation (input: { laneId }) returning nearby origin/destination city options
// 2) New enterprise batch lane ingestion (input: { lanes: [...] }) with chunked coordinate enrichment + insert
//    Returns structured { ok, counts: { total, success, failed }, failed: [...] }
// This preserves backward compatibility for existing UI while enabling scalable batch creation.
// Lazy-load admin client inside handler to allow catching init errors
import { resolveCoords } from "@/lib/resolve-coords";
import { z } from 'zod';
// NOTE: Not using external p-limit dependency to avoid adding new package; implementing lightweight limiter inline.

// Cities rejected by DAT - blacklist these from generation
const BLACKLISTED_CITIES = new Set([
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

// City name corrections for DAT compatibility
const CITY_CORRECTIONS = {
  'REDWOOD, OR': 'Redmond, OR',
  'BELLWOOD, VA': 'Elkwood, VA',
  'DASHER, GA': 'Jasper, GA',
  'ENSLEY, FL': 'Ensley, AL'
};

function correctCityName(city, state) {
  const key = `${city}, ${state}`.toUpperCase();
  if (CITY_CORRECTIONS[key]) {
    const corrected = CITY_CORRECTIONS[key].split(', ');
    return { city: corrected[0], state: corrected[1] };
  }
  return { city, state };
}

function isBlacklisted(city, state) {
  const key = `${city}, ${state}`.toUpperCase();
  return BLACKLISTED_CITIES.has(key);
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

// Group results by KMA and spread them evenly
// For each KMA, take the closest cities up to a per-KMA limit
function balanceByKMA(cities, max = 50) {
  // Filter out blacklisted cities and apply corrections
  const filtered = cities
    .filter(c => !isBlacklisted(c.city, c.state_or_province || c.state))
    .map(c => {
      const corrected = correctCityName(c.city, c.state_or_province || c.state);
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

  // Sort each group by distance
  for (const kma in grouped) {
    grouped[kma].sort((a, b) => a.distance - b.distance);
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
  const originLat = lane.origin_latitude;
  const originLon = lane.origin_longitude;
  const destLat = lane.dest_latitude;
  const destLon = lane.dest_longitude;
  if (originLat == null || originLon == null || destLat == null || destLon == null) {
    console.error('[generateOptionsForLane] Missing coordinates for lane:', laneId, { originLat, originLon, destLat, destLon });
    throw new Error('Lane missing coordinates');
  }
  const latMin = Math.min(originLat, destLat) - 3; // Increased from 2 to 3 degrees
  const latMax = Math.max(originLat, destLat) + 3;
  const lonMin = Math.min(originLon, destLon) - 3;
  const lonMax = Math.max(originLon, destLon) + 3;
  const { data: cities, error: cityErr } = await supabaseAdmin
    .from("cities")
    .select("id, city, state_or_province, latitude, longitude, zip, kma_code")
    .gte("latitude", latMin)
    .lte("latitude", latMax)
    .gte("longitude", lonMin)
    .lte("longitude", lonMax);
  if (cityErr) throw new Error('Failed to fetch cities');
  if (!cities || cities.length === 0) throw new Error('No cities found near lane');
  const enriched = [];
  for (const c of cities) {
    let kma = c.kma_code;
    // If no KMA code, try to look it up from zip (first 3 digits)
    if (!kma && c.zip) {
      const zip3 = c.zip.toString().substring(0, 3);
      const { data: zipRow } = await supabaseAdmin
        .from("zip3s")
        .select("kma_code")
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
  const originOptions = enriched
    .map(c => ({ ...c, distance: haversine(originLat, originLon, c.latitude, c.longitude) }))
    .filter(c => c.distance <= 150); // Increased from 100 to 150 miles
  const destOptions = enriched
    .map(c => ({ ...c, distance: haversine(destLat, destLon, c.latitude, c.longitude) }))
    .filter(c => c.distance <= 150); // Increased from 100 to 150 miles
  const balancedOrigin = balanceByKMA(originOptions, 100); // Increased from 50 to 100
  const balancedDest = balanceByKMA(destOptions, 100); // Increased from 50 to 100
  return {
    laneId,
    origin: { city: lane.origin_city, state: lane.origin_state, options: balancedOrigin },
    destination: { 
      city: lane.destination_city || lane.dest_city, 
      state: lane.destination_state || lane.dest_state, 
      options: balancedDest 
    },
    originOptions: balancedOrigin,
    destOptions: balancedDest
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
