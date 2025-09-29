// pages/api/updateLaneStatus.js
import { validateApiAuth } from '../../middleware/auth.unified';
import { adminSupabase } from '../../utils/supabaseAdminClient';

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

    const { laneId, status } = req.body;
    
    if (!laneId || !status) {
      return res.status(400).json({ error: 'Lane ID and status required' });
    }

    // Valid status values
    const validStatuses = ['pending', 'posted', 'covered'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    // Update the lane status
    const { data, error } = await adminSupabase
      .from('lanes')
      .update({ status })
      .eq('id', laneId)
      .select();
    
    if (error) throw error;
    
    return res.status(200).json(data?.[0] || null);
  } catch (error) {
    console.error('Update Lane Status error:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
}
