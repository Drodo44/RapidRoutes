/**
 * Advanced HERE.com Services for RapidRoutes
 * Extends basic verification with advanced features
 */

import { adminSupabase } from '../utils/supabaseClient.js';
import { calculateDistance } from './distanceCalculator.js';

const HERE_API_KEY = process.env.HERE_API_KEY;
const HERE_BROWSE_URL = 'https://browse.search.hereapi.com/v1/browse';
const HERE_DISCOVER_URL = 'https://discover.search.hereapi.com/v1/discover';
const HERE_GEOCODE_URL = 'https://geocode.search.hereapi.com/v1/geocode';

/**
 * Advanced city discovery using multiple HERE.com endpoints
 */
export async function advancedCityDiscovery(lat, lon, radius) {
  const results = {
    cities: [],
    metadata: {
      browse: { status: 'pending', count: 0 },
      discover: { status: 'pending', count: 0 },
      geocode: { status: 'pending', count: 0 }
    }
  };

  try {
    // 1. Browse endpoint - finds administrative areas
    const browseUrl = `${HERE_BROWSE_URL}?at=${lat},${lon}&limit=100&categories=administrative-region&apikey=${HERE_API_KEY}`;
    const browseRes = await fetch(browseUrl);
    const browseData = await browseRes.json();
    
    results.metadata.browse.status = 'completed';
    results.metadata.browse.count = browseData.items?.length || 0;

    // 2. Discover endpoint - finds populated places
    const discoverUrl = `${HERE_DISCOVER_URL}?at=${lat},${lon}&q=city&limit=100&apikey=${HERE_API_KEY}`;
    const discoverRes = await fetch(discoverUrl);
    const discoverData = await discoverRes.json();
    
    results.metadata.discover.status = 'completed';
    results.metadata.discover.count = discoverData.items?.length || 0;

    // Combine and deduplicate results
    const cityMap = new Map();

    const processCities = (items, source) => {
      for (const item of (items || [])) {
        if (!item.address?.city || !item.address?.state) continue;
        
        const key = `${item.address.city.toLowerCase()}_${item.address.state.toLowerCase()}`;
        if (!cityMap.has(key)) {
          cityMap.set(key, {
            city: item.address.city,
            state: item.address.state,
            zip: item.address.postalCode,
            latitude: item.position?.lat,
            longitude: item.position?.lng,
            sources: new Set([source]),
            distance: calculateDistance(lat, lon, item.position?.lat, item.position?.lng),
            confidence: 0
          });
        } else {
          // Multiple sources increase confidence
          cityMap.get(key).sources.add(source);
        }
      }
    };

    processCities(browseData.items, 'browse');
    processCities(discoverData.items, 'discover');

    // Calculate confidence scores
    for (const city of cityMap.values()) {
      // Base confidence on number of confirming sources
      city.confidence = city.sources.size / 2; // 2 possible sources
      
      // Distance penalty
      if (city.distance > radius) {
        city.confidence *= (1 - ((city.distance - radius) / radius));
      }

      // Verify high-confidence cities
      if (city.confidence > 0.5) {
        const verifyUrl = `${HERE_GEOCODE_URL}?q=${encodeURIComponent(city.city + ', ' + city.state)}&apikey=${HERE_API_KEY}`;
        const verifyRes = await fetch(verifyUrl);
        const verifyData = await verifyRes.json();
        
        if (verifyData.items?.[0]) {
          city.sources.add('geocode');
          city.confidence = 1; // Fully verified
        }
      }
    }

    // Sort by confidence and convert to array
    results.cities = Array.from(cityMap.values())
      .filter(city => city.confidence > 0.3) // Only include reasonably confident results
      .sort((a, b) => b.confidence - a.confidence);

    return results;

  } catch (error) {
    console.error('Advanced city discovery error:', error);
    throw error;
  }
}

/**
 * Verify city relationships using HERE.com
 */
export async function verifyCityRelationships(city1, state1, city2, state2) {
  try {
    // Get routes between cities
    const routingUrl = `https://router.hereapi.com/v8/routes?transportMode=truck&origin=${city1},${state1}&destination=${city2},${state2}&return=summary&apikey=${HERE_API_KEY}`;
    const routeRes = await fetch(routingUrl);
    const routeData = await routeRes.json();

    return {
      verified: true,
      routeExists: routeData.routes?.length > 0,
      distance: routeData.routes?.[0]?.sections?.[0]?.summary?.length / 1000, // km to miles
      duration: routeData.routes?.[0]?.sections?.[0]?.summary?.duration
    };
  } catch (error) {
    console.error('City relationship verification error:', error);
    return { verified: false, error: error.message };
  }
}

/**
 * Get detailed city metadata from HERE.com
 */
export async function getCityMetadata(city, state) {
  try {
    // Lookup detailed place data
    const lookupUrl = `${HERE_GEOCODE_URL}?q=${encodeURIComponent(city + ', ' + state)}&apikey=${HERE_API_KEY}`;
    const res = await fetch(lookupUrl);
    const data = await res.json();

    if (!data.items?.[0]) {
      throw new Error('City not found');
    }

    const result = data.items[0];
    return {
      verified: true,
      metadata: {
        name: result.address.city,
        state: result.address.state,
        county: result.address.county,
        postalCode: result.address.postalCode,
        position: result.position,
        type: result.resultType,
        confidence: result.scoring?.queryScore,
        timezone: result.timeZone,
        bounds: result.mapView
      }
    };
  } catch (error) {
    console.error('City metadata error:', error);
    return { verified: false, error: error.message };
  }
}

/**
 * Update our database with HERE.com metadata
 */
export async function enrichCityMetadata(city, state) {
  try {
    const metadata = await getCityMetadata(city, state);
    if (!metadata.verified) {
      throw new Error(`Failed to get metadata: ${metadata.error}`);
    }

    const { error } = await adminSupabase
      .from('cities')
      .update({
        here_metadata: metadata.metadata,
        here_verified: true,
        last_verification: new Date().toISOString()
      })
      .match({ city, state_or_province: state });

    if (error) throw error;
    return { success: true, metadata: metadata.metadata };

  } catch (error) {
    console.error('Metadata enrichment error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Batch process cities for metadata enrichment
 */
export async function batchEnrichMetadata(cities, options = {}) {
  const {
    batchSize = 5,
    delayMs = 1000,
    retries = 3
  } = options;

  const results = {
    total: cities.length,
    successful: 0,
    failed: 0,
    errors: []
  };

  for (let i = 0; i < cities.length; i += batchSize) {
    const batch = cities.slice(i, i + batchSize);
    console.log(`Processing batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(cities.length/batchSize)}`);

    const batchPromises = batch.map(async city => {
      for (let attempt = 1; attempt <= retries; attempt++) {
        try {
          const result = await enrichCityMetadata(city.city, city.state_or_province);
          if (result.success) {
            results.successful++;
            return result;
          }
          throw new Error(result.error);
        } catch (error) {
          if (attempt === retries) {
            results.failed++;
            results.errors.push({
              city: city.city,
              state: city.state_or_province,
              error: error.message
            });
          } else {
            await new Promise(resolve => setTimeout(resolve, delayMs));
          }
        }
      }
    });

    await Promise.all(batchPromises);
    if (i + batchSize < cities.length) {
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }

  return results;
}
