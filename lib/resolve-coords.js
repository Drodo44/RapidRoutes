// lib/resolve-coords.js
// Utility to resolve coordinates (and optional KMA metadata) for a given ZIP (zip5 or zip3)
// Uses adminSupabase to avoid exposing service role in client bundles.
import supabaseAdmin from '@/lib/supabaseAdmin';

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
    
    console.log(`[resolveCoords] Looking up ZIP: ${z}, ZIP3: ${zip3}`);
    
    // Try ZIP3 lookup (the table only has 3-digit ZIPs)
    const { data, error } = await supabaseAdmin
      .from('zip3_kma_geo')
      .select('zip3, latitude, longitude, kma_code')
      .eq('zip3', zip3)
      .maybeSingle();
    
    if (error) {
      console.error(`[resolveCoords] Database error for ZIP3 ${zip3}:`, error.message);
      return null;
    }
    
    if (!data) {
      console.warn(`[resolveCoords] No data found for ZIP3 ${zip3}`);
      return null;
    }
    
    console.log(`[resolveCoords] Found coordinates for ZIP3 ${zip3}:`, data);
    
    return {
      latitude: data.latitude ?? null,
      longitude: data.longitude ?? null,
      kma_code: data.kma_code ?? null,
      kma_name: null // zip3_kma_geo table doesn't have kma_name
    };
  } catch (err) {
    console.error('[resolveCoords] failed for zip:', zip, err);
    return null;
  }
}

export default resolveCoords;
