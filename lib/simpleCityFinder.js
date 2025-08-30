// Simple city finder: Supabase first, HERE.com second, cross-reference both
import { adminSupabase } from '../utils/supabaseClient.js';
import { verifyCityWithHERE } from './hereVerificationService.js';

export async function findCitiesNear(baseCity, baseLat, baseLng, radiusMiles = 150, limit = 10) {
  console.log(`Finding cities near ${baseCity} within ${radiusMiles} miles`);
  
  // Step 1: Get cities from Supabase database
  const { data: supabaseCities, error } = await adminSupabase
    .from('cities')
    .select('*')
    .not('kma_code', 'is', null)  // Only cities with KMA codes
    .limit(limit * 2); // Get extra in case some are invalid
  
  if (error) {
    console.error('Supabase query error:', error);
    return [];
  }
  
  console.log(`Found ${supabaseCities.length} cities in Supabase database`);
  
  // Step 2: Calculate distances and filter
  const validCities = [];
  
  for (const city of supabaseCities) {
    if (!city.latitude || !city.longitude) continue;
    
    // Calculate distance
    const distance = calculateDistance(baseLat, baseLng, city.latitude, city.longitude);
    
    if (distance <= radiusMiles) {
      validCities.push({
        city: city.city,
        state: city.state_or_province,
        zip: city.zip || '',
        kma_code: city.kma_code,
        kma_name: city.kma_name,
        distance_miles: distance,
        source: 'supabase'
      });
    }
  }
  
  console.log(`Found ${validCities.length} cities within ${radiusMiles} miles from Supabase`);
  
  // Step 3: If not enough cities, use HERE.com to find more
  if (validCities.length < limit) {
    const needed = limit - validCities.length;
    console.log(`Need ${needed} more cities, searching with HERE.com`);
    
    try {
      const hereCities = await findCitiesWithHERE(baseCity, radiusMiles, needed);
      
      // Step 4: Cross-reference HERE.com cities with Supabase for KMA codes
      for (const hereCity of hereCities) {
        // Look up KMA code in Supabase
        const { data: kmaMatch } = await adminSupabase
          .from('cities')
          .select('kma_code, kma_name')
          .ilike('city', hereCity.city)
          .ilike('state_or_province', hereCity.state)
          .limit(1);
        
        if (kmaMatch && kmaMatch.length > 0) {
          validCities.push({
            ...hereCity,
            kma_code: kmaMatch[0].kma_code,
            kma_name: kmaMatch[0].kma_name,
            source: 'here_with_supabase_kma'
          });
        } else {
          // Use HERE.com city but assign closest KMA
          const closestSupabaseCity = findClosestCity(hereCity, supabaseCities);
          if (closestSupabaseCity && closestSupabaseCity.kma_code) {
            validCities.push({
              ...hereCity,
              kma_code: closestSupabaseCity.kma_code,
              kma_name: closestSupabaseCity.kma_name,
              source: 'here_with_estimated_kma'
            });
          }
        }
      }
    } catch (error) {
      console.error('HERE.com search error:', error);
    }
  }
  
  // Sort by distance and return top results
  return validCities
    .sort((a, b) => a.distance_miles - b.distance_miles)
    .slice(0, limit);
}

async function findCitiesWithHERE(baseCity, radiusMiles, limit) {
  // Use HERE.com to find nearby cities
  const hereCities = [];
  
  // This is a simplified implementation - you'd expand this based on HERE.com API
  // For now, return empty array as fallback
  console.log(`HERE.com search for cities near ${baseCity} (${radiusMiles} miles, limit ${limit})`);
  
  return hereCities;
}

function findClosestCity(targetCity, cities) {
  if (!targetCity.latitude || !targetCity.longitude || !cities.length) return null;
  
  let closest = null;
  let minDistance = Infinity;
  
  for (const city of cities) {
    if (!city.latitude || !city.longitude) continue;
    
    const distance = calculateDistance(
      targetCity.latitude, targetCity.longitude,
      city.latitude, city.longitude
    );
    
    if (distance < minDistance) {
      minDistance = distance;
      closest = city;
    }
  }
  
  return closest;
}

function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 3959; // Earth's radius in miles
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}
