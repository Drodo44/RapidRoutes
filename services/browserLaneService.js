
// services/browserLaneService.js
// Browser-safe lane service: wraps internal API routes. Do NOT import server-only clients here.
// Rebuilt: 2025-11-05

const DEFAULT_LIMIT = 200;
const MAX_LIMIT = 2000;

export function sanitizeLaneFilters(filters = {}) {
  const limit = filters.limit || DEFAULT_LIMIT;
  const sanitizedLimit = Number.isFinite(limit)
    ? Math.max(1, Math.min(Number(limit), MAX_LIMIT))
    : DEFAULT_LIMIT;

  return {
    status: filters.status || 'current',
    limit: sanitizedLimit,
    searchTerm: typeof filters.searchTerm === 'string' ? filters.searchTerm.trim() : undefined,
    onlyWithSavedCities: !!filters.onlyWithSavedCities,
    includeArchived: !!filters.includeArchived,
    organizationId: filters.organizationId || undefined,
    originKmaCodes: Array.isArray(filters.originKmaCodes) ? filters.originKmaCodes : [],
    destinationKmaCodes: Array.isArray(filters.destinationKmaCodes) ? filters.destinationKmaCodes : [],
    originZip3: filters.originZip3,
    destinationZip3: filters.destinationZip3,
    createdAfter: filters.createdAfter,
    createdBefore: filters.createdBefore,
  };
}

function toQuery(params = {}) {
  const q = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v === undefined || v === null) return;
    if (Array.isArray(v)) {
      if (v.length) q.set(k, v.join(','));
    } else if (typeof v === 'boolean') {
      q.set(k, v ? '1' : '0');
    } else {
      q.set(k, String(v));
    }
  });
  return q.toString();
}

/**
 * Fetch lanes via server API. Returns an array by default. Set filters.throwOnError=true to throw.
 */
export async function fetchLaneRecords(filters = {}) {
  const throwOnError = !!filters.throwOnError;
  try {
    const f = sanitizeLaneFilters(filters);
    
    // Get auth token and user profile from Supabase session
    let authHeader = {};
    let userProfile = null;
    try {
      const { default: supabase } = await import('../lib/supabaseClient.js');
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token) {
        authHeader = { 'Authorization': `Bearer ${session.access_token}` };
        
        // Get user profile to check role and organizationId
        const { data: profile } = await supabase
          .from('profiles')
          .select('role, organization_id')
          .eq('id', session.user.id)
          .single();
        userProfile = profile;
      }
    } catch (err) {
      console.warn('[browserLaneService] Could not get auth token:', err);
    }
    
    // If user is Admin and hasn't explicitly set organizationId, check localStorage preference
    if (userProfile?.role === 'Admin' && !f.organizationId && typeof window !== 'undefined') {
      try {
        const { getMyLanesOnlyPreference } = await import('../lib/laneFilterPreferences.js');
        const showMyLanesOnly = getMyLanesOnlyPreference();
        console.log('[browserLaneService] Admin user detected:', {
          role: userProfile.role,
          organizationId: userProfile.organization_id,
          togglePreference: showMyLanesOnly,
          willFilter: showMyLanesOnly && userProfile.organization_id
        });
        if (showMyLanesOnly && userProfile.organization_id) {
          f.organizationId = userProfile.organization_id;
          console.log('[browserLaneService] Admin toggle enabled, filtering by organization:', f.organizationId);
        }
      } catch (err) {
        console.warn('[browserLaneService] Could not check lane filter preference:', err);
      }
    }
    
    const qs = toQuery(f);
    
    const res = await fetch(`/api/laneRecords?${qs}`, { 
      method: 'GET',
      headers: authHeader,
      // Add timeout and error handling to prevent infinite retries
      signal: AbortSignal.timeout(10000) // 10 second timeout
    });
    
    if (!res.ok) {
      const errorPayload = await res.json().catch(() => null);
      const message = errorPayload?.error || errorPayload?.message || `HTTP ${res.status}: ${res.statusText}`;
      console.error(`[browserLaneService.fetchLaneRecords] ${message}`);
      if (throwOnError) {
        throw new Error(message);
      }
      return [];
    }
    
    const payload = await res.json().catch(() => ({ ok: false, data: [] }));
    if (!payload?.ok || !Array.isArray(payload.data)) {
      const message = payload?.error || payload?.message || 'Invalid response payload';
      console.error('[browserLaneService.fetchLaneRecords] Invalid response payload:', message);
      if (throwOnError) {
        throw new Error(message);
      }
      return [];
    }
    
    return payload.data;
  } catch (err) {
    console.error('[browserLaneService.fetchLaneRecords] Failed:', err);
    if (throwOnError) {
      throw err instanceof Error ? err : new Error(String(err));
    }
    return [];
  }
}

/**
 * Lightweight helper that hits the lanes fetch endpoint. Currently supports equipment filter and limit.
 */
export async function getLanesByIdsOrQuery({ equipment = '%', limit = DEFAULT_LIMIT } = {}) {
  try {
    const q = toQuery({ equipment, limit });
    const res = await fetch(`/api/lanes/fetch?${q}`, { method: 'GET' });
    const payload = await res.json().catch(() => ({ ok: false, data: [] }));
    if (!res.ok || !payload?.ok || !Array.isArray(payload.data)) return [];
    return payload.data;
  } catch (err) {
    console.error('[browserLaneService.getLanesByIdsOrQuery] Failed:', err);
    return [];
  }
}

export async function countLaneRecords() {
  // Not implemented for browser; add server API when needed
  return 0;
}
