// lib/haversine.js
const R = 3958.7613; // miles
export function distanceInMiles(a, b) {
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad((b.lat || 0) - (a.lat || 0));
  const dLon = toRad((b.lon || 0) - (a.lon || 0));
  const la = toRad(a.lat || 0), lb = toRad(b.lat || 0);
  const h = Math.sin(dLat/2)**2 + Math.cos(la) * Math.cos(lb) * Math.sin(dLon/2)**2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}
