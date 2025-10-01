// pages/api/post-options.js
// Extended: supports two modes
// 1) Legacy single-lane option generation (input: { laneId }) returning nearby origin/destination city options
// 2) New enterprise batch lane enrichment + ingestion (input: { lanes: [...] }) with coordinate enrichment + upsert
//    Returns structured { ok, results: [{id, status: 'success'|'failed', error?}] }
// This preserves backward compatibility for existing UI while enabling scalable batch creation.
import { adminSupabase as supabase } from "../../utils/supabaseAdminClient";
import { resolveCoords } from "../../lib/resolve-coords";
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
      console.log(`[post-options] Batch mode: received ${batchLanes.length} lanes`);
      if (batchLanes.length === 0) return res.status(400).json({ ok: false, error: 'No lanes provided' });

      // Deduplicate ZIP values across all lanes (origin & destination) - try zip5 first, fallback to zip3
      const zipSet = new Set();
      for (const l of batchLanes) {
        const originZip = l.origin_zip5 || l.origin_zip;
        const destZip = l.dest_zip5 || l.dest_zip;
        if (originZip) zipSet.add(String(originZip).trim());
        if (destZip) zipSet.add(String(destZip).trim());
      }
      const uniqueZips = Array.from(zipSet);
      console.log(`[post-options] Deduped ${uniqueZips.length} unique ZIPs to resolve`);

      // Batch coordinate resolution with concurrency limit (max 5 concurrent)
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

      // Build coordinate cache
      const zipCache = new Map();
      await Promise.all(uniqueZips.map(z => limiter(async () => {
        try {
          const data = await resolveCoords(z);
          zipCache.set(z, data);
          if (data) {
            console.log(`[post-options] Resolved ${z}: lat=${data.latitude}, lon=${data.longitude}, kma=${data.kma_code}`);
          }
        } catch (e) {
          console.error(`[post-options] coord lookup failed for ${z}:`, e.message);
          zipCache.set(z, null);
        }
      })));

      console.log(`[post-options] Coordinate cache built: ${zipCache.size} entries`);

      // Enrich lanes using cache
      const enriched = [];
      const results = [];

      for (const l of batchLanes) {
        try {
          const originZip = l.origin_zip5 || l.origin_zip;
          const destZip = l.dest_zip5 || l.dest_zip;
          
          const o = originZip ? zipCache.get(String(originZip).trim()) : null;
          const d = destZip ? zipCache.get(String(destZip).trim()) : null;

          // Build enriched lane object
          const enrichedLane = {
            id: l.id || undefined,
            origin_city: l.origin_city,
            origin_state: l.origin_state,
            origin_zip5: l.origin_zip5 || null,
            origin_zip: l.origin_zip5 ? l.origin_zip5.slice(0, 3) : (l.origin_zip || null),
            dest_city: l.dest_city,
            dest_state: l.dest_state,
            dest_zip5: l.dest_zip5 || null,
            dest_zip: l.dest_zip5 ? l.dest_zip5.slice(0, 3) : (l.dest_zip || null),
            equipment_code: l.equipment_code || 'V',
            length_ft: l.length_ft || 48,
            full_partial: l.full_partial || 'full',
            pickup_earliest: l.pickup_earliest || new Date().toISOString().split('T')[0],
            pickup_latest: l.pickup_latest || l.pickup_earliest || new Date().toISOString().split('T')[0],
            randomize_weight: !!l.randomize_weight,
            weight_lbs: l.weight_lbs || null,
            weight_min: l.weight_min || null,
            weight_max: l.weight_max || null,
            comment: l.comment || null,
            commodity: l.commodity || null,
            lane_status: l.lane_status || 'pending',
            origin_latitude: o?.latitude ?? l.origin_latitude ?? null,
            origin_longitude: o?.longitude ?? l.origin_longitude ?? null,
            dest_latitude: d?.latitude ?? l.dest_latitude ?? null,
            dest_longitude: d?.longitude ?? l.dest_longitude ?? null,
            origin_kma: o?.kma_code ?? null,
            dest_kma: d?.kma_code ?? null,
          };

          // Validate required fields
          if (!enrichedLane.origin_city || !enrichedLane.origin_state || !enrichedLane.dest_city || !enrichedLane.dest_state) {
            throw new Error(`Missing required city/state fields`);
          }

          enriched.push(enrichedLane);
          results.push({ id: l.id, status: 'enriched' });
        } catch (err) {
          console.error(`[post-options] Failed to enrich lane ${l.id}:`, err.message);
          results.push({ id: l.id, status: 'failed', error: err.message });
        }
      }

      console.log(`[post-options] Enrichment complete: ${enriched.length} enriched, ${results.filter(r => r.status === 'failed').length} failed`);

      // Chunked upsert (20 lanes per chunk)
      const CHUNK_SIZE = 20;
      let successCount = 0;
      let failedCount = 0;

      for (let i = 0; i < enriched.length; i += CHUNK_SIZE) {
        const chunk = enriched.slice(i, i + CHUNK_SIZE);
        
        try {
          const { data, error } = await supabase.from('lanes').upsert(chunk, { 
            onConflict: 'id',
            ignoreDuplicates: false 
          }).select('id');

          if (error) {
            console.error('[post-options] upsert chunk error:', error.message);
            // Mark all lanes in this chunk as failed
            chunk.forEach(c => {
              const resultIdx = results.findIndex(r => r.id === c.id);
              if (resultIdx >= 0) {
                results[resultIdx].status = 'failed';
                results[resultIdx].error = error.message;
              }
            });
            failedCount += chunk.length;
          } else {
            console.log(`[post-options] Upserted chunk of ${chunk.length} lanes`);
            // Mark as success
            chunk.forEach(c => {
              const resultIdx = results.findIndex(r => r.id === c.id);
              if (resultIdx >= 0) {
                results[resultIdx].status = 'success';
              }
            });
            successCount += chunk.length;
          }
        } catch (chunkErr) {
          console.error('[post-options] chunk processing error:', chunkErr.message);
          chunk.forEach(c => {
            const resultIdx = results.findIndex(r => r.id === c.id);
            if (resultIdx >= 0) {
              results[resultIdx].status = 'failed';
              results[resultIdx].error = chunkErr.message;
            }
          });
          failedCount += chunk.length;
        }
      }

      console.log(`[post-options] Batch complete: ${successCount} success, ${failedCount} failed`);

      return res.status(200).json({ 
        ok: true, 
        total: batchLanes.length,
        success: successCount,
        failed: failedCount,
        results: results
      });
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