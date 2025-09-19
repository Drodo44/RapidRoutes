// lib/geographicCrawl.js
import { findDiverseCities } from './improvedCitySearch.js';
import { calculateDistance } from './distanceCalculator.js';
import { enrichCityData, discoverNearbyCities } from "./cityEnrichment.js";
import { advancedCityDiscovery } from "./hereAdvancedServices.js";
import { findBestKMA } from "./kmaAssignment.js";
import { adminSupabase } from '../utils/supabaseClient.js';

const HERE_API_KEY = process.env.HERE_API_KEY;
const MIN_UNIQUE_KMAS = 5;
const TARGET_UNIQUE_KMAS = 10;

async function findNearbyKMAs(city, radius = 75) {
  let currentRadius = radius;
  let maxRadius = 150;
  let nearbyCities = [];
  
  while (currentRadius <= maxRadius) {
    const { data: cities } = await adminSupabase
      .from('cities')
      .select('*')
      .not('kma_code', 'is', null)
      .eq('here_verified', true);
    
    if (!cities) {
      currentRadius += 25;
      continue;
    }
    
    const withDistance = cities
      .filter(nc => calculateDistance(city.latitude, city.longitude, nc.latitude, nc.longitude) <= currentRadius)
      .map(nc => ({ ...nc, distance: calculateDistance(city.latitude, city.longitude, nc.latitude, nc.longitude) }));
    
    if (new Set(withDistance.map(c => c.kma_code)).size >= MIN_UNIQUE_KMAS) {
      return withDistance;
    }
    
    currentRadius += 25;
  }
  
  return [];
}

async function generateGeographicCrawlPairs({ 
  origin, 
  destination, 
  preferFillTo10 = false
}) {
  try {
    if (!origin?.city || !origin?.state || !destination?.city || !destination?.state) {
      throw new Error('Missing required fields in origin/destination');
    }

    console.log('🌎 Generating geographic crawl pairs...');
    
    // First verify cities exist and get their coordinates
    const [originCity, destCity] = await Promise.all([
      enrichCityData(origin.city, origin.state),
      enrichCityData(destination.city, destination.state)
    ]);

    if (!originCity || !destCity) {
      throw new Error('Could not find coordinates for one or more cities');
    }

    const [originCities, destCities] = await Promise.all([
      findNearbyKMAs(originCity),
      findNearbyKMAs(destCity)
    ]);
    
    const pairs = [];
    const seenPairs = new Set();
    
    for (const orig of originCities) {
      for (const dest of destCities) {
        const pairKey = `${orig.kma_code}-${dest.kma_code}`;
        if (!seenPairs.has(pairKey)) {
          pairs.push({
            origin: orig,
            destination: dest,
            total_distance: calculateDistance(orig.latitude, orig.longitude, dest.latitude, dest.longitude)
          });
          seenPairs.add(pairKey);
        }
      }
    }
    
    return {
      pairs: pairs.sort((a, b) => {
        const aScore = a.total_distance > 300 && a.total_distance < 800 ? 2 : 1;
        const bScore = b.total_distance > 300 && b.total_distance < 800 ? 2 : 1;
        return bScore - aScore;
      }),
      debug: { origin_kmas: originCities.map(c => c.kma_code), dest_kmas: destCities.map(c => c.kma_code) }
    };
  } catch (error) {
    console.error('Failed to generate pairs:', error);
    return { pairs: [], debug: { error: error.message } };
  }
}

export { generateGeographicCrawlPairs };
