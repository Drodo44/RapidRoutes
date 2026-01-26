// lib/haversine.js
// Great-circle distance in miles between two lat/lon points

const toRad = (deg) => (deg * Math.PI) / 180;

export function distanceInMiles(a, b) {
  if (!a || !b || a.lat == null || a.lon == null || b.lat == null || b.lon == null) {
    return Number.POSITIVE_INFINITY;
  }
  const R = 3958.7613; // Earth radius (miles)
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);

  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;

  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}
