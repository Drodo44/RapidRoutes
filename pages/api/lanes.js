// pages/api/lanes.js
import { validateApiAuth } from '../../middleware/auth.unified';
import { fetchLaneById } from '../../services/laneService.js';
import { getLanes } from '@/lib/laneService';
import { assertApiAuth, isInternalBypass } from '@/lib/auth';

export default async function handler(req, res) {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    res.setHeader('Allow', 'GET, POST, PUT, PATCH, DELETE');
    return res.status(200).end();
  }

  let auth = null;
  const bypassAuth = isInternalBypass(req);

  try {
    assertApiAuth(req);
  } catch (error) {
    const status = Number(error?.status) || 401;
    return res.status(status).json({ error: error?.message || 'Unauthorized' });
  }

  if (!bypassAuth) {
    const validated = await validateApiAuth(req, res);
    if (!validated) return;
    auth = validated;
  }

  // Debug logging only for non-GET requests
  if (req.method !== 'GET') {
    console.log('🚀 API Request:', req.method, req.url);
  }
  
  try {
    // GET - Get lanes with filtering
    if (req.method === 'GET') {
      const rawStatus = Array.isArray(req.query.status)
        ? req.query.status[0]
        : req.query.status ?? (Array.isArray(req.query.lane_status) ? req.query.lane_status[0] : req.query.lane_status);
      const rawLimit = Array.isArray(req.query.limit) ? req.query.limit[0] : req.query.limit;

      const status = rawStatus ? String(rawStatus) : undefined;
      const limit = Number(rawLimit) || undefined;

      const lanes = await getLanes({ status, limit });
      return res.status(200).json(lanes);
    }
    
    // POST - Create new lane
    if (req.method === 'POST') {
      // Initialize admin client lazily so we can catch env errors
      let supabaseAdmin;
      try {
        supabaseAdmin = (await import('@/lib/supabaseAdmin')).default;
      } catch (e) {
        console.error('[API/lanes] Admin client init failed:', e?.message || e);
        return res.status(500).json({ error: 'Server configuration error: admin client unavailable' });
      }
      if (!auth) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      console.log('POST request received for lane creation');
      const payload = req.body;

      // Check for destination data across all possible field variants
      const hasDestinationData = 
        payload.destination_city || 
        payload.destination_state || 
        payload.dest_city || 
        payload.dest_state ||
        payload.destCity ||
        payload.destState;
      
      // Validate required fields: origin + equipment + pickup date + at least one destination field
      if (!payload.origin_city || !payload.origin_state || !hasDestinationData || 
          !payload.equipment_code || !payload.pickup_earliest) {
        return res.status(400).json({ 
          error: 'Missing required fields',
          details: {
            has_origin: !!payload.origin_city && !!payload.origin_state,
            has_destination: !!hasDestinationData,
            has_equipment: !!payload.equipment_code,
            has_pickup_date: !!payload.pickup_earliest,
            // Include detailed field presence information for debugging
            field_status: {
              origin_city: !!payload.origin_city,
              origin_state: !!payload.origin_state,
              destination_city: !!payload.destination_city,
              destination_state: !!payload.destination_state,
              dest_city: !!payload.dest_city,
              dest_state: !!payload.dest_state,
              destCity: !!payload.destCity,
              destState: !!payload.destState
            }
          }
        });
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
        const random = Math.floor(Math.random() * 1000000).toString().padStart(6, '0');
        return `RR${year}${month}${day}${random}`;
      }

      // Handle defaults and field mapping
      // Never trust client for user_id/created_by, always generate new reference_id
      // Extract all possible destination field variants
      const { 
        dest_city, 
        dest_state, 
        destCity, 
        destState, 
        destination_city: payloadDestinationCity, 
        destination_state: payloadDestinationState,
        ...payloadWithoutDestFields 
      } = payload;
      
      // Map all destination variations to the canonical destination_* fields
      // Using nullish coalescing to try each possible source in priority order
      const destinationCity = payloadDestinationCity ?? dest_city ?? destCity ?? null;
      const destinationState = payloadDestinationState ?? dest_state ?? destState ?? null;
      
      // Look up coordinates from cities table
      const { data: originCity, error: originError } = await supabaseAdmin
        .from('cities')
        .select('latitude, longitude, zip')
        .eq('city', payload.origin_city)
        .eq('state_or_province', payload.origin_state)
        .maybeSingle();
      
      if (originError) {
        console.error('Origin city lookup error:', originError);
        return res.status(500).json({ error: 'Failed to lookup origin city coordinates' });
      }
      
      if (!originCity) {
        return res.status(400).json({ 
          error: `Origin city not found: ${payload.origin_city}, ${payload.origin_state}. Please use a city from the database.`
        });
      }

      // If origin city has no coordinates, try to resolve from ZIP
      let originLat = originCity.latitude;
      let originLon = originCity.longitude;
      if ((!originLat || !originLon) && (payload.origin_zip5 || payload.origin_zip || originCity.zip)) {
        console.log(`[lanes] Origin city missing coords, attempting ZIP lookup for ${payload.origin_city}`);
        const { resolveCoords } = await import('@/lib/resolve-coords');
        const zip = payload.origin_zip5 || payload.origin_zip || originCity.zip;
        const coordsResult = await resolveCoords(zip);
        if (coordsResult && coordsResult.latitude && coordsResult.longitude) {
          originLat = coordsResult.latitude;
          originLon = coordsResult.longitude;
          console.log(`✅ Resolved origin coords from ZIP ${zip}: ${originLat}, ${originLon}`);
          
          // Update the city record with the resolved coordinates
          await supabaseAdmin
            .from('cities')
            .update({ latitude: originLat, longitude: originLon })
            .eq('city', payload.origin_city)
            .eq('state_or_province', payload.origin_state);
        }
      }
      
      const { data: destCityData, error: destError } = await supabaseAdmin
        .from('cities')
        .select('latitude, longitude, zip')
        .eq('city', destinationCity)
        .eq('state_or_province', destinationState)
        .maybeSingle();
      
      if (destError) {
        console.error('Destination city lookup error:', destError);
        return res.status(500).json({ error: 'Failed to lookup destination city coordinates' });
      }
      
      if (!destCityData) {
        return res.status(400).json({ 
          error: `Destination city not found: ${destinationCity}, ${destinationState}. Please use a city from the database.`
        });
      }

      // If destination city has no coordinates, try to resolve from ZIP
      let destLat = destCityData.latitude;
      let destLon = destCityData.longitude;
      if ((!destLat || !destLon) && (payload.dest_zip5 || payload.dest_zip || destCityData.zip)) {
        console.log(`[lanes] Destination city missing coords, attempting ZIP lookup for ${destinationCity}`);
        const { resolveCoords } = await import('@/lib/resolve-coords');
        const zip = payload.dest_zip5 || payload.dest_zip || destCityData.zip;
        const coordsResult = await resolveCoords(zip);
        if (coordsResult && coordsResult.latitude && coordsResult.longitude) {
          destLat = coordsResult.latitude;
          destLon = coordsResult.longitude;
          console.log(`✅ Resolved destination coords from ZIP ${zip}: ${destLat}, ${destLon}`);
          
          // Update the city record with the resolved coordinates
          await supabaseAdmin
            .from('cities')
            .update({ latitude: destLat, longitude: destLon })
            .eq('city', destinationCity)
            .eq('state_or_province', destinationState);
        }
      }

      // Validate that we have coordinates
      if (!originLat || !originLon) {
        return res.status(400).json({
          error: `Unable to determine coordinates for origin city: ${payload.origin_city}, ${payload.origin_state}. Please provide a valid ZIP code.`
        });
      }
      
      if (!destLat || !destLon) {
        return res.status(400).json({
          error: `Unable to determine coordinates for destination city: ${destinationCity}, ${destinationState}. Please provide a valid ZIP code.`
        });
      }
      
      // Create the final lane object with standardized fields only
      const lane = {
        ...payloadWithoutDestFields, // Base fields excluding any dest_* variants
        lane_status: payload.lane_status || payload.status || 'current',
        reference_id: generateReferenceId(),
        created_at: new Date().toISOString(),
        created_by: auth.user.id,
        user_id: auth.user.id,
        // Always use destination_* fields for database consistency
        destination_city: destinationCity,
        destination_state: destinationState,
        // Add coordinates (resolved from cities table or ZIP lookup)
        origin_latitude: originLat,
        origin_longitude: originLon,
        dest_latitude: destLat,
        dest_longitude: destLon
      };
      
      // Detailed logging of the mapping process
      console.log('[API] Destination field mapping:', {
        original_fields: {
          dest_city,
          dest_state,
          destCity,
          destState,
          destination_city: payloadDestinationCity,
          destination_state: payloadDestinationState
        },
        final_fields: {
          destination_city: lane.destination_city,
          destination_state: lane.destination_state
        }
      });
      console.log('[API] Auth user id:', auth.user.id, 'Inserting lane:', lane);

      // Insert with admin client and get inserted row
      const { data: insertedLanes, error: insertError } = await supabaseAdmin
        .from('lanes')
        .insert([lane])
        .select();

      if (insertError) {
        console.error('❌ Lane creation error:', insertError);
        console.error('❌ Error details:', {
          message: insertError.message,
          details: insertError.details,
          hint: insertError.hint,
          code: insertError.code
        });
        return res.status(500).json({ 
          error: 'Failed to create lane',
          details: insertError.message,
          hint: insertError.hint
        });
      }
      const insertedLane = Array.isArray(insertedLanes) ? insertedLanes[0] : insertedLanes;
      console.log('[API] Inserted lane:', insertedLane);

  const laneRecord = await fetchLaneById(insertedLane.id, supabaseAdmin);
      if (!laneRecord) {
        console.warn('Lane created but not retrievable from view:', insertedLane.id);
        return res.status(201).json(insertedLane);
      }

      console.log('Lane created and fetched successfully:', laneRecord);
      console.log('🚀 API sending response - Lane ID:', laneRecord.id);
      res.status(201).json(laneRecord);
      return;
    }
    
    // PUT/PATCH - Update lane
    if (req.method === 'PUT' || req.method === 'PATCH') {
      // Initialize admin client lazily so we can catch env errors
      let supabaseAdmin;
      try {
        supabaseAdmin = (await import('@/lib/supabaseAdmin')).default;
      } catch (e) {
        console.error('[API/lanes] Admin client init failed:', e?.message || e);
        return res.status(500).json({ error: 'Server configuration error: admin client unavailable' });
      }
      if (!auth) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const { 
        id, 
        dest_city, 
        dest_state, 
        destCity, 
        destState, 
        destination_city: updatesDestinationCity, 
        destination_state: updatesDestinationState, 
        ...updatesWithoutDestFields 
      } = req.body;
      
      if (!id) {
        return res.status(400).json({ error: 'Lane ID required' });
      }
      
      // Create a clean updates object without any dest_* variants
      const updates = {
        ...updatesWithoutDestFields
      };
      
      // Map all destination field variants to the canonical destination_* fields
      // Using nullish coalescing to try each possible source in priority order
      if (updatesDestinationCity !== undefined || dest_city !== undefined || destCity !== undefined) {
        updates.destination_city = updatesDestinationCity ?? dest_city ?? destCity ?? null;
      }
      
      if (updatesDestinationState !== undefined || dest_state !== undefined || destState !== undefined) {
        updates.destination_state = updatesDestinationState ?? dest_state ?? destState ?? null;
      }
      
      console.log('[API] Update lane with mapped destination fields:', {
        id,
        original_fields: {
          dest_city,
          dest_state,
          destCity,
          destState,
          destination_city: updatesDestinationCity,
          destination_state: updatesDestinationState
        },
        final_fields: {
          destination_city: updates.destination_city,
          destination_state: updates.destination_state
        }
      });

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
      
      const { data, error } = await supabaseAdmin
        .from('lanes')
        .update(updates)
        .eq('id', id)
        .select('*');
      
      if (error) {
        console.error('Lane update failed:', error);
        return res.status(500).json({ error: 'Failed to update lane' });
      }
      const updatedLane = Array.isArray(data) ? data[0] : data;
  const laneRecord = await fetchLaneById(updatedLane?.id ?? id, supabaseAdmin);
      return res.status(200).json(laneRecord ?? updatedLane ?? null);
    }
    
    // DELETE - Delete lane
    if (req.method === 'DELETE') {
      // Initialize admin client lazily so we can catch env errors
      let supabaseAdmin;
      try {
        supabaseAdmin = (await import('@/lib/supabaseAdmin')).default;
      } catch (e) {
        console.error('[API/lanes] Admin client init failed:', e?.message || e);
        return res.status(500).json({ error: 'Server configuration error: admin client unavailable' });
      }
      if (!auth) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const { id } = req.query;
      
      if (!id) {
        return res.status(400).json({ error: 'Lane ID required' });
      }

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
      
      if (error) {
        console.error('Lane delete failed:', error);
        return res.status(500).json({ error: 'Failed to delete lane' });
      }
      return res.status(204).end();
    }
    
    // Method not allowed
    res.setHeader('Allow', 'GET, POST, PUT, PATCH, DELETE');
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Lane API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
