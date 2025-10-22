/**
 * FIXED INTELLIGENT SYSTEM
 * With HERE API fallback for complete coverage
 */
import supabaseAdmin from '@/lib/supabaseAdmin';
const adminSupabase = supabaseAdmin;
import { calculateDistance } from '../lib/distanceCalculator.js';
import axios from 'axios';

const HERE_API_KEY = process.env.HERE_API_KEY;

const RADIUS = {
  PRIMARY: 50,    // Start with this
  MAXIMUM: 75,    // Only if needed
  EMERGENCY: 100  // Absolute last resort
};

const SEARCH_BANDS = [
  { min: 0, max: 25 },   // Ideal range
  { min: 25, max: 35 },  // Very good range
  { min: 35, max: 50 },  // Good range
  { min: 50, max: 75 }   // Less desirable but usable
];

async function findCitiesWithHEREFallback(baseCity, minMiles, maxMiles, existingKMAs) {
  // First try our database
  const dbCities = await findCitiesInDatabase(baseCity, minMiles, maxMiles);
  
  // If we don't have enough cities, use HERE API
  if (dbCities.length < 10) { // We want extra cities to ensure KMA diversity
    const hereCities = await findCitiesFromHERE(baseCity, minMiles, maxMiles);
    
    // Merge and deduplicate cities
    const allCities = [...dbCities];
    
    for (const hereCity of hereCities) {
      // Only add if we don't have this city
      if (!allCities.some(c => 
        c.city === hereCity.city && 
        c.state_or_province === hereCity.state_or_province
      )) {
        // Get or assign KMA code
        const kmaCode = await getOrAssignKMACode(hereCity);
        if (kmaCode && !existingKMAs.has(kmaCode)) {
          allCities.push({
            ...hereCity,
            kma_code: kmaCode
          });
        }
      }
    }
    
    return allCities;
  }
  
  return dbCities;
}

async function findCitiesInDatabase(baseCity, minMiles, maxMiles) {
  try {
  const bbox = calculateBoundingBox(
      baseCity.latitude,
      baseCity.longitude,
      maxMiles // Use exact radius - we have HERE API fallback if needed
    );    const { data: cities, error } = await supabaseAdmin
      .from('cities')
      .select('*')
      .gte('latitude', bbox.minLat)
      .lte('latitude', bbox.maxLat)
      .gte('longitude', bbox.minLon)
      .lte('longitude', bbox.maxLon)
      .not('kma_code', 'is', null)
      .not('kma_code', 'eq', baseCity.kma_code);

    if (error) throw error;

    return cities
      .map(city => {
        const distance = calculateDistance(
          baseCity.latitude, baseCity.longitude,
          city.latitude, city.longitude
        );
        return { ...city, distance };
      })
      .filter(city => city.distance > minMiles && city.distance <= maxMiles);

  } catch (error) {
    console.error('Database city search error:', error);
    return [];
  }
}

async function findCitiesFromHERE(baseCity, minMiles, maxMiles) {
  try {
    // Convert miles to meters for HERE API
    const radius = maxMiles * 1609.34; // miles to meters
    
    const response = await axios.get(
      'https://discover.search.hereapi.com/v1/discover',
      {
        params: {
          apiKey: HERE_API_KEY,
          at: `${baseCity.latitude},${baseCity.longitude}`,
          limit: 100,
          q: 'city',
          'in': `circle:${baseCity.latitude},${baseCity.longitude};r=${radius}`
        }
      }
    );

    return (response.data.items || [])
      .map(item => {
        const distance = calculateDistance(
          baseCity.latitude, baseCity.longitude,
          item.position.lat, item.position.lng
        );
        
        // Parse state from address
        const address = item.address;
        const state = address.stateCode || address.state;
        
        return {
          city: item.title.split(',')[0],
          state_or_province: state,
          latitude: item.position.lat,
          longitude: item.position.lng,
          distance,
          population: item.population || 0
        };
      })
      .filter(city => 
        city.distance > minMiles && 
        city.distance <= maxMiles &&
        city.state_or_province // Only include if we have state info
      );

  } catch (error) {
    console.error('HERE API city search error:', error);
    return [];
  }
}

