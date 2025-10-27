// pages/api/laneRecords.js
// Updated: Return real user lanes from the 'lanes' table (not analytics)
// This ensures any existing clients that still call /api/laneRecords get correct, editable rows.

import { withErrorHandler } from '@/lib/apiErrorHandler';

async function handler(req, res) {
  let supabaseAdmin;
  try {
    supabaseAdmin = (await import('@/lib/supabaseAdmin')).default;
  } catch (importErr) {
    console.error('[laneRecords] Failed to import admin client:', importErr);
    return res.status(500).json({ ok: false, error: 'Server initialization failed' });
  }

  const { status, limit } = req.query || {};

  const finalStatus = typeof status === 'string' ? status : 'current';
  const finalLimit = Math.max(1, Math.min(Number(limit) || 200, 1000));

  let query = supabaseAdmin
    .from('lanes')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(finalLimit);

  if (finalStatus) {
    query = query.eq('lane_status', finalStatus);
  }

  const { data, error } = await query;
  if (error) {
    console.error('[laneRecords] lanes query failed:', error);
    return res.status(500).json({ ok: false, error: 'Failed to load lanes' });
  }

  return res.status(200).json({ ok: true, data: Array.isArray(data) ? data : [] });
}

export default withErrorHandler(handler);
