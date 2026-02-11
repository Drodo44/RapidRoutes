import { validateApiAuth } from '../../../middleware/auth.unified';
import { createClient } from '@supabase/supabase-js';

function sanitizeText(value) {
  const text = String(value || '').trim();
  return text.length ? text : null;
}

function sanitizeRate(value) {
  const parsed = Number.parseFloat(String(value));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function parseCityState(rawValue) {
  const text = sanitizeText(rawValue);
  if (!text) return { city: null, state: null };
  const parts = text.split(',').map((part) => sanitizeText(part));
  if (parts.length < 2) return { city: null, state: null };
  return {
    city: parts[0],
    state: parts[1],
  };
}

function getServiceRoleClient() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SERVICE_ROLE ||
    process.env.SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    return null;
  }

  return createClient(url, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
    global: {
      headers: { 'x-rapidroutes-client': 'api-archive-covered-service-role' },
    },
  });
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const auth = await validateApiAuth(req, res);
  if (!auth) return;

  const supabaseService = getServiceRoleClient();
  if (!supabaseService) {
    return res.status(500).json({ error: 'Service role client initialization failed' });
  }

  const organizationId =
    auth.profile?.organization_id ||
    auth.user?.user_metadata?.organization_id ||
    auth.user?.app_metadata?.organization_id ||
    null;

  if (!organizationId) {
    return res.status(403).json({ error: 'Organization context is required for archive' });
  }

  const laneId = sanitizeText(req.body?.laneId);
  const mcNumber = sanitizeText(req.body?.mc);
  const carrierEmail = sanitizeText(req.body?.email)?.toLowerCase() || null;
  const rateCovered = sanitizeRate(req.body?.rate);

  if (!laneId || !mcNumber || !carrierEmail || !rateCovered) {
    return res.status(400).json({
      error: 'laneId, mc, email, and valid rate are required',
    });
  }

  const nowIso = new Date().toISOString();

  try {
    const { data: lane, error: laneError } = await supabaseService
      .from('lanes')
      .select('*')
      .eq('id', laneId)
      .eq('organization_id', organizationId)
      .single();

    if (laneError || !lane) {
      return res.status(404).json({ error: 'Lane not found for this organization' });
    }

    const originCity = sanitizeText(lane.origin_city) || sanitizeText(lane.originCity);
    const originState = sanitizeText(lane.origin_state) || sanitizeText(lane.originState);

    let destCity =
      sanitizeText(lane.dest_city) ||
      sanitizeText(lane.destination_city) ||
      sanitizeText(lane.destCity) ||
      sanitizeText(lane.destinationCity);

    let destState =
      sanitizeText(lane.dest_state) ||
      sanitizeText(lane.destination_state) ||
      sanitizeText(lane.destState) ||
      sanitizeText(lane.destinationState);

    if ((!destCity || !destState) && Array.isArray(lane.saved_dest_cities)) {
      const firstSavedDest = lane.saved_dest_cities.find(
        (entry) => sanitizeText(entry?.city) && sanitizeText(entry?.state || entry?.state_or_province)
      );
      if (firstSavedDest) {
        destCity = destCity || sanitizeText(firstSavedDest.city);
        destState = destState || sanitizeText(firstSavedDest.state || firstSavedDest.state_or_province);
      }
    }

    if (!destCity || !destState) {
      const parsedDestination = parseCityState(lane.destination);
      destCity = destCity || parsedDestination.city;
      destState = destState || parsedDestination.state;
    }

    if (!originCity || !originState || !destCity || !destState) {
      return res.status(400).json({
        error:
          'Lane route is incomplete. Expected origin_city/origin_state and dest_city/dest_state (or destination_city/destination_state).',
      });
    }

    const { data: updatedLanes, error: laneUpdateError } = await supabaseService
      .from('lanes')
      .update({
        lane_status: 'archive',
        covered_at: nowIso,
      })
      .eq('id', laneId)
      .eq('organization_id', organizationId)
      .select('id, lane_status, covered_at');

    if (laneUpdateError) {
      console.error('[api/lanes/archive-covered] lanes mirror update failed:', laneUpdateError);
      const message = String(laneUpdateError.message || '').toLowerCase();
      if (message.includes('row-level security')) {
        return res.status(403).json({ error: 'Archive failed: lanes update blocked by RLS policy' });
      }
      return res.status(500).json({ error: 'Failed to update lanes archive mirror' });
    }

    if (!Array.isArray(updatedLanes) || updatedLanes.length !== 1) {
      return res.status(500).json({
        error: `Archive failed: expected 1 lane update, got ${Array.isArray(updatedLanes) ? updatedLanes.length : 0}`,
      });
    }

    const { data: existingCoverageRows, error: existingCoverageError } = await supabaseService
      .from('carrier_coverage')
      .select('id')
      .eq('lane_id', laneId)
      .eq('organization_id', organizationId)
      .limit(1);

    if (existingCoverageError) {
      console.error('[api/lanes/archive-covered] idempotency check failed:', existingCoverageError);
      return res.status(500).json({ error: 'Failed to validate existing archive coverage' });
    }

    if (Array.isArray(existingCoverageRows) && existingCoverageRows.length > 0) {
      return res.status(200).json({
        success: true,
        laneId,
        coveredAt: nowIso,
        message: 'already archived',
      });
    }

    const coveragePayload = {
      lane_id: laneId,
      origin_city: originCity,
      origin_state: originState,
      dest_city: destCity,
      dest_state: destState,
      mc_number: mcNumber,
      carrier_email: carrierEmail,
      rate_covered: rateCovered,
      covered_at: nowIso,
      user_id: auth.user.id,
      organization_id: organizationId,
    };

    const { error: coverageError } = await supabaseService.from('carrier_coverage').insert(coveragePayload);

    if (coverageError) {
      console.error('[api/lanes/archive-covered] carrier_coverage insert failed:', coverageError);
      return res.status(500).json({ error: 'Failed to write canonical carrier coverage record' });
    }

    return res.status(200).json({
      success: true,
      laneId,
      coveredAt: nowIso,
    });
  } catch (error) {
    console.error('[api/lanes/archive-covered] unexpected error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
