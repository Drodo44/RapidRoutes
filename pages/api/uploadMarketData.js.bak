// pages/api/uploadMarketData.js
// Accepts JSON { equipment, level, source, denormalize, matrixRows: [{origin,destination,rate}...] }
// Writes to rates_snapshots.matrix (JSONB) and optionally denormalizes into rates_flat.

import { adminSupabase } from '../../utils/supabaseAdminClient';

export const config = {
  api: { bodyParser: { sizeLimit: '10mb' } },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { equipment, level, source, denormalize, matrixRows } = req.body || {};
    const eq = String(equipment || '').toLowerCase();
    const lvl = String(level || '').toLowerCase();
    const src = String(source || '').toLowerCase();

    if (!eq || !lvl || !src || !Array.isArray(matrixRows) || matrixRows.length === 0) {
      return res.status(400).json({ error: 'Invalid payload' });
    }

    // Snapshot insert
    const { data: snap, error: snapErr } = await adminSupabase
      .from('rates_snapshots')
      .insert([{ equipment: eq, level: lvl, source: src, matrix: matrixRows }])
      .select('id')
      .maybeSingle();

    if (snapErr) throw snapErr;
    const snapshotId = snap?.id;

    let flatInserted = 0;
    if (denormalize) {
      // Insert into rates_flat in batches
      const rows = matrixRows.map((r) => ({
        snapshot_id: snapshotId,
        equipment: eq,
        source: src,
        origin: String(r.origin || '').toUpperCase(),
        destination: String(r.destination || '').toUpperCase(),
        rate: Number(r.rate),
      })).filter((r) => r.origin && r.destination && Number.isFinite(r.rate));

      const chunk = 1000;
      for (let i = 0; i < rows.length; i += chunk) {
        const slice = rows.slice(i, i + chunk);
        const { error } = await adminSupabase.from('rates_flat').insert(slice);
        if (error) throw error;
        flatInserted += slice.length;
      }
    }

    return res.status(200).json({ snapshot_id: snapshotId, flat_rows: flatInserted });
  } catch (err) {
    console.error('POST /api/uploadMarketData error:', err);
    return res.status(500).json({ error: err.message || 'Upload failed' });
  }
}
