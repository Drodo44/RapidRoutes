// 🔥 Simplified pairing endpoint: direct zip3 -> KMA lookup with zero enrichment/fallback logic.
// NOTE: This replaces the previous advanced pairing engine. Frontend consumers expecting
// meta/pairs arrays will need to adjust; this returns a minimal lane object.
import { adminSupabase as supabase } from '../../utils/supabaseClient.js';

export default async function handler(req, res) {
  console.log('[PAIRING] Handler triggered');

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const origin_zip3 = req.body?.origin_zip3 || req.body?.originZip3;
  const destination_zip3 = req.body?.destination_zip3 || req.body?.destinationZip3;

  console.log('[PAIRING] zip3 debug:', { origin_zip3, destination_zip3 });

  if (!origin_zip3 || !destination_zip3) {
    return res.status(400).json({ error: 'Missing origin_zip3 or destination_zip3' });
  }

  // Look up KMA codes directly from cache table (column is kma_code in current schema)
  const { data: originKmaRow, error: originErr } = await supabase
    .from('zip3_kma_geo')
    .select('kma_code')
    .eq('zip3', origin_zip3)
    .limit(1)
    .maybeSingle();

  const { data: destKmaRow, error: destErr } = await supabase
    .from('zip3_kma_geo')
    .select('kma_code')
    .eq('zip3', destination_zip3)
    .limit(1)
    .maybeSingle();

  if (originErr || destErr || !originKmaRow || !destKmaRow) {
    console.error('[PAIRING] KMA lookup failed', { originErr, destErr, origin_zip3, destination_zip3 });
    return res.status(404).json({ error: 'KMA not found for one or both zip3s' });
  }

  return res.status(200).json({
    success: true,
    lane: {
      origin_zip3,
      destination_zip3,
      origin_kma: originKmaRow.kma_code,
      destination_kma: destKmaRow.kma_code,
      pairing_version: 'zip3-direct-v1'
    }
  });
}

console.log('🚀 Pairing Logic Version: zip3-direct-v1 (simplified)');
