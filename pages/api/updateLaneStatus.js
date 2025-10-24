// pages/api/updateLaneStatus.js
import { validateApiAuth } from '../../middleware/auth.unified';
import supabaseAdmin from "@/lib/supabaseAdmin";

export default async function handler(req, res) {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    res.setHeader('Allow', 'PUT');
    return res.status(200).end();
  }

  // Validate authentication for all requests
  const auth = await validateApiAuth(req, res);
  if (!auth) return;

  try {
    if (req.method !== 'PUT') {
      res.setHeader('Allow', 'PUT');
      return res.status(405).json({ error: 'Method not allowed' });
    }

    const { id, lane_status } = req.body;

    if (!id || !lane_status) {
      return res.status(400).json({ error: 'Missing id or lane_status' });
    }

    const validStatuses = ['current', 'archive'];
    if (!validStatuses.includes(lane_status)) {
      return res.status(400).json({ error: 'Invalid lane_status value. Must be "current" or "archive"' });
    }

    // Defensive: support reference_id fallback and fail fast on non-UUID analytics IDs
    const isUuid = typeof id === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
    let targetId = id;

    if (!isUuid) {
      // If it looks like an RR reference, try resolving to the real UUID
      if (typeof id === 'string' && id.startsWith('RR')) {
        const { data: refRow, error: refErr } = await supabaseAdmin
          .from('lanes')
          .select('id')
          .eq('reference_id', id)
          .maybeSingle();
        if (refErr) {
          console.error('reference_id lookup error:', refErr);
          return res.status(500).json({ error: 'Failed to resolve lane by reference_id' });
        }
        if (!refRow?.id) {
          return res.status(404).json({ error: 'Lane not found for reference_id' });
        }
        targetId = refRow.id;
      } else {
        // Numeric or non-uuid/non-RR IDs are analytics load IDs, not editable lanes
        return res.status(400).json({ error: 'Invalid lane id. Please refresh Lanes; only user-created lanes can be archived.' });
      }
    }

    const { error } = await supabaseAdmin
      .from('lanes')
      .update({ lane_status })
      .eq('id', targetId);

    if (error) {
      console.error('Failed to update lane_status', error);
      return res.status(500).json({ error: 'Failed to update lane_status', details: error.message });
    }
    return res.status(200).json({ message: 'Lane status updated' });
  } catch (error) {
    console.error('Update Lane Status error:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
}
