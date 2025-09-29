// Enhanced batch nearby post options lookup with payload logging, graceful missing lat/lon handling,
// Supabase-first RPC resolution and HERE fallback for geospatial enrichment.

import type { NextApiRequest, NextApiResponse } from 'next';
import { adminSupabase as supabaseAdmin } from '../../utils/supabaseAdminClient.js';
import { fetchZip3FromHere } from '../../adapters/intelligenceApiAdapter.js';

interface LaneInput {
  id: string | number;
  origin_latitude?: number;
  origin_longitude?: number;
}

interface LaneResultSuccess {
  laneId: string | number;
  source: 'supabase' | 'here';
  options: any[]; // RPC row shape or HERE fallback object array
}
interface LaneResultError {
  laneId: string | number;
  error: string;
}
type LaneResult = LaneResultSuccess | LaneResultError;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end();

  // 🚨 FORCE LOGGING OF RAW BODY
  try {
    const rawBody: string = await new Promise((resolve) => {
      let data = '';
      req.on('data', (chunk) => (data += chunk));
      req.on('end', () => resolve(data));
    });
    console.log('🛠️ RAW POST BODY:', rawBody);
    if (rawBody && !req.body) {
      // If Next.js body parser already ran, req.body might exist; only parse if absent
      req.body = JSON.parse(rawBody || '{}');
    }
  } catch (parseErr: any) {
    console.error('❌ Failed to parse JSON body:', parseErr?.message || parseErr);
    return res.status(400).json({ error: 'Invalid JSON' });
  }

  const { lanes } = req.body || {};
  if (!lanes || !Array.isArray(lanes)) {
    return res.status(400).json({ error: 'Missing or invalid lanes array' });
  }

  // Log the raw payload for observability (omit if sensitive in prod — or gate behind an env flag)
  try {
    console.log('[post-options] Received lanes payload:', JSON.stringify(lanes, null, 2));
  } catch { /* ignore circular serialization issues */ }

  const results: LaneResult[] = await Promise.all(
    lanes.map(async (lane: LaneInput) => {
      const { id, origin_latitude, origin_longitude } = lane || {} as LaneInput;

      if (typeof id === 'undefined') {
        return { laneId: 'unknown', error: 'Missing lane id' };
      }

      // Case 1: Missing coordinates
      if (typeof origin_latitude !== 'number' || typeof origin_longitude !== 'number') {
        return { laneId: id, error: 'Missing origin_latitude or origin_longitude' };
      }

      // Case 2: Supabase RPC attempt
      let supabaseData: any[] | null = null;
      try {
        const { data, error: supabaseError } = await supabaseAdmin.rpc('get_nearby_cities_with_kma', {
          input_lat: origin_latitude,
          input_lon: origin_longitude,
        });
        if (supabaseError) {
          console.error(`[post-options] Supabase RPC failed for lane ${id}:`, supabaseError.message);
        } else if (Array.isArray(data) && data.length) {
          supabaseData = data;
        }
      } catch (rpcErr: any) {
        console.error(`[post-options] RPC invocation error for lane ${id}:`, rpcErr?.message || rpcErr);
      }

      if (supabaseData) {
        return { laneId: id, source: 'supabase', options: supabaseData };
      }

      // Case 3: HERE fallback
      try {
        const fallback = await fetchZip3FromHere({ latitude: origin_latitude, longitude: origin_longitude });
        return { laneId: id, source: 'here', options: [fallback] };
      } catch (hereErr: any) {
        console.error(`[post-options] HERE fallback failed for lane ${id}:`, hereErr?.message || hereErr);
        return { laneId: id, error: 'HERE fallback failed' };
      }
    })
  );

  return res.status(200).json({ results });
}
