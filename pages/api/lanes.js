// pages/api/lanes.js
import { adminSupabase } from '../../utils/supabaseClient';

export default async function handler(req, res) {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    res.setHeader('Allow', 'GET, POST, PUT, DELETE');
    return res.status(200).end();
  }

  try {
    // GET - Get lanes with filtering
    if (req.method === 'GET') {
      const { status, days, all, limit = 100 } = req.query;

      let query = adminSupabase.from('lanes').select('*');

      if (status) {
        query = query.eq('status', status);
      }

      if (days) {
        const daysAgo = new Date();
        daysAgo.setDate(daysAgo.getDate() - parseInt(days, 10));
        query = query.gte('created_at', daysAgo.toISOString());
      }

      // Apply limit and order
      query = query.order('created_at', { ascending: false }).limit(parseInt(limit, 10));

      const { data, error } = await query;
      
      if (error) throw error;
      return res.status(200).json(data || []);
    }
    
    // POST - Create new lane
    if (req.method === 'POST') {
      const payload = req.body;
      
      if (!payload.origin_city || !payload.origin_state || !payload.dest_city || !payload.dest_state || 
          !payload.equipment_code || !payload.pickup_earliest) {
        return res.status(400).json({ error: 'Missing required fields' });
      }
      
      // Validate weight requirement
      if (!payload.randomize_weight && (!payload.weight_lbs || payload.weight_lbs <= 0)) {
        return res.status(400).json({ error: 'Weight is required when randomize is OFF' });
      }
      
      if (payload.randomize_weight) {
        if (!payload.weight_min || !payload.weight_max || payload.weight_min <= 0 || payload.weight_max <= 0 || payload.weight_min > payload.weight_max) {
          return res.status(400).json({ error: 'Invalid weight range for randomization' });
        }
      }

      // Handle defaults
      const lane = {
        ...payload,
        status: payload.status || 'pending',
        created_at: new Date().toISOString(),
      };

      const { data, error } = await adminSupabase.from('lanes').insert([lane]).select('*');
      
      if (error) throw error;
      return res.status(201).json(data?.[0] || null);
    }
    
    // PUT - Update lane
    if (req.method === 'PUT') {
      const { id, ...updates } = req.body;
      
      if (!id) {
        return res.status(400).json({ error: 'Lane ID required' });
      }
      
      const { data, error } = await adminSupabase
        .from('lanes')
        .update(updates)
        .eq('id', id)
        .select('*');
      
      if (error) throw error;
      return res.status(200).json(data?.[0] || null);
    }
    
    // DELETE - Delete lane
    if (req.method === 'DELETE') {
      const { id } = req.query;
      
      if (!id) {
        return res.status(400).json({ error: 'Lane ID required' });
      }
      
      const { error } = await adminSupabase
        .from('lanes')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      return res.status(204).end();
    }
    
    // Method not allowed
    res.setHeader('Allow', 'GET, POST, PUT, DELETE');
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Lane API error:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
}
