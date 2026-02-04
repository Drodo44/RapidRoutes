// lib/distance.js

/**
 * Calculate distance between two points in miles using Haversine formula
 * @param {number} lat1 Origin latitude
 * @param {number} lon1 Origin longitude
 * @param {number} lat2 Destination latitude
 * @param {number} lon2 Destination longitude
 * @returns {number} Distance in miles
 */
export function calculateDistance(lat1, lon1, lat2, lon2) {
  // Validate inputs
  [lat1, lon1, lat2, lon2].forEach(coord => {
    if (typeof coord !== 'number' || isNaN(coord)) {
      throw new Error(`Invalid coordinate: ${coord}`);
    }
  });

  const R = 3959; // Earth's radius in miles
  
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
           Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
           Math.sin(dLon/2) * Math.sin(dLon/2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  const distance = R * c;
  
  return Math.round(distance * 10) / 10; // Round to 1 decimal place
}

/**
 * Convert degrees to radians
 * @param {number} degrees Value in degrees
 * @returns {number} Value in radians
 */
function toRad(degrees) {
  return degrees * Math.PI / 180;
}