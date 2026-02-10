// pages/api/lanes.js
import { validateApiAuth } from '../../middleware/auth.unified';
import { fetchLaneById } from '../../services/laneService.js';
import { getLanes } from '@/lib/laneService';
import { assertApiAuth, isInternalBypass } from '@/lib/auth';
import { getUserOrganizationId } from '@/lib/organizationHelper';

const ALLOWED_LANE_COLUMNS = new Set([
  'origin_city', 'origin_state', 'origin_zip', 'origin_zip5',
  'destination_city', 'destination_state', 'dest_city', 'dest_state', 'dest_zip', 'dest_zip5',
  'equipment_code', 'length_ft', 'full_partial',
  'pickup_earliest', 'pickup_latest',
  'randomize_weight', 'weight_lbs', 'weight_min', 'weight_max',
  'rate', 'randomize_rate', 'rate_min', 'rate_max',
  'comment', 'commodity',
  'lane_status', 'status', 'reference_id',
  'created_at', 'created_by', 'user_id', 'organization_id',
  'origin_latitude', 'origin_longitude', 'dest_latitude', 'dest_longitude'
]);

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

function toNumberOrNull(value) {
  if (value === '' || value === null || value === undefined) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function sanitizeLanePayload(payload = {}) {
  const sanitized = {};
  for (const [key, value] of Object.entries(payload)) {
    if (!ALLOWED_LANE_COLUMNS.has(key)) continue;
    if (value === undefined) continue;
    sanitized[key] = value;
  }
  return sanitized;
}

function extractMissingLaneColumn(error) {
  const message = String(error?.message || '');
  const match =
    message.match(/column ["']?([a-zA-Z0-9_]+)["']? of relation ["']?lanes["']? does not exist/i) ||
    message.match(/column ["']?([a-zA-Z0-9_]+)["']? does not exist/i);
  return match ? match[1] : null;
}

async function insertLaneWithFallback(supabaseAdmin, initialPayload) {
  let payload = sanitizeLanePayload(initialPayload);
  let attempts = 0;

  while (attempts < 6) {
    const result = await supabaseAdmin.from('lanes').insert([payload]).select();
    if (!result.error) return { ...result, payload };

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

    if (!changed) return { ...result, payload };
    attempts += 1;
  }

  return { data: null, error: { message: 'Failed to insert lane after fallback attempts' }, payload };
}

async function updateLaneWithFallback(supabaseAdmin, laneId, initialPayload) {
  let payload = sanitizeLanePayload(initialPayload);
  let attempts = 0;

  while (attempts < 6) {
    const result = await supabaseAdmin
      .from('lanes')
      .update(payload)
      .eq('id', laneId)
      .select('*');

    if (!result.error) return { ...result, payload };

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

    if (!changed) return { ...result, payload };
    attempts += 1;
  }

  return { data: null, error: { message: 'Failed to update lane after fallback attempts' }, payload };
}

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
      const rawOrgId = Array.isArray(req.query.organizationId) ? req.query.organizationId[0] : req.query.organizationId;

      const status = rawStatus ? String(rawStatus) : undefined;
      const limit = Number(rawLimit) || undefined;
      
      // Determine organization filtering
      let organizationId = rawOrgId ? String(rawOrgId) : undefined;
      
      // If no explicit organizationId was requested, auto-filter by user's org
      // (unless they're Admin, in which case they see all by default)
      if (!organizationId && auth) {
        const userId = auth.user?.id || auth.userId || auth.id;
        const userOrgId = await getUserOrganizationId(userId);
        const isAdmin = auth.profile?.role === 'Admin' || auth.user?.role === 'Admin';
        
        console.log('[GET /api/lanes] Auto-filter check:', {
          userId,
          userRole: auth.profile?.role,
          isAdmin,
          userOrgId,
          explicitOrgIdRequested: !!rawOrgId
        });
        
        // For non-Admin users, always filter by their organization
        // For Admin users, only filter if they explicitly requested it via toggle
        if (!isAdmin && userOrgId) {
          organizationId = userOrgId;
          console.log('[GET /api/lanes] Applied auto-filter for non-Admin user:', organizationId);
        }
      }

      const lanes = await getLanes({ status, limit, organizationId });
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
      const payload = parseRequestBody(req.body);
      if (payload.__parseError) {
        return res.status(400).json({ error: 'Invalid JSON body' });
      }

      const randomizeWeight = payload.randomize_weight === true || payload.randomize_weight === 'true' || payload.randomize_weight === 1 || payload.randomize_weight === '1';
      const weightLbs = toNumberOrNull(payload.weight_lbs);
      const weightMin = toNumberOrNull(payload.weight_min);
      const weightMax = toNumberOrNull(payload.weight_max);
      const randomizeRate = payload.randomize_rate === true || payload.randomize_rate === 'true' || payload.randomize_rate === 1 || payload.randomize_rate === '1';
      const rate = toNumberOrNull(payload.rate);
      const rateMin = toNumberOrNull(payload.rate_min);
      const rateMax = toNumberOrNull(payload.rate_max);

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
        return res.status(400).json({ error: 'Missing required fields: origin, destination, equipment, and pickup date are required' });
      }

      // Optional-field tolerant validation: only reject malformed values.
      if (!randomizeWeight && weightLbs !== null && weightLbs <= 0) {
        return res.status(400).json({ error: 'weight_lbs must be greater than 0 when provided' });
      }

      if (randomizeWeight && (weightMin !== null || weightMax !== null)) {
        if (weightMin === null || weightMax === null || weightMin <= 0 || weightMax <= 0 || weightMin > weightMax) {
          return res.status(400).json({ error: 'Invalid weight range for randomization' });
        }
      }

      if (!randomizeRate && rate !== null && rate < 0) {
        return res.status(400).json({ error: 'rate must be 0 or greater when provided' });
      }

      if (randomizeRate && (rateMin !== null || rateMax !== null)) {
        if (rateMin === null || rateMax === null || rateMin < 0 || rateMax < 0 || rateMin > rateMax) {
          return res.status(400).json({ error: 'Invalid rate range for randomization' });
        }
      }

      // Generate unique reference ID (format: RR##### where ##### is 10000-99999)
      function generateReferenceId() {
        // Generate 5-digit number without leading zeros (10000-99999)
        const random = 10000 + Math.floor(Math.random() * 90000);
        return `RR${random}`;
      }

      // City name corrections for known typos/variations (applied before database lookup)
      const CITY_CORRECTIONS = {
        'BELLWOOD, VA': 'Elkwood, VA',
        'REDWOOD, OR': 'Redmond, OR',
        'DASHER, GA': 'Jasper, GA',
        'ENSLEY, FL': 'Ensley, AL'
      };

      function applyCityCorrection(city, state) {
        const key = `${city}, ${state}`.toUpperCase();
        if (CITY_CORRECTIONS[key]) {
          const corrected = CITY_CORRECTIONS[key].split(', ');
          console.log(`✅ Corrected city: ${city}, ${state} → ${corrected[0]}, ${corrected[1]}`);
          return { city: corrected[0], state: corrected[1] };
        }
        return { city, state };
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
        destination_state: payloadDestinationState
      } = payload;
      
      // Map all destination variations to the canonical destination_* fields
      // Using nullish coalescing to try each possible source in priority order
      let destinationCity = payloadDestinationCity ?? dest_city ?? destCity ?? null;
      let destinationState = payloadDestinationState ?? dest_state ?? destState ?? null;

      // Apply city name corrections to origin and destination BEFORE database lookup
      const correctedOrigin = applyCityCorrection(payload.origin_city, payload.origin_state);
      const correctedDest = applyCityCorrection(destinationCity, destinationState);
      
      const originCityToLookup = correctedOrigin.city;
      const originStateToLookup = correctedOrigin.state;
      destinationCity = correctedDest.city;
      destinationState = correctedDest.state;
      
      // Look up coordinates from cities table
      const { data: originCityArray, error: originError } = await supabaseAdmin
        .from('cities')
        .select('latitude, longitude, zip')
        .eq('city', originCityToLookup)  // Use corrected city name
        .eq('state_or_province', originStateToLookup);  // Use corrected state
      
      if (originError) {
        console.error('Origin city lookup error:', originError);
        return res.status(500).json({ error: 'Failed to lookup origin city coordinates' });
      }

      let originCity = originCityArray && originCityArray.length > 0 ? originCityArray[0] : null;
      
      // If multiple cities found, try to match ZIP
      if (originCityArray && originCityArray.length > 1) {
        const targetZip = payload.origin_zip5 || payload.origin_zip;
        if (targetZip) {
           const exactMatch = originCityArray.find(c => c.zip === targetZip);
           if (exactMatch) originCity = exactMatch;
        }
      }
      
      if (!originCity) {
        return res.status(400).json({ 
          error: `Origin city not found: ${originCityToLookup}, ${originStateToLookup}. Please use a city from the database.`
        });
      }

      // If origin city has no coordinates, try to resolve from ZIP
      let originLat = originCity.latitude;
      let originLon = originCity.longitude;
      if ((!originLat || !originLon) && (payload.origin_zip5 || payload.origin_zip || originCity.zip)) {
        console.log(`[lanes] Origin city missing coords, attempting ZIP lookup for ${originCityToLookup}`);
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
            .eq('city', originCityToLookup)
            .eq('state_or_province', originStateToLookup);
        }
      }
      
      const { data: destCityDataArray, error: destError } = await supabaseAdmin
        .from('cities')
        .select('latitude, longitude, zip')
        .eq('city', destinationCity)
        .eq('state_or_province', destinationState);
      
      if (destError) {
        console.error('Destination city lookup error:', destError);
        return res.status(500).json({ error: 'Failed to lookup destination city coordinates' });
      }

      let destCityData = destCityDataArray && destCityDataArray.length > 0 ? destCityDataArray[0] : null;

      // If multiple cities found, try to match ZIP
      if (destCityDataArray && destCityDataArray.length > 1) {
        const targetZip = payload.dest_zip5 || payload.dest_zip;
        if (targetZip) {
           const exactMatch = destCityDataArray.find(c => c.zip === targetZip);
           if (exactMatch) destCityData = exactMatch;
        }
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
          error: `Unable to determine coordinates for origin city: ${originCityToLookup}, ${originStateToLookup}. Please provide a valid ZIP code.`
        });
      }
      
      if (!destLat || !destLon) {
        return res.status(400).json({
          error: `Unable to determine coordinates for destination city: ${destinationCity}, ${destinationState}. Please provide a valid ZIP code.`
        });
      }
      
      // Get user's organization_id for team-based data isolation
      const organizationId = await getUserOrganizationId(auth.user.id);
      const effectiveOrganizationId = organizationId || auth.user.id;
      if (!organizationId) {
        console.warn('[API] User has no organization_id, using user.id fallback for lane scope:', auth.user.id);
      }
      
      // Create the final lane object with standardized fields only
      const lane = sanitizeLanePayload({
        equipment_code: String(payload.equipment_code || '').toUpperCase(),
        length_ft: toNumberOrNull(payload.length_ft),
        full_partial: payload.full_partial === 'partial' ? 'partial' : 'full',
        randomize_weight: randomizeWeight,
        weight_lbs: weightLbs,
        weight_min: randomizeWeight ? weightMin : null,
        weight_max: randomizeWeight ? weightMax : null,
        randomize_rate: randomizeRate,
        rate,
        rate_min: randomizeRate ? rateMin : null,
        rate_max: randomizeRate ? rateMax : null,
        pickup_earliest: payload.pickup_earliest || null,
        pickup_latest: payload.pickup_latest || null,
        comment: payload.comment || null,
        commodity: payload.commodity || null,
        
        // Ensure ZIP codes are populated from DB lookup if missing in payload
        // This prevents constraint violations when frontend sends null but DB has the data
        origin_zip: payload.origin_zip || (originCity?.zip ? originCity.zip.substring(0, 3) : null),
        origin_zip5: payload.origin_zip5 || originCity?.zip || null,
        dest_zip: payload.dest_zip || (destCityData?.zip ? destCityData.zip.substring(0, 3) : null),
        dest_zip5: payload.dest_zip5 || destCityData?.zip || null,

        lane_status: payload.lane_status || payload.status || 'current',
        reference_id: generateReferenceId(),
        created_at: new Date().toISOString(),
        created_by: auth.user.id,
        user_id: auth.user.id,
        organization_id: effectiveOrganizationId, // Team ownership
        // Store the CORRECTED city names in the database
        origin_city: originCityToLookup,
        origin_state: originStateToLookup,
        destination_city: destinationCity,
        destination_state: destinationState,
        // Add coordinates (resolved from cities table or ZIP lookup)
        origin_latitude: originLat,
        origin_longitude: originLon,
        dest_latitude: destLat,
        dest_longitude: destLon
      });
      
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

      // Insert with schema-safe fallback (drops unknown columns when needed)
      const insertResult = await insertLaneWithFallback(supabaseAdmin, lane);
      const insertedLanes = insertResult.data;
      const insertError = insertResult.error;

      if (insertError) {
        console.error('❌ Lane creation error:', insertError);
        console.error('❌ Error details:', {
          message: insertError.message,
          details: insertError.details,
          hint: insertError.hint,
          code: insertError.code
        });
        const insertStatus = Number(insertError?.status) || (insertError?.code === '42703' ? 400 : 500);
        return res.status(insertStatus).json({ error: insertError.message || 'Failed to create lane' });
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

      const parsedBody = parseRequestBody(req.body);
      if (parsedBody.__parseError) {
        return res.status(400).json({ error: 'Invalid JSON body' });
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
      } = parsedBody;
      
      if (!id) {
        return res.status(400).json({ error: 'Lane ID required' });
      }
      
      // Create a clean updates object without any dest_* variants
      const updates = sanitizeLanePayload({
        ...updatesWithoutDestFields
      });
      
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
      
      const updateResult = await updateLaneWithFallback(supabaseAdmin, id, updates);
      const data = updateResult.data;
      const error = updateResult.error;
      
      if (error) {
        console.error('Lane update failed:', error);
        return res.status(Number(error?.status) || 500).json({ error: error?.message || 'Failed to update lane' });
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
    return res.status(Number(error?.status) || 500).json({ error: error?.message || 'Internal server error' });
  }
}
