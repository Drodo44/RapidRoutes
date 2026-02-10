// pages/api/laneRecords.js
// Updated: Return real user lanes from the 'lanes' table (not analytics)
// This ensures any existing clients that still call /api/laneRecords get correct, editable rows.
// Force rebuild: 2025-11-05

import { withErrorHandler } from '@/lib/apiErrorHandler';
import { getAuthFromRequest } from '@/lib/auth';
import { getUserOrganizationId } from '@/lib/organizationHelper';

const IS_DEV = process.env.NODE_ENV !== 'production';

function normalizeLaneRecord(lane) {
  if (!lane || typeof lane !== 'object') return lane;

  const normalizedDestCity = lane.dest_city ?? lane.destination_city ?? null;
  const normalizedDestState = lane.dest_state ?? lane.destination_state ?? null;
  const normalizedStatus = lane.lane_status ?? lane.status ?? 'current';
  const normalizedSavedOrigins = Array.isArray(lane.saved_origin_cities)
    ? lane.saved_origin_cities
    : Array.isArray(lane.saved_origins)
      ? lane.saved_origins
      : Array.isArray(lane.origin_cities)
        ? lane.origin_cities
        : [];
  const normalizedSavedDests = Array.isArray(lane.saved_dest_cities)
    ? lane.saved_dest_cities
    : Array.isArray(lane.saved_dests)
      ? lane.saved_dests
      : Array.isArray(lane.dest_cities)
        ? lane.dest_cities
        : [];

  return {
    ...lane,
    dest_city: normalizedDestCity,
    dest_state: normalizedDestState,
    destination_city: lane.destination_city ?? normalizedDestCity,
    destination_state: lane.destination_state ?? normalizedDestState,
    saved_origin_cities: normalizedSavedOrigins,
    saved_dest_cities: normalizedSavedDests,
    lane_status: normalizedStatus,
    status: lane.status ?? normalizedStatus,
  };
}

function hasSavedCities(lane) {
  return Array.isArray(lane?.saved_origin_cities) &&
    lane.saved_origin_cities.length > 0 &&
    Array.isArray(lane?.saved_dest_cities) &&
    lane.saved_dest_cities.length > 0;
}

function laneMatchesStatus(lane, requestedStatus) {
  const normalizedRequested = String(requestedStatus || '').trim().toLowerCase();
  if (!normalizedRequested || normalizedRequested === 'all') return true;

  const rawLaneStatus = lane?.lane_status ?? lane?.status;
  const normalizedLaneStatus = rawLaneStatus == null || rawLaneStatus === ''
    ? 'current'
    : String(rawLaneStatus).trim().toLowerCase();

  return normalizedLaneStatus === normalizedRequested;
}

async function handler(req, res) {
  let supabaseAdmin;
  try {
    supabaseAdmin = (await import('@/lib/supabaseAdmin')).default;
  } catch (importErr) {
    console.error('[laneRecords] Failed to import admin client:', importErr);
    return res.status(500).json({ ok: false, error: 'Server initialization failed' });
  }

  const { status, limit, onlyWithSavedCities, organizationId: requestedOrgId } = req.query || {};

  const finalStatus = typeof status === 'string' ? status : 'current';
  const finalLimit = Math.max(1, Math.min(Number(limit) || 200, 1000));
  const filterSavedCities = onlyWithSavedCities === '1' || onlyWithSavedCities === 'true';
  const fetchLimit = Math.max(finalLimit, Math.min(finalLimit * 4, 2000));

  // Determine organization filtering - auto-filter by user's org unless they're Admin
  let organizationId = requestedOrgId ? String(requestedOrgId) : undefined;
  const auth = await getAuthFromRequest(req, res);
  const userId = auth?.user?.id || auth?.userId || auth?.id || null;
  const userRole = auth?.profile?.role || auth?.user?.role || null;
  
  if (auth && !organizationId) {
    // Only auto-filter if no explicit organizationId was requested
    const userId = auth.user?.id || auth.userId || auth.id;
    const userOrgId = await getUserOrganizationId(userId);
    const isAdmin = auth.profile?.role === 'Admin' || auth.user?.role === 'Admin';
    
    if (IS_DEV) {
      console.log('[laneRecords] Auto-filter check:', {
        userId,
        userRole: auth.profile?.role,
        isAdmin,
        userOrgId,
        explicitOrgIdRequested: !!requestedOrgId
      });
    }
    
    // For non-Admin users, always filter by their organization
    // For Admin users, only filter if they explicitly requested it via toggle
    if (!isAdmin && userOrgId) {
      organizationId = userOrgId;
      if (IS_DEV) {
        console.log('[laneRecords] Applied auto-filter for non-Admin user:', organizationId);
      }
    }
  }

  let query = supabaseAdmin
    .from('lanes')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(fetchLimit);

  // Apply organization filter for non-Admin users
  if (organizationId) {
    query = query.eq('organization_id', organizationId);
  }

  const { data, error } = await query;
  if (error) {
    console.error('[laneRecords] lanes query failed:', error);
    return res.status(500).json({
      ok: false,
      error: error.message || 'Failed to load lanes',
      details: error.details || null,
    });
  }

  const fetchedRows = Array.isArray(data) ? data : [];
  const normalizedRows = fetchedRows.map(normalizeLaneRecord);
  const afterStatusRows = normalizedRows.filter((lane) => laneMatchesStatus(lane, finalStatus));
  const afterSavedCitiesRows = filterSavedCities
    ? afterStatusRows.filter(hasSavedCities)
    : afterStatusRows;
  const finalRows = afterSavedCitiesRows.slice(0, finalLimit);

  if (IS_DEV) {
    const filterSummary = {
      userId,
      userRole,
      organizationId: organizationId || null,
      filters: {
        status: finalStatus,
        limit: finalLimit,
        onlyWithSavedCities: filterSavedCities,
      },
      counts: {
        fetchedBeforeFilters: normalizedRows.length,
        afterStatusFilter: afterStatusRows.length,
        afterSavedCitiesFilter: afterSavedCitiesRows.length,
        returned: finalRows.length,
      },
    };

    if (finalRows.length === 0) {
      console.log('[laneRecords] 0 rows after filtering', filterSummary);
    } else {
      console.log('[laneRecords] filter summary', filterSummary);
    }
  }

  return res.status(200).json({ ok: true, data: finalRows });
}

export default withErrorHandler(handler);
