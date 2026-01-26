
import fetch from 'node-fetch';
import dotenv from 'dotenv';
dotenv.config();

const HERE_API_KEY = process.env.HERE_API_KEY;

/**
 * Get nearby US localities (cities) using HERE Discover API with circle filter.
 * @param {Object} opts
 * @param {number} opts.lat
 * @param {number} opts.lng
 * @param {number} [opts.radiusMiles=100]
 * @param {number} [opts.limit=100]
 * @returns {Promise<{cities: Array, debug: Object}>}
 */
export async function getNearbyLocalities({ lat, lng, radiusMiles = 100, limit = 100 }) {
  if (!HERE_API_KEY) throw new Error('HERE_API_KEY not set');
  const radiusMeters = Math.min(Math.round(radiusMiles * 1609.344), 160934); // cap at 100 miles
  const lim = Math.min(limit, 100);
  const url = `https://discover.search.hereapi.com/v1/discover?q=city&in=circle:${lat},${lng};r=${radiusMeters}&limit=${lim}&apikey=${HERE_API_KEY}`;
  const redact = url => url.replace(HERE_API_KEY, '***');
  console.debug('HERE URL:', redact(url));
  let resp = await fetch(url);
  let status = resp.status;
  let json = await resp.json().catch(() => ({}));
  if (status !== 200) {
    console.error('HERE Discover API error:', status, JSON.stringify(json));
    return { cities: [], debug: { endpointUsed: 'discover', totalFetchedBeforeFilter: 0, totalAfterDedup: 0 } };
  }
  let items = Array.isArray(json.items) ? json.items : [];
  console.debug(`HERE discover status: ${status}, items: ${items.length}`);
  const totalFetchedBeforeFilter = items.length;

  // Accept only localities (city-level)
  const filtered = items.filter(item =>
    (item.resultType === 'locality' || (item.address?.city))
  );

  // Map to city objects
  let mapped = filtered.map(item => ({
    city: item.address?.city || item.title?.split(',')[0] || null,
    state_or_province: item.address?.stateCode || item.address?.state || null,
    latitude: item.position?.lat,
    longitude: item.position?.lng,
    postal_code: item.address?.postalCode || null,
    source: 'HERE'
  }));
  // Drop incomplete
  mapped = mapped.filter(c => c.city && c.state_or_province && c.latitude && c.longitude);
  // Deduplicate by city|state
  const dedup = {};
  for (const c of mapped) {
    const key = `${c.city}|${c.state_or_province}`;
    if (!dedup[key]) dedup[key] = c;
  }
  const cities = Object.values(dedup);
  return {
    cities,
    debug: {
      endpointUsed: 'discover',
      totalFetchedBeforeFilter,
      totalAfterDedup: cities.length
    }
  };
}
