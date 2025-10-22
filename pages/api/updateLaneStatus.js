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

    const { error } = await adminSupabase
      .from('lanes')
      .update({ lane_status })
      .eq('id', id);

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
