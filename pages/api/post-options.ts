// Dual origin/destination nearby city options endpoint.
// Supabase-first via RPC get_nearby_cities_with_kma; HERE reverse geocode fallback per side.
// Returns per-lane structure with origin/dest options, sources, and errors.

import type { NextApiRequest, NextApiResponse } from 'next';
import { adminSupabase as supabaseAdmin } from '../../utils/supabaseAdminClient.js';
import { fetchZip3FromHere } from '../../adapters/intelligenceApiAdapter.js';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end();

  // Raw body capture & manual parse (forces visibility even if body parser misconfigured)
  try {
    const bodyText: string = await new Promise((resolve) => {
      let data = '';
      req.on('data', (chunk: any) => (data += chunk));
      req.on('end', () => resolve(data));
    });
    console.log('🛠️ RAW POST BODY:', bodyText);
    // Overwrite body only if empty or undefined (defensive)
    if (!req.body || Object.keys(req.body).length === 0) {
      req.body = bodyText ? JSON.parse(bodyText) : {};
    }
  } catch (e) {
    console.error('❌ Failed to parse JSON body:', e);
    return res.status(400).json({ error: 'Invalid JSON' });
  }

  const { lanes } = req.body;
  if (!lanes || !Array.isArray(lanes)) {
    return res.status(400).json({ error: 'Missing or invalid lanes array' });
  }

  const results = await Promise.all(
    lanes.map(async (lane: any) => {
      const { id, origin_latitude, origin_longitude, dest_latitude, dest_longitude } = lane || {};
      const laneResult: any = { laneId: id };

      // ---------- ORIGIN SIDE ----------
      if (typeof origin_latitude === 'number' && typeof origin_longitude === 'number') {
        try {
          const { data: originData, error: originError } = await supabaseAdmin.rpc('get_nearby_cities_with_kma', {
            input_lat: origin_latitude,
            input_lon: origin_longitude,
          });
          if (originError) {
            console.error(`Supabase RPC failed (origin) for lane ${id}:`, originError.message);
          }
          if (originData && originData.length > 0) {
            laneResult.originOptions = originData;
            laneResult.originSource = 'supabase';
          } else {
            try {
              const fallback = await fetchZip3FromHere({ latitude: origin_latitude, longitude: origin_longitude });
              laneResult.originOptions = [fallback];
              laneResult.originSource = 'here';
            } catch (err) {
              laneResult.originError = 'HERE fallback failed';
            }
          }
        } catch (err: any) {
          console.error(`Unexpected origin processing error for lane ${id}:`, err?.message || err);
          laneResult.originError = 'Origin processing error';
        }
      } else {
        laneResult.originError = 'Missing origin coordinates';
      }

      // ---------- DESTINATION SIDE ----------
      if (typeof dest_latitude === 'number' && typeof dest_longitude === 'number') {
        try {
          const { data: destData, error: destError } = await supabaseAdmin.rpc('get_nearby_cities_with_kma', {
            input_lat: dest_latitude,
            input_lon: dest_longitude,
          });
          if (destError) {
            console.error(`Supabase RPC failed (dest) for lane ${id}:`, destError.message);
          }
            if (destData && destData.length > 0) {
              laneResult.destOptions = destData;
              laneResult.destSource = 'supabase';
            } else {
              try {
                const fallback = await fetchZip3FromHere({ latitude: dest_latitude, longitude: dest_longitude });
                laneResult.destOptions = [fallback];
                laneResult.destSource = 'here';
              } catch (err) {
                laneResult.destError = 'HERE fallback failed';
              }
            }
        } catch (err: any) {
          console.error(`Unexpected dest processing error for lane ${id}:`, err?.message || err);
          laneResult.destError = 'Destination processing error';
        }
      } else {
        laneResult.destError = 'Missing destination coordinates';
      }

      return laneResult;
    })
  );

  res.status(200).json({ results });
}
