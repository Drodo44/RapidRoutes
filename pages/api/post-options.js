// pages/api/post-options.js
// Extended: supports two modes
// 1) Legacy single-lane option generation (input: { laneId }) returning nearby origin/destination city options
// 2) New enterprise batch lane ingestion (input: { lanes: [...] }) with chunked coordinate enrichment + insert
//    Returns structured { ok, counts: { total, success, failed }, failed: [...] }
// This preserves backward compatibility for existing UI while enabling scalable batch creation.
import { adminSupabase as supabase } from "@/utils/supabaseAdminClient";
import { resolveCoords } from "@/lib/resolve-coords";

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
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // Branch detection
  const { lanes: batchLanes, laneId } = req.body || {};

  // --- Batch Mode ---------------------------------------------------------
  if (Array.isArray(batchLanes)) {
    if (batchLanes.length === 0) {
      return res.status(400).json({ error: "No lanes provided" });
    }

    const CHUNK_SIZE = 25; // per user spec (25–50 acceptable; 25 chosen to minimize lock contention)
    const CONCURRENCY = 5; // coordinate/KMA enrichment parallelism
    const results = { success: [], failed: [] };

    // Lightweight concurrency limiter
    function pLimit(limit) {
      let active = 0;
      const queue = [];
      const run = (fn, resolve, reject) => {
        active++;
        fn()
          .then(resolve)
          .catch(reject)
          .finally(() => {
            active--;
            if (queue.length) {
              const next = queue.shift();
              next();
            }
          });
      };
      return (fn) =>
        new Promise((resolve, reject) => {
          if (active < limit) run(fn, resolve, reject);
          else queue.push(() => run(fn, resolve, reject));
        });
    }
    const limit = pLimit(CONCURRENCY);

    async function enrichLane(raw) {
      try {
        // Resolve origin & destination separately (resolveCoords accepts single zip)
        const originZip = raw.origin_zip5 || raw.origin_zip || null;
        const destZip = raw.dest_zip5 || raw.dest_zip || null;
        const [orig, dest] = await Promise.all([
          originZip ? resolveCoords(originZip) : null,
          destZip ? resolveCoords(destZip) : null,
        ]);
        return {
          ...raw,
          origin_zip5: raw.origin_zip5 || (originZip && originZip.length >= 5 ? originZip : null),
          origin_zip: raw.origin_zip || (originZip ? originZip.slice(0, 3) : null),
          dest_zip5: raw.dest_zip5 || (destZip && destZip.length >= 5 ? destZip : null),
          dest_zip: raw.dest_zip || (destZip ? destZip.slice(0, 3) : null),
          origin_latitude: orig?.latitude ?? null,
            origin_longitude: orig?.longitude ?? null,
          dest_latitude: dest?.latitude ?? null,
          dest_longitude: dest?.longitude ?? null,
          lane_status: raw.lane_status || 'pending',
        };
      } catch (err) {
        return { __enrichError: err, raw };
      }
    }

    for (let i = 0; i < batchLanes.length; i += CHUNK_SIZE) {
      const slice = batchLanes.slice(i, i + CHUNK_SIZE);

      // Enrich slice with limited concurrency
      const enriched = await Promise.all(
        slice.map((l) =>
          limit(() => enrichLane(l))
        )
      );

      const valid = [];
      for (const e of enriched) {
        if (e && !e.__enrichError) {
          valid.push(e);
        } else if (e && e.__enrichError) {
          results.failed.push({ lane: e.raw || e, error: e.__enrichError.message || 'enrichment failed' });
        } else {
          results.failed.push({ lane: null, error: 'Unknown enrichment failure' });
        }
      }

      if (valid.length === 0) continue;

      // Split into inserts vs updates (if id present assume update path)
      const toInsert = valid.filter(v => !v.id);
      const toUpdate = valid.filter(v => v.id);

      // Bulk insert new lanes
      if (toInsert.length) {
        const { error: insertErr, data: inserted } = await supabase
          .from('lanes')
          .insert(toInsert.map(v => ({
            origin_city: v.origin_city,
            origin_state: v.origin_state,
            origin_zip5: v.origin_zip5,
            origin_zip: v.origin_zip,
            dest_city: v.dest_city,
            dest_state: v.dest_state,
            dest_zip5: v.dest_zip5,
            dest_zip: v.dest_zip,
            equipment_code: v.equipment_code || 'V',
            length_ft: v.length_ft || 48,
            full_partial: v.full_partial || 'full',
            pickup_earliest: v.pickup_earliest || new Date().toISOString().split('T')[0],
            pickup_latest: v.pickup_latest || v.pickup_earliest || new Date().toISOString().split('T')[0],
            randomize_weight: !!v.randomize_weight,
            weight_lbs: v.weight_lbs || null,
            weight_min: v.weight_min || null,
            weight_max: v.weight_max || null,
            comment: v.comment || null,
            commodity: v.commodity || null,
            lane_status: v.lane_status || 'pending',
            origin_latitude: v.origin_latitude,
            origin_longitude: v.origin_longitude,
            dest_latitude: v.dest_latitude,
            dest_longitude: v.dest_longitude,
          })), { returning: 'minimal' });

        if (insertErr) {
          console.error('[post-options batch] insert error:', insertErr.message);
          results.failed.push(...toInsert.map(v => ({ lane: v, error: insertErr.message })));
        } else {
          results.success.push(...toInsert.map(v => v.id || `${v.origin_city}-${v.dest_city || 'NA'}-${v.origin_zip5 || v.origin_zip || 'zip'}`));
        }
      }

      // Individual updates (can't bulk easily without specified keys)
      for (const u of toUpdate) {
        try {
          const { error: upErr } = await supabase
            .from('lanes')
            .update({
              origin_zip5: u.origin_zip5,
              origin_zip: u.origin_zip,
              dest_zip5: u.dest_zip5,
              dest_zip: u.dest_zip,
              origin_latitude: u.origin_latitude,
              origin_longitude: u.origin_longitude,
              dest_latitude: u.dest_latitude,
              dest_longitude: u.dest_longitude,
              lane_status: u.lane_status || 'pending'
            })
            .eq('id', u.id);
          if (upErr) {
            results.failed.push({ lane: u, error: upErr.message });
          } else {
            results.success.push(u.id);
          }
        } catch (ue) {
          results.failed.push({ lane: u, error: ue.message });
        }
      }
    }

    return res.status(200).json({
      ok: true,
      counts: {
        total: batchLanes.length,
        success: results.success.length,
        failed: results.failed.length,
      },
      failed: results.failed,
    });
  }

  // --- Legacy Single-Lane Options Mode ------------------------------------
  if (!laneId) {
    return res.status(400).json({ error: "Missing laneId" });
  }

  try {
    // 1. Fetch the lane
    const { data: lane, error: laneErr } = await supabase
      .from("lanes")
      .select("*")
      .eq("id", laneId)
      .single();

    if (laneErr || !lane) {
      return res.status(404).json({ error: "Lane not found" });
    }

    // Lane coords
    const originLat = lane.origin_latitude;
    const originLon = lane.origin_longitude;
    const destLat = lane.dest_latitude;
    const destLon = lane.dest_longitude;

    if (
      originLat == null ||
      originLon == null ||
      destLat == null ||
      destLon == null
    ) {
      return res.status(400).json({ error: "Lane missing coordinates" });
    }

    // 2. Fetch candidate cities (limit radius 120 miles by rough lat/lon box first)
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

    if (cityErr) {
      console.error("Error fetching cities:", cityErr);
      return res.status(500).json({ error: "Failed to fetch cities" });
    }

    if (!cities || cities.length === 0) {
      return res.status(404).json({ error: "No cities found near lane" });
    }

    // 3. Enrich with KMA if missing (serial for simplicity; could batch)
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
      enriched.push({ ...c, kma_code: kma || "UNK" });
    }

    // 4. Calculate distances
    const originOptions = enriched
      .map((c) => ({
        ...c,
        distance: haversine(originLat, originLon, c.latitude, c.longitude),
      }))
      .filter((c) => c.distance <= 100);

    const destOptions = enriched
      .map((c) => ({
        ...c,
        distance: haversine(destLat, destLon, c.latitude, c.longitude),
      }))
      .filter((c) => c.distance <= 100);

    // 5. Balance across KMAs
    const balancedOrigin = balanceByKMA(originOptions, 50);
    const balancedDest = balanceByKMA(destOptions, 50);

    return res.status(200).json({
      success: true,
      laneId,
      origin: {
        city: lane.origin_city,
        state: lane.origin_state,
        options: balancedOrigin,
      },
      destination: {
        city: lane.dest_city,
        state: lane.dest_state,
        options: balancedDest,
      },
      originOptions: balancedOrigin,
      destOptions: balancedDest,
    });
  } catch (err) {
    console.error("post-options error", err);
    return res.status(500).json({ error: "Unexpected server error" });
  }
}