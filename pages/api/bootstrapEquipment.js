// pages/api/bootstrapEquipment.js
// Self-seeding endpoint. Safe to call repeatedly.
// If fewer than MIN rows exist, upsert EQUIPMENT_SEED using service role.

import { EQUIPMENT_SEED } from '../../lib/equipmentSeed';

const MIN = 60; // guard: if table has fewer than this, we seed

export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Initialize admin client lazily so we can catch env errors
    let supabaseAdmin;
    try {
      supabaseAdmin = (await import('@/lib/supabaseAdmin')).default;
    } catch (e) {
      console.error('[API/bootstrapEquipment] Admin client init failed:', e?.message || e);
      return res.status(500).json({ error: 'Server configuration error: admin client unavailable' });
    }
    const { count, error: headErr } = await supabaseAdmin
      .from('equipment_codes')
      .select('code', { count: 'exact', head: true });
    if (headErr) throw headErr;

    if ((count || 0) >= MIN) {
      return res.status(200).json({ seeded: false, count });
    }

    // Idempotent upsert
    const { error } = await supabaseAdmin
      .from('equipment_codes')
      .upsert(EQUIPMENT_SEED, { onConflict: 'code' });
    if (error) throw error;

    const { count: after } = await supabaseAdmin
      .from('equipment_codes').select('code', { count: 'exact', head: true });

    return res.status(200).json({ seeded: true, count: after || 0 });
  } catch (e) {
    console.error('bootstrapEquipment error:', e);
    return res.status(500).json({ error: e.message || 'bootstrap failed' });
  }
}
