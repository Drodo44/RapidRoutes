/**
 * HERE.com Geocoding Service for DAT City Verification
 * 
 * This service handles:
 * - City verification using HERE.com Geocoding API
 * - Rate limiting to stay within API quotas
 * - Caching of verification results
 * - Generation of alternative cities within specified radius
 */

import { adminSupabase as supabase } from '../utils/supabaseClient.js';

// HERE.com API configuration
const HERE_API_KEY = process.env.HERE_API_KEY;
const HERE_GEOCODING_URL = 'https://geocode.search.hereapi.com/v1/geocode';
const HERE_BROWSE_URL = 'https://browse.search.hereapi.com/v1/browse';

// Rate limiting configuration
const RATE_LIMIT = {
  requests: 100, // requests per window
  windowMs: 60 * 1000, // 1 minute window
  queue: []
};

let requestCount = 0;
let windowStart = Date.now();

/**
 * Rate-limited fetch function for HERE.com API
 */
async function rateLimitedFetch(url) {
  const now = Date.now();
  
  // Reset window if expired
  if (now - windowStart > RATE_LIMIT.windowMs) {
    requestCount = 0;
    windowStart = now;
  }
  
  // Wait if rate limit exceeded
  if (requestCount >= RATE_LIMIT.requests) {
    const waitTime = RATE_LIMIT.windowMs - (now - windowStart);
    console.log(`⏳ Rate limit reached, waiting ${waitTime}ms`);
    await new Promise(resolve => setTimeout(resolve, waitTime));
    return rateLimitedFetch(url); // Retry after wait
  }
  
  requestCount++;
  const startTime = Date.now();
  
  try {
    const response = await fetch(url);
    const responseTime = Date.now() - startTime;
    return { response, responseTime };
  } catch (error) {
    const responseTime = Date.now() - startTime;
    return { error, responseTime };
  }
}

/**
 * Verify a city using HERE.com Geocoding API
 */
