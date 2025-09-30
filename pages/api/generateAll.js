// pages/api/generateAll.js
// Aggregate active core_pickups plus fallback pending lanes, enrich with coordinates/KMA.
// Returns a unified list consumable by posting / option generation workflows.
import { adminSupabase } from '../../utils/supabaseAdminClient';
import { resolveCoords } from '../../lib/resolve-coords';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // 1. Pull all active core pickups (best-effort; continue if table missing)
    let pickups = [];
    const { data: pickupsData, error: pickupsErr } = await adminSupabase
      .from('core_pickups')
      .select('city, state, zip5, zip3, active')
      .eq('active', true);
    if (pickupsErr) {
      console.warn('[generateAll] core_pickups query failed (continuing fallback):', pickupsErr.message);
    } else if (Array.isArray(pickupsData)) {
      pickups = pickupsData;
    }

    // 2. Pending lanes fallback
    let lanes = [];
    const { data: lanesData, error: lanesErr } = await adminSupabase
      .from('lanes')
      .select('id, origin_city, origin_state, origin_zip5, origin_zip, origin_latitude, origin_longitude, lane_status, destination_city, destination_state, dest_city, dest_state')
      .eq('lane_status', 'pending');
    if (lanesErr) {
      console.error('[generateAll] lanes query failed:', lanesErr.message);
      return res.status(500).json({ error: 'Failed to fetch lanes' });
    } else if (Array.isArray(lanesData)) {
      lanes = lanesData;
    }

    // 3. Build combined list (core pickups first). Avoid duplicate origin_zip5.
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
        lane_status: 'pending'
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
        lane_status: l.lane_status || 'pending'
      });
    }

    // 4. Enrich each with coordinates/KMA (sequential to keep load light; could batch later)
    const enriched = [];
    for (const c of combined) {
      const coords = await resolveCoords(c.origin_zip5 || c.origin_zip);
      enriched.push({
        ...c,
        origin_latitude: coords?.latitude ?? null,
        origin_longitude: coords?.longitude ?? null,
        kma_code: coords?.kma_code ?? null,
        kma_name: coords?.kma_name ?? null
      });
    }

    return res.status(200).json({ lanes: enriched, counts: { pickups: pickups.length, fallback: lanes.length, combined: enriched.length } });
  } catch (err) {
    console.error('[generateAll] unhandled error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
