/**
 * Utility for calculating distances between geographic points
 */

const EARTH_RADIUS_MILES = 3959;

/**
 * Calculate distance between two points using the Haversine formula
 * @param {number} lat1 - Latitude of first point in decimal degrees
 * @param {number} lon1 - Longitude of first point in decimal degrees
 * @param {number} lat2 - Latitude of second point in decimal degrees
 * @param {number} lon2 - Longitude of second point in decimal degrees
 * @returns {number} Distance in miles
 */
export function calculateDistance(lat1, lon1, lat2, lon2) {
  // Input validation
  lat1 = Number(lat1);
  lon1 = Number(lon1);
  lat2 = Number(lat2);
  lon2 = Number(lon2);

  if (isNaN(lat1) || isNaN(lon1) || isNaN(lat2) || isNaN(lon2)) {
    console.warn('Invalid coordinates:', { lat1, lon1, lat2, lon2 });
    return Infinity;
  }

  // Convert to radians
  const rlat1 = lat1 * Math.PI / 180;
  const rlon1 = lon1 * Math.PI / 180;
  const rlat2 = lat2 * Math.PI / 180;
  const rlon2 = lon2 * Math.PI / 180;

  // Haversine formula
  const dLat = rlat2 - rlat1;
  const dLon = rlon2 - rlon1;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(rlat1) * Math.cos(rlat2) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  
  const distance = EARTH_RADIUS_MILES * c;
  if (isNaN(distance)) {
    console.warn('Invalid distance calculation:', { lat1, lon1, lat2, lon2, a, c });
    return Infinity;
  }
  return Math.round(distance * 10) / 10; // Round to 1 decimal place
}

/**
 * Check if a point is within a given radius of another point
 */
export function isWithinRadius(lat1, lon1, lat2, lon2, radiusMiles) {
  return calculateDistance(lat1, lon1, lat2, lon2) <= radiusMiles;
}

/**
 * Calculate the bounding box for a point and radius
 * Useful for database queries to pre-filter points
 */
export function calculateBoundingBox(lat, lon, radiusMiles) {
  const latRad = lat * Math.PI / 180;
  const lonRad = lon * Math.PI / 180;
  const radius = radiusMiles / EARTH_RADIUS_MILES;
  
  const minLat = Math.asin(Math.sin(latRad) * Math.cos(radius) + 
                Math.cos(latRad) * Math.sin(radius) * -1);
  const maxLat = Math.asin(Math.sin(latRad) * Math.cos(radius) + 
                Math.cos(latRad) * Math.sin(radius));
                
  const minLon = lonRad - Math.asin(Math.sin(radius) / Math.cos(latRad));
  const maxLon = lonRad + Math.asin(Math.sin(radius) / Math.cos(latRad));
  
  return {
    minLat: minLat * 180 / Math.PI,
    maxLat: maxLat * 180 / Math.PI,
    minLon: minLon * 180 / Math.PI,
    maxLon: maxLon * 180 / Math.PI
  };
}
