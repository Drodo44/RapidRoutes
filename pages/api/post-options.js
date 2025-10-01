// pages/api/post-options.js
// Extended: supports two modes
// 1) Legacy single-lane option generation (input: { laneId }) returning nearby origin/destination city options
// 2) New enterprise batch lane ingestion (input: { lanes: [...] }) with chunked coordinate enrichment + insert
//    Returns structured { ok, counts: { total, success, failed }, failed: [...] }
// This preserves backward compatibility for existing UI while enabling scalable batch creation.
import { adminSupabase as supabase } from "@/utils/supabaseAdminClient";
import { resolveCoords } from "@/lib/resolve-coords";
// NOTE: Not using external p-limit dependency to avoid adding new package; implementing lightweight limiter inline.

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
function balanceByKMA(cities, max = 50) {
  const grouped = {};
  for (const c of cities) {
    if (!grouped[c.kma_code]) grouped[c.kma_code] = [];
    grouped[c.kma_code].push(c);
  }

  // Sort each group by distance
  for (const kma in grouped) {
    grouped[kma].sort((a, b) => a.distance - b.distance);
  }

  // Round-robin pull from each KMA until cap
  const results = [];
  let added = true;
  while (results.length < max && added) {
    added = false;
    for (const kma in grouped) {
      if (grouped[kma].length > 0 && results.length < max) {
        results.push(grouped[kma].shift());
        added = true;
      }
    }
  }
  return results;
}

// Simple haversine utilities retained for legacy option generation
async function generateOptionsForLane(laneId) {
  // Fetch lane
  const { data: lane, error: laneErr } = await supabase
    .from("lanes")
    .select("*")
    .eq("id", laneId)
    .single();
  if (laneErr || !lane) {
    throw new Error('Lane not found');
  }
  const originLat = lane.origin_latitude;
  const originLon = lane.origin_longitude;
  const destLat = lane.dest_latitude;
  const destLon = lane.dest_longitude;
  if (originLat == null || originLon == null || destLat == null || destLon == null) {
    throw new Error('Lane missing coordinates');
  }
  const latMin = Math.min(originLat, destLat) - 2;
  const latMax = Math.max(originLat, destLat) + 2;
  const lonMin = Math.min(originLon, destLon) - 2;
  const lonMax = Math.max(originLon, destLon) + 2;
  const { data: cities, error: cityErr } = await supabase
    .from("us_cities")
    .select("id, city, state, latitude, longitude, zip3, kma_code")
    .gte("latitude", latMin)
    .lte("latitude", latMax)
    .gte("longitude", lonMin)
    .lte("longitude", lonMax);
  if (cityErr) throw new Error('Failed to fetch cities');
  if (!cities || cities.length === 0) throw new Error('No cities found near lane');
  const enriched = [];
  for (const c of cities) {
    let kma = c.kma_code;
    if (!kma && c.zip3) {
      const { data: zipRow } = await supabase
        .from("zip3s")
        .select("kma_code")
        .eq("zip3", c.zip3)
        .maybeSingle();
      if (zipRow) kma = zipRow.kma_code;
    }
    enriched.push({ ...c, kma_code: kma || 'UNK' });
  }
  const originOptions = enriched
    .map(c => ({ ...c, distance: haversine(originLat, originLon, c.latitude, c.longitude) }))
    .filter(c => c.distance <= 100);
  const destOptions = enriched
    .map(c => ({ ...c, distance: haversine(destLat, destLon, c.latitude, c.longitude) }))
    .filter(c => c.distance <= 100);
  const balancedOrigin = balanceByKMA(originOptions, 50);
  const balancedDest = balanceByKMA(destOptions, 50);
  return {
    laneId,
    origin: { city: lane.origin_city, state: lane.origin_state, options: balancedOrigin },
    destination: { city: lane.dest_city, state: lane.dest_state, options: balancedDest },
    originOptions: balancedOrigin,
    destOptions: balancedDest
  };
}

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ ok: false, error: "Method not allowed" });
    }

    // Branch detection
    const { lanes: batchLanes, laneId } = req.body || {};

    // --- Batch Mode ---------------------------------------------------------
    if (Array.isArray(batchLanes)) {
      if (batchLanes.length === 0) return res.status(400).json({ ok: false, error: 'No lanes provided' });

    // Deduplicate ZIP5 values across all lanes (origin & destination)
    const zipSet = new Set();
    for (const l of batchLanes) {
      if (l.origin_zip5) zipSet.add(l.origin_zip5);
      if (l.dest_zip5) zipSet.add(l.dest_zip5);
    }
    const uniqueZips = Array.from(zipSet);

    // Concurrency limiter (max 5) without external dependency
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

    const zipCache = new Map();
    await Promise.all(uniqueZips.map(z => limiter(async () => {
      try {
        const data = await resolveCoords(z);
        zipCache.set(z, data);
      } catch (e) {
        console.error(`[post-options] coord lookup failed for ${z}:`, e.message);
        zipCache.set(z, null);
      }
    })));

    // Enrich lanes using cache
    const enriched = batchLanes.map(l => {
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
        lane_status: l.lane_status || 'pending',
        origin_kma: o?.kma_code ?? null,
        dest_kma: d?.kma_code ?? null,
      };
    });

    // Chunked upsert (20 lanes per chunk)
    const CHUNK_SIZE = 20;
    let success = 0; let failed = 0; const errors = [];

      for (let i = 0; i < enriched.length; i += CHUNK_SIZE) {
      const chunk = enriched.slice(i, i + CHUNK_SIZE).map(c => ({
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
      }));

        const { error } = await supabase.from('lanes').upsert(chunk, { onConflict: 'id' });
      if (error) {
        console.error('[post-options] upsert chunk error:', error.message);
        failed += chunk.length;
        errors.push(error.message);
      } else {
        success += chunk.length;
      }
      }

      return res.status(200).json({ ok: true, total: batchLanes.length, success, failed, errors });
    }

    // --- Legacy Single-Lane Options Mode ------------------------------------
    if (!laneId) {
      return res.status(400).json({ ok: false, error: "Missing laneId" });
    }

    try {
      const details = await generateOptionsForLane(laneId);
      return res.status(200).json({ ok: true, ...details });
    } catch (laneErr) {
      return res.status(400).json({ ok: false, error: laneErr.message });
    }
  } catch (err) {
    console.error('post-options API fatal', err);
    return res.status(500).json({ ok: false, error: err.message || 'Internal error' });
  }
}