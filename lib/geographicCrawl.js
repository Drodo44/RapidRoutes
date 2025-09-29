// lib/geographicCrawl.js
import { calculateDistance } from './distance.js';
import { adminSupabase } from '../utils/supabaseAdminClient.js';

// Logging utility 
const debug = (...args) => console.log('[GeoCrawl]', ...args);

// Optional HERE API integration
const HERE_API_KEY = process.env.HERE_API_KEY;
const useHereApi = !!HERE_API_KEY;

// Increased KMA requirements to ensure we meet production standards
const MIN_UNIQUE_KMAS = 6; // Minimum required KMAs
const TARGET_UNIQUE_KMAS = 12; // Target for optimal diversity

async function findNearbyKMAs(lat, lon, radius = 75) {
  debug(`Starting KMA search for coordinates [${lat}, ${lon}] within ${radius} miles`);
  
  // Validate input parameters
  if (typeof lat !== 'number' || isNaN(lat) || typeof lon !== 'number' || isNaN(lon)) {
    console.error(`❌ GEOCRAWL ERROR: Invalid coordinates provided to findNearbyKMAs`, {
      lat, lon, radius,
      timestamp: new Date().toISOString()
    });
    throw new Error(`Invalid coordinates: lat=${lat}, lon=${lon}`);
  }
  
  let currentRadius = radius;
  let maxRadius = 150;  // Increased to ensure KMA diversity requirements
  
  while (currentRadius <= maxRadius) {
    // Calculate bounding box for query efficiency
    const latRange = currentRadius / 69; // miles to degrees
    const lonRange = currentRadius / (69 * Math.cos(lat * Math.PI / 180));
    
    debug(`Searching with radius ${currentRadius} miles (lat±${latRange.toFixed(4)}°, lon±${lonRange.toFixed(4)}°)`);
    
    // First try with strict filters
    let { data: cities, error: dbError } = await adminSupabase
      .from('cities')
      .select('*')
      .not('kma_code', 'is', null)
      .gte('latitude', lat - latRange)
      .lte('latitude', lat + latRange)
      .gte('longitude', lon - lonRange)
      .lte('longitude', lon + lonRange);
    
    if (dbError) {
      debug(`Database error: ${dbError.message}`);
      // Return empty array instead of throwing - allows fallback to wider radius
      cities = [];
    }
    
    // If no results with KMA filter, try without it
    if (!cities || cities.length === 0) {
      debug(`No cities with KMA codes found, retrying without KMA filter...`);
      
      const response = await adminSupabase
        .from('cities')
        .select('*')
        .gte('latitude', lat - latRange)
        .lte('latitude', lat + latRange)
        .gte('longitude', lon - lonRange)
        .lte('longitude', lon + lonRange);
      
      if (response.error) {
        debug(`Database error on retry: ${response.error.message}`);
        throw new Error(`Database error on retry: ${response.error.message}`);
      }
      
      cities = response.data;
      debug(`Found ${cities.length} total cities without KMA filter`);
    }
    
    // Process found cities with valid coordinates and KMA codes
    const withDistance = cities
      .filter(nc => {
        const hasCoords = nc.latitude && nc.longitude;
        const hasKMA = nc.kma_code;
        return hasCoords && hasKMA;
      })
      .map(nc => ({
        ...nc,
        distance: calculateDistance(lat, lon, Number(nc.latitude), Number(nc.longitude))
      }))
      .filter(nc => nc.distance <= currentRadius)
      .sort((a, b) => a.distance - b.distance); // Sort by distance

    // Log results for debugging
    const uniqueKMAs = new Set(withDistance.map(c => c.kma_code));
    console.log(`📍 Found ${withDistance.length} cities (${uniqueKMAs.size} unique KMAs) within ${currentRadius} miles`);
    
    if (uniqueKMAs.size >= MIN_UNIQUE_KMAS) {
      // Take the closest cities that give us enough unique KMAs
      const kmasSeen = new Set();
      const result = withDistance.filter(city => {
        // Skip invalid data
        if (!city.kma_code) {
          debug(`Skipping city without KMA code: ${city.city}, ${city.state}`);
          return false;
        }

        // Once we have enough KMAs, only include very close cities
        if (kmasSeen.size >= TARGET_UNIQUE_KMAS) {
          return city.distance <= radius / 2; // Include very close cities even after target
        }

        // Add new KMAs we haven't seen
        if (!kmasSeen.has(city.kma_code)) {
          debug(`Adding new KMA ${city.kma_code} from ${city.city}, ${city.state} (${city.distance.toFixed(1)} miles)`);
          kmasSeen.add(city.kma_code);
          return true;
        }

        // Include duplicates only if we need more variety
        return kmasSeen.size < TARGET_UNIQUE_KMAS;
      });
      
      console.log(`✅ Selected ${result.length} cities with ${kmasSeen.size} unique KMAs`);
      return result;
    }
    
    currentRadius += 25;
  }
  
  return [];
}

/**
 * Generate geographic crawl pairs from origin and destination cities
 * @param {Object} origin Origin city object
 * @param {Object} dest Destination city object
 * @param {number} radiusMiles Search radius in miles
 * @returns {Array} Array of city pairs
 */
