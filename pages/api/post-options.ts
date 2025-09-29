// Batch nearby post options lookup via Postgres RPC
// Expects body: { lanes: [ { id, origin_latitude, origin_longitude } ] }
// Returns per-lane nearby city options with KMA codes using RPC get_nearby_cities_with_kma

import type { NextApiRequest, NextApiResponse } from 'next';
import { adminSupabase as supabase } from '../../utils/supabaseAdminClient.js';
import { fetchZip3FromHere } from '../../adapters/intelligenceApiAdapter.js';

interface LaneInput { id: string | number; origin_latitude: number; origin_longitude: number; }
interface LaneResultSuccess { laneId: LaneInput['id']; source: 'supabase' | 'here'; options: any[]; }
interface LaneResultError { laneId: LaneInput['id']; error: string; }
type LaneResult = LaneResultSuccess | LaneResultError;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end();

  const { lanes } = req.body;

  if (
    !lanes ||
    !Array.isArray(lanes) ||
    lanes.some(
      (l: any) =>
        typeof l.origin_latitude !== 'number' ||
        typeof l.origin_longitude !== 'number'
    )
  ) {
    return res.status(400).json({ error: 'Invalid lane data' });
  }

  const results: LaneResult[] = await Promise.all(
    lanes.map(async (lane: LaneInput) => {
      const { origin_latitude, origin_longitude, id } = lane;

      // Supabase-first
      const { data: supabaseData, error } = await supabase.rpc('get_nearby_cities_with_kma', {
        input_lat: origin_latitude,
        input_lon: origin_longitude,
      });

      if (error) {
        console.error('Supabase RPC error:', error.message);
        return { laneId: id, error: 'Supabase RPC failed' };
      }

      if (supabaseData && supabaseData.length > 0) {
        return { laneId: id, source: 'supabase', options: supabaseData };
      }

      // HERE fallback
      try {
        const hereData = await fetchZip3FromHere({ latitude: origin_latitude, longitude: origin_longitude });
        return { laneId: id, source: 'here', options: [hereData] };
      } catch (fallbackError: any) {
        console.error('HERE fallback error:', fallbackError.message);
        return { laneId: id, error: 'HERE fallback failed' };
      }
    })
  );

  res.status(200).json({ results });
}
