// pages/api/lanes/[id].js
import { validateApiAuth } from '../../../middleware/auth.unified';
import { adminSupabase } from '../../../utils/supabaseAdminClient';

export default async function handler(req, res) {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    res.setHeader('Allow', 'GET, PUT, PATCH, DELETE');
    return res.status(200).end();
  }

  // Validate authentication
  const auth = await validateApiAuth(req, res);
  if (!auth) return;

  const { id } = req.query;

  if (!id) {
    return res.status(400).json({ error: 'Lane ID required' });
  }

  try {
    // GET - Get specific lane
    if (req.method === 'GET') {
      const { data, error } = await adminSupabase
        .from('lanes')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      
      if (!data) {
        return res.status(404).json({ error: 'Lane not found' });
      }

      return res.status(200).json(data);
    }

    // PUT/PATCH - Update lane
    if (req.method === 'PUT' || req.method === 'PATCH') {
      const updates = req.body;
      
      if (!updates || Object.keys(updates).length === 0) {
        return res.status(400).json({ error: 'Update data required' });
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
      
      // Filter allowed update fields for security
      const allowedFields = [
        'pickup_earliest', 'pickup_latest', 'weight_lbs', 'weight_min', 'weight_max',
        'comment', 'commodity', 'status', 'full_partial', 'length_ft',
        'destination_city', 'destination_state' // Allow updating destination fields
      ];
      
      // Extract and map destination fields if using dest_* aliases
      const { dest_city, dest_state, ...updatesWithoutDestAliases } = updates;
      
      const filteredUpdates = {};
      for (const [key, value] of Object.entries(updatesWithoutDestAliases)) {
        if (allowedFields.includes(key)) {
          filteredUpdates[key] = value;
        }
      }
      
      // Map destination fields if provided via dest_* aliases
      if (dest_city !== undefined && !filteredUpdates.destination_city) {
        filteredUpdates.destination_city = dest_city;
      }
      
      if (dest_state !== undefined && !filteredUpdates.destination_state) {
        filteredUpdates.destination_state = dest_state;
      }
      
      console.log('[API] Update lane endpoint with mapped destination fields:', {
        id,
        original_dest_city: dest_city,
        original_dest_state: dest_state,
        mapped_destination_city: filteredUpdates.destination_city,
        mapped_destination_state: filteredUpdates.destination_state
      });

      const { data, error } = await adminSupabase
        .from('lanes')
        .update(filteredUpdates)
        .eq('id', id)
        .select('*')
        .single();
      
      if (error) throw error;
      return res.status(200).json(data);
    }
    
    // DELETE - Delete lane
    if (req.method === 'DELETE') {
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
    res.setHeader('Allow', 'GET, PUT, PATCH, DELETE');
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Lane API error:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
}