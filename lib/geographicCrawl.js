// lib/geographicCrawl.js
const { findDiverseCities } = require('./improvedCitySearch.js');
const { calculateDistance } = require('./distanceCalculator.js');
const { enrichCityData, discoverNearbyCities } = require("./cityEnrichment.js");
const { advancedCityDiscovery } = require("./hereAdvancedServices.js");
const { findBestKMA } = require("./kmaAssignment.js");
const { adminSupabase } = require('../utils/supabaseClient.js');

const HERE_API_KEY = process.env.HERE_API_KEY;
const MIN_UNIQUE_KMAS = 5;

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

async function generateGeographicCrawlPairs(origin, destination) {
  try {
    const [originCities, destCities] = await Promise.all([
      findNearbyKMAs(origin),
      findNearbyKMAs(destination)
    ]);
    
    const pairs = [];
    const seenPairs = new Set();
    
    for (const orig of originCities) {
      for (const dest of destCities) {
        const pairKey = ${orig.kma_code}-${dest.kma_code};
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

module.exports = { generateGeographicCrawlPairs };
