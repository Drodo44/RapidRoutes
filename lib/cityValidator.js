/**
 * Validates city coordinates and returns true if valid
 */
function validateCityCoordinates(city) {
  if (!city) return false;
  
  const lat = Number(city.latitude);
  const lon = Number(city.longitude);
  
  if (isNaN(lat) || isNaN(lon)) {
    console.warn(`Invalid coordinates for ${city.city}, ${city.state_or_province}:`, { lat, lon });
    return false;
  }
  
  // Basic geographic validation
  if (lat < -90 || lat > 90 || lon < -180 || lon > 180) {
    console.warn(`Out of range coordinates for ${city.city}, ${city.state_or_province}:`, { lat, lon });
    return false;
  }
  
  return true;
}

// Export for use in other modules
export { validateCityCoordinates };
