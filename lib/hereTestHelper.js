import fetch from 'node-fetch';
const HERE_API_KEY = process.env.HERE_API_KEY;

/**
 * Minimal direct HERE.com city query for testing (no Supabase)
 * @param {string} city
 * @param {string} state
 * @returns {Promise<Array>} Raw HERE.com city results (with distance from input city)
 */
export async function queryHereCities(city, state) {
  if (!HERE_API_KEY) throw new Error('HERE_API_KEY not set');
  // Sanitize query
  let cleanCity = (city || '').toString().trim().replace(/undefined|null/gi, '').replace(/[^\w\s,-]/g, '').replace(/\s+/g, ' ').replace(/,,+/g, ',').trim();
  let cleanState = (state || '').toString().trim().replace(/undefined|null/gi, '').replace(/[^\w\s,-]/g, '').trim();
  const baseQuery = cleanState ? `${cleanCity}, ${cleanState}, USA` : `${cleanCity}, USA`;
  // Use Geocode API for direct city lookups
  const url = `https://geocode.search.hereapi.com/v1/geocode?q=${encodeURIComponent(baseQuery)}&limit=100&apikey=${HERE_API_KEY}`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`HERE.com API error: ${response.status} ${response.statusText}`);
  }
  const data = await response.json();
  if (!data.items) return [];
  // Attach distance from input city (if possible)
  let baseLat = null, baseLng = null;
  if (data.items[0]?.position) {
    baseLat = data.items[0].position.lat;
    baseLng = data.items[0].position.lng;
  }
  function calculateDistance(lat1, lon1, lat2, lon2) {
    const toRad = x => x * Math.PI / 180;
    const R = 3958.8; // miles
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a = Math.sin(dLat/2)**2 + Math.cos(toRad(lat1))*Math.cos(toRad(lat2))*Math.sin(dLon/2)**2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  }
  return data.items.map(item => {
    let dist = null;
    if (baseLat && baseLng && item.position) {
      dist = calculateDistance(baseLat, baseLng, item.position.lat, item.position.lng);
    }
    return {
      city: item.address?.city || item.title?.split(',')[0] || '',
      state: item.address?.stateCode || item.address?.state || '',
      latitude: item.position?.lat,
      longitude: item.position?.lng,
      distance: dist,
      raw: item
    };
  });
}