// utils/haversine.js
// Great-circle distance in miles (stable for small distances).
export function distanceInMiles(a, b) {
  const toRad = (deg) => (deg * Math.PI) / 180;
  const R = 3958.7613;
  const aLat = a.lat ?? a.latitude, aLon = a.lon ?? a.longitude;
  const bLat = b.lat ?? b.latitude, bLon = b.lon ?? b.longitude;
  const dLat = toRad(bLat - aLat);
  const dLon = toRad(bLon - aLon);
  const lat1 = toRad(aLat);
  const lat2 = toRad(bLat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}
