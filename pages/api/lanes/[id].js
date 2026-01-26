// pages/api/lanes/[id].js
import { validateApiAuth } from '../../../middleware/auth.unified';
import { fetchLaneById } from '../../../services/laneService.js';

export default async function handler(req, res) {
  let supabaseAdmin;
  try {
    supabaseAdmin = (await import('@/lib/supabaseAdmin')).default;
  } catch (importErr) {
    return res.status(500).json({ error: 'Admin client initialization failed' });
  }

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
      const lane = await fetchLaneById(String(id), supabaseAdmin);

      if (!lane) {
        return res.status(404).json({ error: 'Lane not found' });
      }

      return res.status(200).json(lane);
    }

    // PUT/PATCH - Update lane
    if (req.method === 'PUT' || req.method === 'PATCH') {
      const updates = req.body;
      
      if (!updates || Object.keys(updates).length === 0) {
        return res.status(400).json({ error: 'Update data required' });
      }

      // Verify ownership or admin status
      const { data: existingLane } = await supabaseAdmin
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
      // Fields that can be updated by the user; use lane_status instead of deprecated status
      const allowedFields = [
        'pickup_earliest', 'pickup_latest', 'weight_lbs', 'weight_min', 'weight_max', 'randomize_weight',
        'rate', 'rate_min', 'rate_max', 'randomize_rate', 
        'comment', 'commodity', 'lane_status', 'full_partial', 'length_ft',
        'destination_city', 'destination_state', 'dest_city', 'dest_state',
        'dest_latitude', 'dest_longitude', 'dest_zip', 'dest_zip5',
        'origin_city', 'origin_state', 'origin_zip', 'origin_zip5',
        'origin_latitude', 'origin_longitude',
        'equipment_code'
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

      // Map origin fields if provided via origin_* aliases
      if (updates.origin_city !== undefined) filteredUpdates.origin_city = updates.origin_city;
      if (updates.origin_state !== undefined) filteredUpdates.origin_state = updates.origin_state;
      if (updates.origin_zip !== undefined) {
        filteredUpdates.origin_zip = updates.origin_zip;
        // Also update origin_zip5 if zip is provided
        if (updates.origin_zip) {
          filteredUpdates.origin_zip5 = updates.origin_zip.toString().substring(0, 5);
        }
      }
      
      // Also update dest_zip5 if dest_zip is provided
      if (filteredUpdates.dest_zip) {
        filteredUpdates.dest_zip5 = filteredUpdates.dest_zip.toString().substring(0, 5);
      }
      
      // Ensure we don't pass undefined values
      Object.keys(filteredUpdates).forEach(key => filteredUpdates[key] === undefined && delete filteredUpdates[key]);
      
      console.log('[API] Update lane endpoint with mapped destination fields:', {
        id,
        original_dest_city: dest_city,
        original_dest_state: dest_state,
        mapped_destination_city: filteredUpdates.destination_city,
        mapped_destination_state: filteredUpdates.destination_state,
        filteredUpdates
      });

      const { data, error } = await supabaseAdmin
        .from('lanes')
        .update(filteredUpdates)
        .eq('id', id)
        .select('*');

      if (error) {
        console.error('Failed to update lane', error);
        return res.status(500).json({ error: 'Failed to update lane', details: error.message });
      }
      if (!data || data.length === 0) {
        return res.status(404).json({ error: 'Lane not found after update' });
      }
      return res.status(200).json({ lane: data[0] });
    }
    
    // DELETE - Delete lane
    if (req.method === 'DELETE') {
      // Verify ownership or admin status before delete
      const { data: laneToDelete } = await supabaseAdmin
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
      
      const { error } = await supabaseAdmin
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