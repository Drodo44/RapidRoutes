// lib/geographicCrawl.js
// Smart radius crawl with HERE fallback
// Reference backup created: September 19, 2025

import { findDiverseCities } from '../improvedCitySearch.js';
import { calculateDistance } from '../distanceCalculator.js';
import { enrichCityData, discoverNearbyCities } from "../cityEnrichment.js";
import { advancedCityDiscovery } from "../hereAdvancedServices.js";
import { findBestKMA } from "../kmaAssignment.js";

const HERE_API_KEY = process.env.HERE_API_KEY;
const MIN_UNIQUE_KMAS = 5;
const TARGET_UNIQUE_KMAS = 10;

/**
 * Find cities with different KMAs within specified radius
 */
async function findNearbyKMAs(city, radius = 75) {
  // First try Supabase with increasing radius until we get enough KMA diversity
  let currentRadius = radius;
  let maxRadius = 150; // Maximum radius to try
  let nearbyCities = [];
  
  while (currentRadius <= maxRadius) {
    console.log(`Searching for cities within ${currentRadius} miles...`);
    
    const { data: cities } = await adminSupabase
      .from('cities')
      .select('*')
      .not('kma_code', 'is', null)
      .eq('here_verified', true);
      
    if (!cities) continue;
      
    nearbyCities = cities;

  const withDistance = nearbyCities
    .filter(nc => {
      const distance = calculateDistance(
        city.latitude,
        city.longitude,
        nc.latitude,
        nc.longitude
      );
      return distance <= radius;
    })
    .map(nc => ({ ...nc, distance: calculateDistance(
      city.latitude,
      city.longitude,
      nc.latitude,
      nc.longitude
    )}));

  // Check KMA diversity
  const uniqueKMAs = new Set(withDistance.map(c => c.kma_code));
  
  // If we don't have enough unique KMAs, try HERE.com
  if (uniqueKMAs.size < MIN_UNIQUE_KMAS) {
    console.log(`Found only ${uniqueKMAs.size} KMAs in Supabase, trying HERE.com...`);
    
    const hereCities = await advancedCityDiscovery(
      city.latitude,
      city.longitude,
      radius
    );

    // Cross-reference and store new cities
    for (const hereCity of hereCities.cities) {
      const kma = await findBestKMA(hereCity.latitude, hereCity.longitude);
      if (kma) {
        hereCity.kma_code = kma.code;
        hereCity.kma_name = kma.name;
        hereCity.here_verified = true;
        
        // Store in Supabase
        await adminSupabase
          .from('cities')
          .upsert([hereCity], { onConflict: 'city,state_or_province' });
          
        // Add to results if within radius
        const distance = calculateDistance(
          city.latitude,
          city.longitude,
          hereCity.latitude,
          hereCity.longitude
        );
        
        if (distance <= radius) {
          withDistance.push({ ...hereCity, distance });
        }
      }
    }
  }

  // Sort by distance and KMA diversity
  return withDistance
    .sort((a, b) => a.distance - b.distance)
    .reduce((acc, city) => {
      if (!acc.kmas.has(city.kma_code)) {
        acc.kmas.add(city.kma_code);
        acc.cities.push(city);
      }
      return acc;
    }, { cities: [], kmas: new Set() })
    .cities;
}

/**
 * Generate city pairs based on geographic crawl with KMA diversity
 */
async function generateGeographicCrawlPairs(origin, destination) {
  try {
    console.log('🌎 Generating geographic crawl pairs...');
    
    // Get nearby cities for both origin and destination
    const [originCities, destCities] = await Promise.all([
      findNearbyKMAs(origin),
      findNearbyKMAs(destination)
    ]);

    console.log(`Found ${originCities.length} origin cities with unique KMAs`);
    console.log(`Found ${destCities.length} destination cities with unique KMAs`);

    // Generate all valid pairs
    const pairs = [];
    const seenPairs = new Set();

    for (const orig of originCities) {
      for (const dest of destCities) {
        const pairKey = `${orig.kma_code}-${dest.kma_code}`;
        if (!seenPairs.has(pairKey)) {
          pairs.push({
            origin: orig,
            destination: dest,
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
    }

    // Sort by optimal freight characteristics
    const rankedPairs = pairs.sort((a, b) => {
      // Prefer medium distances (300-800 miles)
      const aScore = a.total_distance > 300 && a.total_distance < 800 ? 2 : 1;
      const bScore = b.total_distance > 300 && b.total_distance < 800 ? 2 : 1;
      return bScore - aScore;
    });

    console.log(`Generated ${rankedPairs.length} unique pairs`);
    return {
      pairs: rankedPairs,
      debug: {
        origin_kmas: originCities.map(c => c.kma_code),
        dest_kmas: destCities.map(c => c.kma_code),
        total_pairs: rankedPairs.length
      }
    };

  } catch (error) {
    console.error('Failed to generate pairs:', error);
    return {
      pairs: [],
      debug: {
        error: error.message,
        stack: error.stack
      }
    };
  }
}

export { generateGeographicCrawlPairs };