export async function verifyCityWithHERE(city, state, zip = null, verificationType = 'automatic', verifiedBy = null) {
  if (!HERE_API_KEY) {
    console.error('❌ HERE_API_KEY not configured');
    throw new Error('HERE API key not configured');
  }

  const startTime = Date.now();
  console.log(`🔍 Verifying city: ${city}, ${state}${zip ? ` ${zip}` : ''} via HERE.com`);

  try {
    // Build query string for HERE.com
    const query = zip ? `${city}, ${state} ${zip}` : `${city}, ${state}`;
    const url = `${HERE_GEOCODING_URL}?q=${encodeURIComponent(query)}&countryCode=USA&apiKey=${HERE_API_KEY}&limit=5`;

    const { response, error, responseTime } = await rateLimitedFetch(url);
    
    if (error) {
      console.error(`❌ HERE.com API error for ${city}, ${state}:`, error);
      
      // Log failed verification
      await logVerification(city, state, zip, verificationType, false, null, responseTime, error.message, verifiedBy);
      
      return {
        verified: false,
        error: error.message,
        responseTime
      };
    }

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ HERE.com API HTTP error ${response.status}:`, errorText);
      
      await logVerification(city, state, zip, verificationType, false, errorText, responseTime, `HTTP ${response.status}`, verifiedBy);
      
      return {
        verified: false,
        error: `HTTP ${response.status}: ${errorText}`,
        responseTime
      };
    }

    const data = await response.json();
    const found = data.items && data.items.length > 0;
    
    let bestMatch = null;
    if (found) {
      // Find best match based on city name similarity
      bestMatch = data.items.find(item => {
        const itemCity = item.address?.city?.toLowerCase();
        const itemState = item.address?.state?.toLowerCase();
        return itemCity === city.toLowerCase() && 
               (itemState === state.toLowerCase() || itemState === getStateAbbreviation(state));
      });
      
      // If no exact match, take the first result
      if (!bestMatch) {
        bestMatch = data.items[0];
      }
    }

    console.log(`${found ? '✅' : '❌'} HERE.com verification: ${city}, ${state} - ${found ? 'FOUND' : 'NOT FOUND'}`);
    
    // Log verification attempt
    await logVerification(city, state, zip, verificationType, found, JSON.stringify(data), responseTime, null, verifiedBy);
    
    return {
      verified: found,
      data: bestMatch,
      responseTime,
      allResults: data.items || []
    };

  } catch (error) {
    const responseTime = Date.now() - startTime;
    console.error(`❌ HERE.com verification error for ${city}, ${state}:`, error);
    
    await logVerification(city, state, zip, verificationType, false, null, responseTime, error.message, verifiedBy);
    
    return {
      verified: false,
      error: error.message,
      responseTime
    };
  }
}

/**
 * Generate alternative cities within specified radius using HERE.com
 */
export async function generateAlternativeCitiesWithHERE(centerLat, centerLng, radiusMiles = 100, limit = 20) {
  if (!HERE_API_KEY) {
    console.error('❌ HERE_API_KEY not configured');
    throw new Error('HERE API key not configured');
  }

  console.log(`🌎 Generating alternatives within ${radiusMiles} miles of ${centerLat}, ${centerLng}`);

  try {
    // Convert miles to meters for HERE.com API
    const radiusMeters = radiusMiles * 1609.34;
    
    const url = `${HERE_BROWSE_URL}?at=${centerLat},${centerLng}&categories=city&in=circle:${centerLat},${centerLng};r=${radiusMeters}&limit=${limit}&apiKey=${HERE_API_KEY}`;

    const { response, error, responseTime } = await rateLimitedFetch(url);
    
    if (error) {
      console.error('❌ HERE.com browse API error:', error);
      throw error;
    }

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    const cities = data.items || [];
    
    console.log(`🌎 HERE.com found ${cities.length} alternative cities`);
    
    // Format cities for use in our system
    const formattedCities = cities.map(item => ({
      city: item.address?.city || item.title,
      state: item.address?.state || item.address?.stateCode,
      latitude: item.position?.lat,
      longitude: item.position?.lng,
      distance: calculateDistance(centerLat, centerLng, item.position?.lat, item.position?.lng),
      source: 'here_api'
    })).filter(city => city.city && city.state && city.latitude && city.longitude);

    return formattedCities;

  } catch (error) {
    console.error('❌ Generate alternatives error:', error);
    throw error;
  }
}

/**
 * Log verification attempt to database
 */
async function logVerification(city, state, zip, verificationType, success, apiResponse, responseTime, errorMessage, verifiedBy) {
  try {
    const { error } = await supabase
      .from('verification_logs')
      .insert({
        city,
        state_or_province: state,
        zip,
        verification_type: verificationType,
        here_api_success: success,
        here_api_response: apiResponse,
        response_time_ms: Math.round(responseTime),
        error_message: errorMessage,
        verified_by: verifiedBy
      });

    if (error) {
      console.error('❌ Failed to log verification:', error);
    }
  } catch (error) {
    console.error('❌ Verification logging error:', error);
  }
}

/**
 * Move a city to the purged_cities table
 */
export async function purgeCityToDatabase(cityData, reason, hereApiResponse = null) {
  try {
    console.log(`🗑️ Purging city: ${cityData.city}, ${cityData.state_or_province} - Reason: ${reason}`);

    // First, insert into purged_cities table
    const { error: insertError } = await supabase
      .from('purged_cities')
      .insert({
        city: cityData.city,
        state_or_province: cityData.state_or_province,
        zip: cityData.zip,
        original_kma_code: cityData.kma_code,
        original_kma_name: cityData.kma_name,
        latitude: cityData.latitude,
        longitude: cityData.longitude,
        purge_reason: reason,
        here_api_response: hereApiResponse ? JSON.stringify(hereApiResponse) : null,
        dat_submission_status: 'pending'
      });

    if (insertError) {
      console.error('❌ Failed to insert into purged_cities:', insertError);
      throw insertError;
    }

    // Then, remove from cities table
    const { error: deleteError } = await supabase
      .from('cities')
      .delete()
      .eq('city', cityData.city)
      .eq('state_or_province', cityData.state_or_province)
      .eq('zip', cityData.zip || '');

    if (deleteError) {
      console.error('❌ Failed to delete from cities table:', deleteError);
      throw deleteError;
    }

    console.log(`✅ Successfully purged city: ${cityData.city}, ${cityData.state_or_province}`);
    return true;

  } catch (error) {
    console.error('❌ Purge city error:', error);
    throw error;
  }
}

/**
 * Restore a city from purged_cities back to cities table
 */
export async function restoreCityFromPurged(purgedCityId) {
  try {
    // Get the purged city data
    const { data: purgedCity, error: fetchError } = await supabase
      .from('purged_cities')
      .select('*')
      .eq('id', purgedCityId)
      .single();

    if (fetchError || !purgedCity) {
      throw new Error('Purged city not found');
    }

    console.log(`🔄 Restoring city: ${purgedCity.city}, ${purgedCity.state_or_province}`);

    // Insert back into cities table
    const { error: insertError } = await supabase
      .from('cities')
      .insert({
        city: purgedCity.city,
        state_or_province: purgedCity.state_or_province,
        zip: purgedCity.zip,
        latitude: purgedCity.latitude,
        longitude: purgedCity.longitude,
        kma_code: purgedCity.original_kma_code,
        kma_name: purgedCity.original_kma_name,
        here_verified: true // Mark as verified since we're manually restoring
      });

    if (insertError) {
      console.error('❌ Failed to restore to cities table:', insertError);
      throw insertError;
    }

    // Remove from purged_cities table
    const { error: deleteError } = await supabase
      .from('purged_cities')
      .delete()
      .eq('id', purgedCityId);

    if (deleteError) {
      console.error('❌ Failed to delete from purged_cities:', deleteError);
      throw deleteError;
    }

    console.log(`✅ Successfully restored city: ${purgedCity.city}, ${purgedCity.state_or_province}`);
    return true;

  } catch (error) {
    console.error('❌ Restore city error:', error);
    throw error;
  }
}

/**
 * Helper function to calculate distance between two points
 */
function calculateDistance(lat1, lng1, lat2, lng2) {
  const R = 3959; // Earth's radius in miles
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLng/2) * Math.sin(dLng/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

/**
 * Helper function to get state abbreviation
 */
function getStateAbbreviation(stateName) {
  const states = {
    'alabama': 'AL', 'alaska': 'AK', 'arizona': 'AZ', 'arkansas': 'AR', 'california': 'CA',
    'colorado': 'CO', 'connecticut': 'CT', 'delaware': 'DE', 'florida': 'FL', 'georgia': 'GA',
    'hawaii': 'HI', 'idaho': 'ID', 'illinois': 'IL', 'indiana': 'IN', 'iowa': 'IA',
    'kansas': 'KS', 'kentucky': 'KY', 'louisiana': 'LA', 'maine': 'ME', 'maryland': 'MD',
    'massachusetts': 'MA', 'michigan': 'MI', 'minnesota': 'MN', 'mississippi': 'MS',
    'missouri': 'MO', 'montana': 'MT', 'nebraska': 'NE', 'nevada': 'NV', 'new hampshire': 'NH',
    'new jersey': 'NJ', 'new mexico': 'NM', 'new york': 'NY', 'north carolina': 'NC',
    'north dakota': 'ND', 'ohio': 'OH', 'oklahoma': 'OK', 'oregon': 'OR', 'pennsylvania': 'PA',
    'rhode island': 'RI', 'south carolina': 'SC', 'south dakota': 'SD', 'tennessee': 'TN',
    'texas': 'TX', 'utah': 'UT', 'vermont': 'VT', 'virginia': 'VA', 'washington': 'WA',
    'west virginia': 'WV', 'wisconsin': 'WI', 'wyoming': 'WY'
  };
  return states[stateName.toLowerCase()] || stateName;
}

/**
 * Batch verify multiple cities
 */
export async function batchVerifyCities(cities, verificationType = 'batch', verifiedBy = null) {
  console.log(`🔍 Batch verifying ${cities.length} cities`);
  
  const results = [];
  const batchSize = 10; // Process in small batches to avoid overwhelming the API
  
  for (let i = 0; i < cities.length; i += batchSize) {
    const batch = cities.slice(i, i + batchSize);
    
    console.log(`📦 Processing batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(cities.length/batchSize)}`);
    
    const batchPromises = batch.map(city => 
      verifyCityWithHERE(city.city, city.state_or_province, city.zip, verificationType, verifiedBy)
    );
    
    const batchResults = await Promise.all(batchPromises);
    results.push(...batchResults.map((result, index) => ({
      city: batch[index],
      verification: result
    })));
    
    // Small delay between batches
    if (i + batchSize < cities.length) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  
  console.log(`✅ Batch verification complete: ${results.length} cities processed`);
  return results;
}
