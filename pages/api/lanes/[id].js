// pages/api/lanes/[id].js
import { validateApiAuth } from '../../../middleware/auth.unified';
import { fetchLaneById } from '../../../services/laneService.js';

function parseRequestBody(body) {
  if (!body) return {};
  if (typeof body === 'string') {
    try {
      return JSON.parse(body);
    } catch {
      return { __parseError: true };
    }
  }
  if (typeof body === 'object') return body;
  return {};
}

function extractMissingLaneColumn(error) {
  const message = String(error?.message || '');
  const match =
    message.match(/column ["']?([a-zA-Z0-9_]+)["']? of relation ["']?lanes["']? does not exist/i) ||
    message.match(/column ["']?([a-zA-Z0-9_]+)["']? does not exist/i);
  return match ? match[1] : null;
}

async function updateLaneWithFallback(supabaseAdmin, laneId, initialPayload) {
  let payload = { ...initialPayload };
  let attempts = 0;

  while (attempts < 6) {
    const result = await supabaseAdmin
      .from('lanes')
      .update(payload)
      .eq('id', laneId)
      .select('*');

    if (!result.error) return result;

    const message = String(result.error?.message || '');
    let changed = false;

    if ((message.includes('destination_city') || message.includes('destination_state')) &&
      (payload.destination_city !== undefined || payload.destination_state !== undefined)) {
      payload.dest_city = payload.destination_city;
      payload.dest_state = payload.destination_state;
      delete payload.destination_city;
      delete payload.destination_state;
      changed = true;
    }

    if (message.includes('lane_status') && payload.lane_status !== undefined) {
      payload.status = payload.lane_status;
      delete payload.lane_status;
      changed = true;
    }

    const missingColumn = extractMissingLaneColumn(result.error);
    if (missingColumn && Object.prototype.hasOwnProperty.call(payload, missingColumn)) {
      delete payload[missingColumn];
      changed = true;
    }

    if (!changed) return result;
    attempts += 1;
  }

  return { data: null, error: { message: 'Failed to update lane after fallback attempts' } };
}

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
      const updates = parseRequestBody(req.body);
      if (updates.__parseError) {
        return res.status(400).json({ error: 'Invalid JSON body' });
      }
      
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

      const { data, error } = await updateLaneWithFallback(supabaseAdmin, id, filteredUpdates);

      if (error) {
        console.error('Failed to update lane', error);
        return res.status(Number(error?.status) || 500).json({ error: error?.message || 'Failed to update lane' });
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
    return res.status(Number(error?.status) || 500).json({ error: error?.message || 'Internal server error' });
  }
}