async function getOrAssignKMACode(city) {
  // First check if we already have this city with a KMA code
  const { data: existing } = await supabaseAdmin
    .from('cities')
    .select('kma_code')
    .eq('city', city.city)
    .eq('state_or_province', city.state_or_province)
    .not('kma_code', 'is', null)
    .limit(1);

  if (existing?.length > 0) {
    return existing[0].kma_code;
  }

  // If not, find nearby cities with KMA codes, preferring higher population
  const { data: nearbyCities } = await supabaseAdmin
    .from('cities')
    .select('*')
    .not('kma_code', 'is', null)
    .order('population', { ascending: false });

  if (nearbyCities?.length > 0) {
    // Find closest high-population city
    const scored = nearbyCities
      .map(nc => {
        const distance = calculateDistance(
          city.latitude, city.longitude,
          nc.latitude, nc.longitude
        );
        // Score based on distance and population
        const score = (nc.population || 0) / Math.max(distance, 1);
        return { ...nc, distance, score };
      })
      .sort((a, b) => b.score - a.score);

    return scored[0].kma_code;
  }

  // Last resort: Generate new KMA code from state
  return `${city.state_or_province}_${city.city.substring(0, 3).toUpperCase()}`;
}

export async function generateUniquePairs({ 
  baseOrigin,
  baseDest,
  equipment,
  minPostings = 6,
  maxRadius = RADIUS.MAXIMUM
}) {
  const usedPickupKMAs = new Set();
  const usedDeliveryKMAs = new Set();
  const pairs = [];
  
  try {
    // Start with primary radius and expand if needed
    const radiusLevels = [RADIUS.PRIMARY];
    if (maxRadius >= RADIUS.MAXIMUM) radiusLevels.push(RADIUS.MAXIMUM);
    if (maxRadius >= RADIUS.EMERGENCY) radiusLevels.push(RADIUS.EMERGENCY);

    for (const currentRadius of radiusLevels) {
      // Get all cities within this radius band by band
      for (const band of SEARCH_BANDS.filter(b => b.max <= currentRadius)) {
        // Get cities with HERE fallback for both origin and destination
        const [pickupCities, deliveryCities] = await Promise.all([
          findCitiesWithHEREFallback(baseOrigin, band.min, band.max, usedPickupKMAs),
          findCitiesWithHEREFallback(baseDest, band.min, band.max, usedDeliveryKMAs)
        ]);

        // Score and sort cities
        const scoredPickups = await scoreAndSortCities(pickupCities, baseOrigin, equipment);
        const scoredDeliveries = await scoreAndSortCities(deliveryCities, baseDest, equipment);

        // Try all possible combinations to get more pairs
        for (const pickup of scoredPickups) {
          if (usedPickupKMAs.has(pickup.kma_code)) continue;

          // Try multiple delivery cities for each pickup
          for (const delivery of scoredDeliveries) {
            if (usedDeliveryKMAs.has(delivery.kma_code) || 
                delivery.kma_code === pickup.kma_code) continue;

            pairs.push({
              pickup: {
                city: pickup.city,
                state: pickup.state_or_province,
                zip: pickup.zip || ''
              },
              delivery: {
                city: delivery.city,
                state: delivery.state_or_province,
                zip: delivery.zip || ''
              },
              kmas: {
                pickup: pickup.kma_code,
                delivery: delivery.kma_code
              },
              distances: {
                pickup: calculateDistance(
                  baseOrigin.latitude, baseOrigin.longitude,
                  pickup.latitude, pickup.longitude
                ),
                delivery: calculateDistance(
                  baseDest.latitude, baseDest.longitude,
                  delivery.latitude, delivery.longitude
                )
              },
              bands: {
                pickup: band.max,
                delivery: band.max
              }
            });

            usedPickupKMAs.add(pickup.kma_code);
            usedDeliveryKMAs.add(delivery.kma_code);

            if (pairs.length >= minPostings) break;
          }

          if (pairs.length >= minPostings) break;
        }

        if (pairs.length >= minPostings) break;
      }

      if (pairs.length >= minPostings) break;
    }

    // If we still don't have enough pairs, relax KMA constraints slightly
    if (pairs.length < minPostings) {
      // Allow reusing KMAs that are far apart
      const extraPairs = await generateExtraPairs(
        baseOrigin, baseDest, equipment,
        minPostings - pairs.length,
        usedPickupKMAs, usedDeliveryKMAs
      );
      pairs.push(...extraPairs);
    }

    return pairs;

  } catch (error) {
    console.error('Error generating unique pairs:', error);
    throw error;
  }
}

