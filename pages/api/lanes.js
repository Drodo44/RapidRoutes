// pages/api/lanes.js
import { validateApiAuth } from '../../middleware/auth.unified';
import { adminSupabase } from '../../utils/supabaseClient';
import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    res.setHeader('Allow', 'GET, POST, PUT, DELETE');
    return res.status(200).end();
  }

  // Validate authentication for all requests
  const auth = await validateApiAuth(req, res);
  if (!auth) return;

  console.log('API Request:', req.method, 'Body:', req.body ? 'present' : 'empty');
  
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
  res.status(200).json(data || []);
  return;
    }
    
    // POST - Create new lane
    if (req.method === 'POST') {
      console.log('POST request received for lane creation');
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

      // Generate unique reference ID
      function generateReferenceId() {
        const now = new Date();
        const year = now.getFullYear().toString().slice(-2);
        const month = (now.getMonth() + 1).toString().padStart(2, '0');
        const day = now.getDate().toString().padStart(2, '0');
        const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
        return `RR${year}${month}${day}${random}`;
      }

      // Handle defaults
      // Never trust client for user_id/created_by
      const lane = {
        ...payload,
        status: payload.status || 'pending',
        reference_id: payload.reference_id || generateReferenceId(),
        created_at: new Date().toISOString(),
        created_by: auth.user.id,
        user_id: auth.user.id,
      };
      // Remove any user_id/created_by from payload to avoid confusion
      if ('user_id' in lane && lane.user_id !== auth.user.id) {
        console.warn('[API] Overwriting user_id from payload:', lane.user_id, 'to', auth.user.id);
        lane.user_id = auth.user.id;
      }
      if ('created_by' in lane && lane.created_by !== auth.user.id) {
        console.warn('[API] Overwriting created_by from payload:', lane.created_by, 'to', auth.user.id);
        lane.created_by = auth.user.id;
      }
      console.log('[API] Auth user id:', auth.user.id, 'Inserting lane with user_id:', lane.user_id, 'lane:', lane);

      // Insert with admin client
      const { error: insertError } = await adminSupabase
        .from('lanes')
        .insert([lane]);

      if (insertError) {
        console.error('Lane creation error:', insertError);
        return res.status(500).json({ error: insertError.message || 'Database error', details: insertError });
      }

      // Now fetch with user JWT to satisfy RLS
      const userToken = req.headers.authorization?.replace('Bearer ', '');
      if (!userToken) {
        return res.status(401).json({ error: 'Missing user token in Authorization header' });
      }
      const userSupabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
        global: { headers: { Authorization: `Bearer ${userToken}` } }
      });

      const { data: laneData, error: selectError } = await userSupabase
        .from('lanes')
        .select('*')
        .eq('reference_id', lane.reference_id)
        .eq('user_id', auth.user.id)
        .single();

      console.log('[API] Fetched lane for user:', auth.user.id, 'lane:', laneData, 'error:', selectError);
      if (selectError || !laneData) {
        console.error('Lane created but not visible due to RLS:', { selectError, lane });
        return res.status(500).json({ error: 'Lane created but not visible due to RLS', selectError, lane });
      }

      console.log('Lane created and fetched successfully:', laneData);
      res.status(201).json(laneData);
      return;
      
      if (error) {
        console.error('Lane creation error:', error);
        throw error;
      }
      if (!data?.id) {
        console.error('Lane created but no ID returned:', data);
        throw new Error('Lane creation failed - database did not return an ID');
      }
      console.log('Lane created successfully:', data);
      res.status(201).json(data);
      return;
    }
    
    // PUT - Update lane
    if (req.method === 'PUT') {
      const { id, ...updates } = req.body;
      
      if (!id) {
        return res.status(400).json({ error: 'Lane ID required' });
      }

      // Verify ownership or admin status
      const { data: existingLane } = await adminSupabase
        .from('lanes')
        .select('created_by')
        .eq('id', id)
        .single();

      if (!existingLane) {
        return res.status(404).json({ error: 'Lane not found' });
      }

      // Only allow update if user owns the lane or is an admin
      if (existingLane.created_by !== auth.user.id && auth.profile.role !== 'Admin') {
        return res.status(403).json({ error: 'Not authorized to modify this lane' });
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

      // Verify ownership or admin status before delete
      const { data: laneToDelete } = await adminSupabase
        .from('lanes')
        .select('created_by')
        .eq('id', id)
        .single();

      if (!laneToDelete) {
        return res.status(404).json({ error: 'Lane not found' });
      }

      if (laneToDelete.created_by !== auth.user.id && auth.profile.role !== 'Admin') {
        return res.status(403).json({ error: 'Not authorized to delete this lane' });
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
