// pages/api/updateLaneStatus.js
import apiAuth from '../../middleware/apiAuth';
import { adminSupabase } from '../../utils/supabaseClient';

function runMiddleware(req, res, fn) {
  return new Promise((resolve, reject) => {
    fn(req, res, (result) => {
      if (result instanceof Error) {
        return reject(result);
      }
      return resolve(result);
    });
  });
}

export default async function handler(req, res) {
  try {
    // Run the middleware
    await runMiddleware(req, res, apiAuth);
    
    if (req.method !== 'PUT') {
      res.setHeader('Allow', 'PUT');
      return res.status(405).json({ error: 'Method not allowed' });
    }

    const { laneId, status } = req.body;
    
    if (!laneId || !status) {
      return res.status(400).json({ error: 'Lane ID and status required' });
    }
    
    // Validate status value
    const validStatuses = ['pending', 'posted', 'covered'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status value' });
    }

    const { data, error } = await adminSupabase
      .from('lanes')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', laneId)
      .select('*');
    
    if (error) throw error;
    
    return res.status(200).json(data?.[0] || null);
  } catch (error) {
    console.error('Update Lane Status error:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
}