async function generateExtraPairs(baseOrigin, baseDest, equipment, count, usedPickupKMAs, usedDeliveryKMAs) {
  // Similar logic but allowing some KMA reuse if cities are far enough apart
  const extraPairs = [];
  
  // Get all cities within MAXIMUM radius
  const [pickupCities, deliveryCities] = await Promise.all([
    findCitiesWithHEREFallback(baseOrigin, 0, RADIUS.MAXIMUM, new Set()),
    findCitiesWithHEREFallback(baseDest, 0, RADIUS.MAXIMUM, new Set())
  ]);

  const scoredPickups = await scoreAndSortCities(pickupCities, baseOrigin, equipment);
  const scoredDeliveries = await scoreAndSortCities(deliveryCities, baseDest, equipment);

  for (const pickup of scoredPickups) {
    for (const delivery of scoredDeliveries) {
      // Only reuse KMAs if cities are in different bands
      const pickupBand = SEARCH_BANDS.find(b => pickup.distance > b.min && pickup.distance <= b.max);
      const deliveryBand = SEARCH_BANDS.find(b => delivery.distance > b.min && delivery.distance <= b.max);
      
      if (pickupBand && deliveryBand && pickupBand.max !== deliveryBand.max) {
        extraPairs.push({
          pickup: {
            city: pickup.city,
            state: pickup.state_or_province,
            zip: pickup.zip || ''
          },
          delivery: {
            city: delivery.city,
            state: delivery.state_or_province,
            zip: delivery.zip || ''
          },
          kmas: {
            pickup: pickup.kma_code,
            delivery: delivery.kma_code
          },
          distances: {
            pickup: pickup.distance,
            delivery: delivery.distance
          },
          bands: {
            pickup: pickupBand.max,
            delivery: deliveryBand.max
          }
        });

        if (extraPairs.length >= count) break;
      }
    }
    if (extraPairs.length >= count) break;
  }

  return extraPairs;
}

async function scoreAndSortCities(cities, baseCity, equipment) {
  try {
    const scoredCities = await Promise.all(
      cities.map(async (city) => {
        const score = await calculateFreightScore(city, baseCity, equipment);
        return { ...city, score };
      })
    );

    return scoredCities.sort((a, b) => b.score - a.score);

  } catch (error) {
    console.error('Error scoring cities:', error);
    throw error;
  }
}

async function calculateFreightScore(city, baseCity, equipment) {
  let score = 1.0;

  // Distance scoring (prefer closer cities)
  score *= (1 - (city.distance / 75)); // Normalize by maximum radius

  // Population scoring (prefer larger cities)
  if (city.population > 500000) score *= 1.3;
  else if (city.population > 100000) score *= 1.2;
  else if (city.population > 50000) score *= 1.1;

  // Equipment bias (if city has equipment data)
  if (city.equipment_bias && city.equipment_bias.includes(equipment)) {
    score *= 1.2;
  }

  return score;
}

function calculateBoundingBox(lat, lon, radiusMiles) {
  const earthRadiusMiles = 3959;
  const radLat = lat * Math.PI / 180;
  const radLon = lon * Math.PI / 180;
  const radius = radiusMiles / earthRadiusMiles;

  const minLat = radLat - radius;
  const maxLat = radLat + radius;
  const deltaLon = Math.asin(Math.sin(radius) / Math.cos(radLat));
  const minLon = radLon - deltaLon;
  const maxLon = radLon + deltaLon;

  return {
    minLat: minLat * 180 / Math.PI,
    maxLat: maxLat * 180 / Math.PI,
    minLon: minLon * 180 / Math.PI,
    maxLon: maxLon * 180 / Math.PI
  };
}
