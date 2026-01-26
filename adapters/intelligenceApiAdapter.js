// adapters/intelligenceApiAdapter.js
// Provides fetchZip3FromHere fallback used by /api/post-options.ts
// Attempts to derive a representative zip3 + KMA from coordinates.

import axios from 'axios';
import { adminSupabase as supabase } from '../utils/supabaseAdminClient.js';

const HERE_API_KEY = process.env.HERE_API_KEY || process.env.HERE_API_KEY_PRIMARY;

/**
 * Reverse geocode lat/lon via HERE, derive zip (first 3 chars) and KMA via zip3s table.
 * Returns { zip3, kma_code, latitude, longitude, source }
 */
export async function fetchZip3FromHere({ latitude, longitude }) {
  if (typeof latitude !== 'number' || typeof longitude !== 'number') {
    throw new Error('Invalid coordinates');
  }
  if (!HERE_API_KEY) throw new Error('HERE_API_KEY missing');

  const url = `https://revgeocode.search.hereapi.com/v1/revgeocode?at=${latitude},${longitude}&lang=en-US&limit=1&apiKey=${HERE_API_KEY}`;
  const { data } = await axios.get(url, { timeout: 8000 });
  const item = data?.items?.[0];
  const postal = item?.address?.postalCode;
  if (!postal || !/^\d{5}$/.test(postal)) {
    return { zip3: null, kma_code: null, latitude, longitude, source: 'here-rev' };
  }
  const zip3 = postal.slice(0,3);
  let kma_code = null;
  try {
    const { data: row } = await supabase
      .from('zip3s')
      .select('kma_code')
      .eq('zip3', zip3)
      .maybeSingle();
    kma_code = row?.kma_code || null;
  } catch {}
  return { zip3, kma_code, latitude, longitude, source: 'here-rev' };
}

export default { fetchZip3FromHere };
