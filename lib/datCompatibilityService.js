/**
 * DAT-Compatible City Validation System
 * 
 * This system validates cities against known DAT patterns without requiring HERE.com API
 * Uses intelligent filtering based on city characteristics and known DAT preferences
 */

import { adminSupabase as supabase } from '../utils/supabaseAdminClient.js';

/**
 * Validate if a city is likely to be DAT-compatible based on characteristics
 */
function isDatCompatibleCity(city, state, zip) {
  const cityName = city.toLowerCase().trim();
  
  // Skip cities with problematic characteristics that DAT often rejects
  const problematicPatterns = [
    /^airport/,           // Airport-related cities often rejected
    /^air base/,          // Military base cities
    /^fort \w+/,          // Military forts (some work, some don't)
    /^camp \w+/,          // Military camps
    /\d+th street/i,      // Street addresses as city names
    /^interstate/,        // Highway-related names
    /^exit \d+/,          // Highway exits
    /^mile marker/,       // Highway markers
    /^rest area/,         // Highway rest areas
    /unnamed/,            // Unnamed locations
    /unincorporated/,     // Unincorporated areas
    /census designated/,  // Census designated places
  ];
  
  // Check if city matches any problematic patterns
  for (const pattern of problematicPatterns) {
    if (pattern.test(cityName)) {
      return false;
    }
  }
  
  // Prefer cities with ZIP codes (more likely to be real postal locations)
  if (!zip || zip.length < 5) {
    return false;
  }
  
  // Prefer cities with normal naming patterns
  if (cityName.length < 2 || cityName.length > 50) {
    return false;
  }
  
  // Skip cities that are just abbreviations or codes
  if (/^[A-Z]{2,4}$/.test(cityName)) {
    return false;
  }
  
  return true;
}

/**
 * Get DAT-compatible cities within radius, pre-filtered for validation
 */
export async function getDatCompatibleCitiesWithinRadius(baseCity, radiusMiles = 75, limit = 50) {
  try {
    // Handle both state and state_or_province field names
    const stateName = baseCity.state || baseCity.state_or_province;
    console.log(`🔍 Finding DAT-compatible cities within ${radiusMiles} miles of ${baseCity.city}, ${stateName}`);
    
    // Query cities within radius with proper data
    const { data: cities, error } = await supabase
      .from('cities')
      .select('*')
      .not('latitude', 'is', null)
      .not('longitude', 'is', null)
      .not('kma_code', 'is', null)
      .not('zip', 'is', null)
      .neq('city', baseCity.city)
      .order('city, state_or_province')
      .limit(limit * 3); // Get extra to account for filtering
    
    if (error) {
      console.error('Database query error:', error);
      return [];
    }
    
    // Calculate distances and filter for DAT compatibility
    const compatibleCities = cities
      .map(city => {
        // Calculate distance
        const distance = calculateDistance(
          baseCity.latitude, 
          baseCity.longitude,
          city.latitude,
          city.longitude
        );
        
        return { ...city, distance_miles: distance };
      })
      .filter(city => {
        // Within radius
        if (city.distance_miles > radiusMiles) return false;
        
        // DAT compatibility check
        if (!isDatCompatibleCity(city.city, city.state_or_province, city.zip)) {
          console.log(`⚠️ Filtered out: ${city.city}, ${city.state_or_province} (DAT compatibility)`);
          return false;
        }
        
        return true;
      })
      .sort((a, b) => a.distance_miles - b.distance_miles)
      .slice(0, limit);
    
    console.log(`✅ Found ${compatibleCities.length} DAT-compatible cities within ${radiusMiles} miles`);
    return compatibleCities;
    
  } catch (error) {
    console.error('Error finding DAT-compatible cities:', error);
    return [];
  }
}

/**
 * Calculate distance between two coordinates using Haversine formula
 */
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 3959; // Earth's radius in miles
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

/**
 * Enhanced city scoring that prioritizes DAT compatibility
 */
export function calculateDatCompatibilityScore(city, baseCity) {
  let score = 1.0;
  
  // Bonus for having ZIP code (postal locations are more reliable)
  if (city.zip && city.zip.length >= 5) {
    score += 0.3;
  }
  
  // Bonus for KMA diversity (different freight markets)
  if (city.kma_code && city.kma_code !== baseCity.kma_code) {
    score += 0.4;
  }
  
  // Bonus for established cities (county seats, known places)
  const cityName = city.city.toLowerCase();
  const knownGoodPatterns = [
    /ville$/,     // Many established cities end in -ville
    /town$/,      // Town names are usually good
    /burg$/,      // -burg cities are typically established
    /ford$/,      // -ford cities are usually real
    /port$/,      // Ports are established freight locations
    /^saint/,     // Saint cities are typically established
    /^mount/,     // Mount cities are typically real
  ];
  
  for (const pattern of knownGoodPatterns) {
    if (pattern.test(cityName)) {
      score += 0.2;
      break;
    }
  }
  
  // Distance penalty (prefer closer cities for freight efficiency)
  const distancePenalty = Math.min(city.distance_miles / 100, 0.5);
  score -= distancePenalty;
  
  return Math.max(score, 0.1); // Minimum score of 0.1
}
