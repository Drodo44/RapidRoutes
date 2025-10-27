// services/browserLaneService.js
// Browser-safe lane service: wraps internal API routes. Do NOT import server-only clients here.

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
 * Fetch lanes via server API. Returns an array; never throws. Safe for browsers.
 */
export async function fetchLaneRecords(filters = {}) {
  try {
    const f = sanitizeLaneFilters(filters);
    const qs = toQuery(f);
    const res = await fetch(`/api/laneRecords?${qs}`, { 
      method: 'GET',
      // Add timeout and error handling to prevent infinite retries
      signal: AbortSignal.timeout(10000) // 10 second timeout
    });
    
    if (!res.ok) {
      console.error(`[browserLaneService.fetchLaneRecords] HTTP ${res.status}: ${res.statusText}`);
      return [];
    }
    
    const payload = await res.json().catch(() => ({ ok: false, data: [] }));
    if (!payload?.ok || !Array.isArray(payload.data)) {
      console.error('[browserLaneService.fetchLaneRecords] Invalid response payload');
      return [];
    }
    
    return payload.data;
  } catch (err) {
    console.error('[browserLaneService.fetchLaneRecords] Failed:', err);
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
