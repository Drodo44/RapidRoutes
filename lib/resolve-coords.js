// lib/resolve-coords.js
// Utility to resolve coordinates (and optional KMA metadata) for a given ZIP (zip5 or zip3)
// Uses adminSupabase to avoid exposing service role in client bundles.
import { adminSupabase } from '../utils/supabaseAdminClient';

/**
 * Resolve coordinates/KMA for a provided postal code.
 * Accepts either ZIP5 or ZIP3; attempts direct match, then falls back to ZIP3 slice.
 * Returns: { latitude, longitude, kma_code, kma_name } or null if not found.
 */
export async function resolveCoords(zip) {
  if (!zip) return null;
  try {
    const z = String(zip).trim();
    const zip3 = z.slice(0, 3);
    // First try full zip (if length >= 5) then fallback to zip3
    let queryZipList = [];
    if (z.length >= 5) queryZipList.push(z);
    if (!queryZipList.includes(zip3)) queryZipList.push(zip3);

    let found = null;
    for (const candidate of queryZipList) {
      const { data, error } = await adminSupabase
        .from('zip3_kma_geo')
        .select('zip, latitude, longitude, kma_code, kma_name')
        .eq('zip', candidate)
        .maybeSingle();
      if (!error && data) {
        found = data;
        break;
      }
    }
    if (!found) return null;
    return {
      latitude: found.latitude ?? null,
      longitude: found.longitude ?? null,
      kma_code: found.kma_code ?? null,
      kma_name: found.kma_name ?? null
    };
  } catch (err) {
    console.error('[resolveCoords] failed for zip:', zip, err);
    return null;
  }
}

export default resolveCoords;
