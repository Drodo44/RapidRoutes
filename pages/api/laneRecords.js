// pages/api/laneRecords.js
// Updated: Return real user lanes from the 'lanes' table (not analytics)
// This ensures any existing clients that still call /api/laneRecords get correct, editable rows.
// Force rebuild: 2025-11-05

import { withErrorHandler } from '@/lib/apiErrorHandler';
import { getAuthFromRequest } from '@/lib/auth';
import { getUserOrganizationId } from '@/lib/organizationHelper';

async function handler(req, res) {
  let supabaseAdmin;
  try {
    supabaseAdmin = (await import('@/lib/supabaseAdmin')).default;
  } catch (importErr) {
    console.error('[laneRecords] Failed to import admin client:', importErr);
    return res.status(500).json({ ok: false, error: 'Server initialization failed' });
  }

  const { status, limit, onlyWithSavedCities } = req.query || {};

  const finalStatus = typeof status === 'string' ? status : 'current';
  const finalLimit = Math.max(1, Math.min(Number(limit) || 200, 1000));
  const filterSavedCities = onlyWithSavedCities === '1' || onlyWithSavedCities === 'true';

  // Determine organization filtering - auto-filter by user's org unless they're Admin
  let organizationId = undefined;
  const auth = await getAuthFromRequest(req, res);
  
  if (auth) {
    const userId = auth.user?.id || auth.userId || auth.id;
    const userOrgId = await getUserOrganizationId(userId);
    const isAdmin = auth.profile?.role === 'Admin' || auth.user?.role === 'Admin';
    
    console.log('[laneRecords] Auto-filter check:', {
      userId,
      userRole: auth.profile?.role,
      isAdmin,
      userOrgId
    });
    
    // For non-Admin users, always filter by their organization
    // For Admin users, show all lanes by default (unless they use the toggle on lanes page)
    if (!isAdmin && userOrgId) {
      organizationId = userOrgId;
      console.log('[laneRecords] Applied auto-filter for non-Admin user:', organizationId);
    }
  }

  let query = supabaseAdmin
    .from('lanes')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(finalLimit);

  if (finalStatus) {
    query = query.eq('lane_status', finalStatus);
  }

  // Apply organization filter for non-Admin users
  if (organizationId) {
    query = query.eq('organization_id', organizationId);
  }

  // Filter for lanes with saved cities if requested
  if (filterSavedCities) {
    query = query.not('saved_origin_cities', 'is', null)
                 .not('saved_dest_cities', 'is', null');
  }

  const { data, error } = await query;
  if (error) {
    console.error('[laneRecords] lanes query failed:', error);
    return res.status(500).json({ ok: false, error: 'Failed to load lanes' });
  }

  return res.status(200).json({ ok: true, data: Array.isArray(data) ? data : [] });
}

export default withErrorHandler(handler);
