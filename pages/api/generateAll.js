// pages/api/generateAll.js
// Aggregate active core_pickups plus fallback pending lanes, enrich with coordinates/KMA.
// Returns a unified list consumable by posting / option generation workflows.
// Use alias-based imports for enterprise consistency (@ maps to project root)
import supabaseAdmin from "@/lib/supabaseAdmin";
import { resolveCoords } from '@/lib/resolve-coords';
import { buildCsvBuffer, exportDatCsv } from '../../lib/datCsvBuilder';
import { validateApiAuth } from '../../middleware/auth.unified';
import { assertApiAuth, isInternalBypass } from '@/lib/auth';
import { fetchLaneRecords } from '@/services/laneService.js';

export default async function handler(req, res) {
  const startTime = Date.now();
  console.log('[generateAll] === REQUEST RECEIVED ===', { method: req.method, timestamp: new Date().toISOString() });
  
  if (req.method !== 'POST') {
    console.log('[generateAll] Method not allowed:', req.method);
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('[generateAll] Starting execution...');
    // 1. Pull all active core pickups (best-effort; continue if table missing)
    console.log('[generateAll] Step 1: Fetching core_pickups...');
    let pickups = [];
    const { data: pickupsData, error: pickupsErr } = await supabaseAdmin
      .from('core_pickups')
      .select('city, state, zip5, zip3, active')
      .eq('active', true);
    if (pickupsErr) {
      console.warn('[generateAll] core_pickups query failed (continuing fallback):', pickupsErr.message);
    } else if (Array.isArray(pickupsData)) {
      pickups = pickupsData;
      console.log('[generateAll] Found', pickups.length, 'core pickups');
    }

    // 2. Pending lanes fallback
    console.log('[generateAll] Step 2: Fetching current lanes...');
    let lanes = [];
    try {
      lanes = await fetchLaneRecords(
        {
          status: 'current',
          limit: 2000
        },
        supabaseAdmin
      );
      console.log('[generateAll] Found', lanes.length, 'current lanes');
    } catch (lanesErr) {
      console.error('[generateAll] lanes query failed:', lanesErr.message);
      return res.status(500).json({ error: 'Failed to fetch lanes' });
    }

    // 3. Build combined list (core pickups first). Avoid duplicate origin_zip5.
    console.log('[generateAll] Step 3: Building combined list...');
    const combined = [];
    const seenZip5 = new Set();

    for (const p of pickups) {
      const origin_zip5 = p.zip5 || null;
      const origin_zip = p.zip3 || (origin_zip5 ? origin_zip5.slice(0,3) : null);
      if (origin_zip5) seenZip5.add(origin_zip5);
      combined.push({
        source: 'core_pickup',
        origin_city: p.city,
        origin_state: p.state,
        origin_zip5,
        origin_zip,
        lane_status: 'current'
      });
    }

    for (const l of lanes) {
      const origin_zip5 = l.origin_zip5 || null;
      if (origin_zip5 && seenZip5.has(origin_zip5)) continue; // skip duplicates
      if (origin_zip5) seenZip5.add(origin_zip5);
      combined.push({
        source: 'lane_fallback',
        origin_city: l.origin_city,
        origin_state: l.origin_state,
        origin_zip5: origin_zip5,
        origin_zip: l.origin_zip || (origin_zip5 ? origin_zip5.slice(0,3) : null),
        lane_status: l.lane_status || 'current'
      });
    }

    // 4. Enrich with coordinates/KMA using concurrent resolution with timeout
    // Timeout wrapper (3s max per coord lookup)
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

    // Deduplicate ZIPs across all combined lanes
    const zipSet = new Set();
    combined.forEach(c => {
      const zip = c.origin_zip5 || c.origin_zip;
      if (zip) zipSet.add(zip);
    });
    const uniqueZips = Array.from(zipSet);
    console.log('[generateAll] Step 4: Resolving', uniqueZips.length, 'unique ZIPs...');

    // Concurrent coord lookup with timeout and caching
    const zipCache = new Map();
    const lookupResults = await Promise.allSettled(
      uniqueZips.map(z => limiter(() => withTimeout(resolveCoords(z))))
    );
    uniqueZips.forEach((z, idx) => {
      const result = lookupResults[idx];
      if (result.status === 'fulfilled') {
        zipCache.set(z, result.value);
      } else {
        console.warn(`[generateAll] coord lookup failed for ${z}:`, result.reason?.message);
        zipCache.set(z, null);
      }
    });

    // Enrich all lanes using cached results
    const enriched = combined.map(c => {
      const zip = c.origin_zip5 || c.origin_zip;
      const coords = zip ? zipCache.get(zip) : null;
      return {
        ...c,
        origin_latitude: coords?.latitude ?? null,
        origin_longitude: coords?.longitude ?? null,
        kma_code: coords?.kma_code ?? null,
        kma_name: coords?.kma_name ?? null,
        // Add destination fields using origin as placeholder for pickup seeds
        destination_city: c.origin_city,
        destination_state: c.origin_state,
        dest_city: c.origin_city,
        dest_state: c.origin_state,
        dest_zip5: c.origin_zip5 || null,
        dest_zip: c.origin_zip || null,
        dest_latitude: coords?.latitude ?? null,
        dest_longitude: coords?.longitude ?? null
      };
    });

    const elapsed = Date.now() - startTime;
    console.log('[generateAll] === SUCCESS ===', { 
      elapsed: elapsed + 'ms',
      counts: { pickups: pickups.length, fallback: lanes.length, combined: enriched.length }
    });
    return res.status(200).json({ lanes: enriched, counts: { pickups: pickups.length, fallback: lanes.length, combined: enriched.length } });
  } catch (err) {
    const elapsed = Date.now() - startTime;
    console.error('[generateAll] === ERROR === after', elapsed + 'ms', err);
    console.error('[generateAll] Error stack:', err.stack);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
