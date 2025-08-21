// pages/api/laneStatus.js
import { adminSupabase } from '../../utils/supabaseClient';

export default async function handler(req, res) {
  if (req.method !== 'PUT') {
    res.setHeader('Allow', 'PUT');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { id, status } = req.body;
    
    if (!id || !status) {
      return res.status(400).json({ error: 'Lane ID and status required' });
    }
    
    // Validate status value
    const validStatuses = ['pending', 'posted', 'covered'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status value' });
    }

    const { data, error } = await adminSupabase
      .from('lanes')
      .update({ status })
      .eq('id', id)
      .select('*');
    
    if (error) throw error;
    return res.status(200).json(data?.[0] || null);
  } catch (error) {
    console.error('Lane Status API error:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
}
