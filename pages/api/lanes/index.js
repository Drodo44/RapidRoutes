// pages/api/lanes/index.js
import { adminSupabase } from '../../../utils/supabaseClient';
import { supabase } from '../../../utils/supabaseClient';

export default async function handler(req, res) {
  try {
    // Verify authentication
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No auth token provided' });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    // Parse query parameters
    const { status, order, limit } = req.query;
    
    let query = adminSupabase.from('lanes').select('*');
    
    // Add filters
    if (status) {
      query = query.eq('status', status);
    }
    
    // Add ordering
    if (order) {
      const [column, direction] = order.split('.');
      query = query.order(column, { ascending: direction !== 'desc' });
    }
    
    // Add limit
    if (limit) {
      query = query.limit(parseInt(limit));
    }

    const { data: lanes, error } = await query;

    if (error) {
      console.error('Lanes query error:', error);
      return res.status(500).json({ error: 'Failed to fetch lanes' });
    }

    return res.status(200).json(lanes);
  } catch (error) {
    console.error('Lanes API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