export async function generateGeographicCrawlPairs(origin, dest, radiusMiles = 75) {
  // Validate basic input structure
  if (!origin || !dest) {
    throw new Error('Origin and destination objects are required');
  }
  
  // Validate required fields
  const requiredFields = ['city', 'state', 'latitude', 'longitude'];
  const missingOrigin = requiredFields.filter(field => !origin[field]);
  const missingDest = requiredFields.filter(field => !dest[field]);

  if (missingOrigin.length > 0 || missingDest.length > 0) {
    throw new Error(`Missing required fields: ${[...missingOrigin, ...missingDest].join(', ')}`);
  }

  // Validate coordinates
  const coordinates = [
    { name: 'origin', lat: origin.latitude, lon: origin.longitude },
    { name: 'destination', lat: dest.latitude, lon: dest.longitude }
  ];

  for (const coord of coordinates) {
    if (typeof coord.lat !== 'number' || typeof coord.lon !== 'number' ||
        isNaN(coord.lat) || isNaN(coord.lon)) {
      throw new Error(`Invalid coordinates for ${coord.name}`);
    }
  }

  // Find nearby KMAs for origin and destination
  debug(`Finding KMAs near origin: ${origin.city}, ${origin.state}`);
  const originCities = await findNearbyKMAs(
    Number(origin.latitude),
    Number(origin.longitude),
    radiusMiles
  );

  if (!originCities?.length) {
    const errorMsg = `No KMAs found within ${radiusMiles} miles of origin ${origin.city}, ${origin.state}`;
    console.error(`❌ GEOCRAWL ERROR: ${errorMsg}`, {
      origin,
      radiusMiles,
      timestamp: new Date().toISOString()
    });
    throw new Error(errorMsg);
  }

  debug(`Finding KMAs near destination: ${dest.city}, ${dest.state}`);
  const destCities = await findNearbyKMAs(
    Number(dest.latitude),
    Number(dest.longitude),
    radiusMiles
  );

  if (!destCities?.length) {
    const errorMsg = `No KMAs found within ${radiusMiles} miles of destination ${dest.city}, ${dest.state}`;
    console.error(`❌ GEOCRAWL ERROR: ${errorMsg}`, {
      destination: dest,
      radiusMiles,
      timestamp: new Date().toISOString()
    });
    throw new Error(errorMsg);
  }

  // Generate unique pairs
  const pairs = [];
  const seenPairs = new Set();

  // Sort by distance to prefer closer cities
  originCities.sort((a, b) => a.distance - b.distance);
  destCities.sort((a, b) => a.distance - b.distance);

  for (const orig of originCities) {
    for (const dest of destCities) {
      if (!orig.kma_code || !dest.kma_code) continue;

      const pairKey = `${orig.kma_code}-${dest.kma_code}`;
      if (seenPairs.has(pairKey)) continue;

      pairs.push({
        origin: {
          ...orig,
          state: orig.state || orig.state_or_province
        },
        destination: {
          ...dest,
          state: dest.state || dest.state_or_province
        },
        total_distance: calculateDistance(
          orig.latitude,
          orig.longitude,
          dest.latitude,
          dest.longitude
        )
      });
      
      seenPairs.add(pairKey);
    }
  }

  if (pairs.length === 0) {
    const errorMsg = 'No valid pairs could be generated - check KMA assignments';
    console.error(`❌ GEOCRAWL ERROR: ${errorMsg}`, {
      origin,
      destination: dest,
      originCitiesCount: originCities?.length || 0,
      destCitiesCount: destCities?.length || 0,
      timestamp: new Date().toISOString()
    });
    throw new Error(errorMsg);
  }

  debug(`Generated ${pairs.length} pairs with ${seenPairs.size} unique KMA combinations`);
  
  // Validate minimum KMA requirements - MUST have at least 6 unique KMAs
  if (seenPairs.size < MIN_UNIQUE_KMAS) {
    const errorMsg = `Insufficient unique KMAs: ${seenPairs.size} (minimum required: ${MIN_UNIQUE_KMAS})`;
    console.error(`❌ GEOCRAWL ERROR: ${errorMsg}`, {
      uniqueKmas: seenPairs.size,
      totalPairs: pairs.length,
      origin: `${origin.city}, ${origin.state}`,
      destination: `${dest.city}, ${dest.state}`,
      timestamp: new Date().toISOString(),
      minRequired: MIN_UNIQUE_KMAS
    });
    
    // Create a custom error object with additional details for better handling
    const kmaError = new Error(errorMsg);
    kmaError.code = 'INSUFFICIENT_KMA_DIVERSITY';
    kmaError.status = 422; // Unprocessable Content
    kmaError.details = {
      uniqueKmas: seenPairs.size,
      requiredKmas: MIN_UNIQUE_KMAS,
      pairsGenerated: pairs.length,
      origin: `${origin.city}, ${origin.state}`,
      destination: `${dest.city}, ${dest.state}`
    };
    
    // Strict enforcement - always require minimum KMA diversity
    // This ensures we meet business requirements for KMA diversity
    throw kmaError;
  } else {
    console.log(`✅ GEOCRAWL SUCCESS: Generated ${pairs.length} pairs with ${seenPairs.size} unique KMAs`);
  }
  
  return { pairs, uniqueKmas: seenPairs.size };
}

// No need for additional export statement as the function is already exported inline
