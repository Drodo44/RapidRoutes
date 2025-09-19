// lib/geographicCrawl.js// lib/geographicCrawl.js

// Smart radius crawl with HERE fallback// Smart radius crawl with HERE fallback



const { findDiverseCities } = require('./improvedCitySearch.js');const { findDiverseCities } = require('./improvedCitySearch.js');

const { calculateDistance } = require('./distanceCalculator.js');const { calculateDistance } = require('./distanceCalculator.js');

const { enrichCityData, discoverNearbyCities } = require("./cityEnrichment.js");const { enrichCityData, discoverNearbyCities } = require("./cityEnrichment.js");

const { advancedCityDiscovery } = require("./hereAdvancedServices.js");const { advancedCityDiscovery } = require("./hereAdvancedServices.js");

const { findBestKMA } = require("./kmaAssignment.js");const { findBestKMA } = require("./kmaAssignment.js");

const { adminSupabase } = require('../utils/supabaseClient.js');const { adminSupabase } = require('../utils/supabaseClient.js');



const HERE_API_KEY = process.env.HERE_API_KEY;const HERE_API_KEY = process.env.HERE_API_KEY;

const MIN_UNIQUE_KMAS = 5;const MIN_UNIQUE_KMAS = 5;

const TARGET_UNIQUE_KMAS = 10;const TARGET_UNIQUE_KMAS = 10;



/**/**

 * Find cities with different KMAs within specified radius * Find cities with different KMAs within specified radius

 */ */

async function findNearbyKMAs(city, radius = 75) {async function findNearbyKMAs(city, radius = 75) {

  // First try Supabase with increasing radius until we get enough KMA diversity  // First try Supabase with increasing radius until we get enough KMA diversity

  let currentRadius = radius;  let currentRadius = radius;

  let maxRadius = 150; // Maximum radius to try  let maxRadius = 150; // Maximum radius to try

  let nearbyCities = [];  let nearbyCities = [];

  let withDistance = [];  

    while (currentRadius <= maxRadius) {

  // Try database search first    console.log(`Searching for cities within ${currentRadius} miles...`);

  while (currentRadius <= maxRadius) {    

    console.log(`Searching for cities within ${currentRadius} miles...`);    const { data: cities } = await adminSupabase

          .from('cities')

    const { data: cities } = await adminSupabase      .select('*')

      .from('cities')      .not('kma_code', 'is', null)

      .select('*')      .eq('here_verified', true);

      .not('kma_code', 'is', null)      

      .eq('here_verified', true);    if (!cities) continue;

            

    if (cities) {    nearbyCities = cities;

      nearbyCities = cities;

    const withDistance = nearbyCities

      withDistance = nearbyCities      .filter(nc => {

        .filter(nc => {        const distance = calculateDistance(

          const distance = calculateDistance(          city.latitude,

            city.latitude,          city.longitude,

            city.longitude,          nc.latitude,

            nc.latitude,          nc.longitude

            nc.longitude        );

          );        return distance <= radius;

          return distance <= currentRadius;      })

        })      .map(nc => ({ ...nc, distance: calculateDistance(

        .map(nc => ({         city.latitude,

          ...nc,         city.longitude,

          distance: calculateDistance(        nc.latitude,

            city.latitude,        nc.longitude

            city.longitude,      )}));

            nc.latitude,

            nc.longitude    // Check KMA diversity

          )    const uniqueKMAs = new Set(withDistance.map(c => c.kma_code));

        }));

    // If we have enough KMAs, exit the loop

      // Check KMA diversity    if (uniqueKMAs.size >= MIN_UNIQUE_KMAS) {

      const uniqueKMAs = new Set(withDistance.map(c => c.kma_code));      return withDistance;

          }

      if (uniqueKMAs.size >= MIN_UNIQUE_KMAS) {

        break; // We found enough unique KMAs    console.log(`Found only ${uniqueKMAs.size} KMAs in Supabase, trying HERE.com...`);

      }    currentRadius += 25; // Increase radius for next iteration

    }  } // end while loop

    

    currentRadius += 25; // Increase radius for next iteration  // If we got here, try HERE.com as a last resort

  }  console.log('Trying HERE.com API...');

    

  // If we don't have enough KMAs, try HERE.com    const hereCities = await advancedCityDiscovery(

  if (withDistance.length === 0 || new Set(withDistance.map(c => c.kma_code)).size < MIN_UNIQUE_KMAS) {      city.latitude,

    console.log('Trying HERE.com API for additional cities...');      city.longitude,

          radius

    const hereCities = await advancedCityDiscovery(    );

      city.latitude,

      city.longitude,    // Cross-reference and store new cities

      radius    for (const hereCity of hereCities.cities) {

    );      const kma = await findBestKMA(hereCity.latitude, hereCity.longitude);

      if (kma) {

    // Cross-reference and store new cities        hereCity.kma_code = kma.code;

    for (const hereCity of hereCities.cities) {        hereCity.kma_name = kma.name;

      const kma = await findBestKMA(hereCity.latitude, hereCity.longitude);        hereCity.here_verified = true;

      if (kma) {        

        hereCity.kma_code = kma.code;        // Store in Supabase

        hereCity.kma_name = kma.name;        await adminSupabase

        hereCity.here_verified = true;          .from('cities')

                  .upsert([hereCity], { onConflict: 'city,state_or_province' });

        // Store in Supabase          

        await adminSupabase        // Add to results if within radius

          .from('cities')        const distance = calculateDistance(

          .upsert([hereCity], { onConflict: 'city,state_or_province' });          city.latitude,

                    city.longitude,

        // Add to results if within radius          hereCity.latitude,

        const distance = calculateDistance(          hereCity.longitude

          city.latitude,        );

          city.longitude,        

          hereCity.latitude,        if (distance <= radius) {

          hereCity.longitude          withDistance.push({ ...hereCity, distance });

        );        }

              }

        if (distance <= radius) {    }

          withDistance.push({ ...hereCity, distance });  }

        }

      }  // Sort by distance and KMA diversity

    }  return withDistance

  }    .sort((a, b) => a.distance - b.distance)

    .reduce((acc, city) => {

  // Sort by distance and ensure KMA diversity      if (!acc.kmas.has(city.kma_code)) {

  return withDistance        acc.kmas.add(city.kma_code);

    .sort((a, b) => a.distance - b.distance)        acc.cities.push(city);

    .reduce((acc, city) => {      }

      if (!acc.kmas.has(city.kma_code)) {      return acc;

        acc.kmas.add(city.kma_code);    }, { cities: [], kmas: new Set() })

        acc.cities.push(city);    .cities;

      }}

      return acc;

    }, { cities: [], kmas: new Set() })/**

    .cities; * Generate city pairs based on geographic crawl with KMA diversity

} */

async function generateGeographicCrawlPairs(origin, destination) {

/**  try {

 * Generate city pairs based on geographic crawl with KMA diversity    console.log('🌎 Generating geographic crawl pairs...');

 */    

async function generateGeographicCrawlPairs(origin, destination) {    // Get nearby cities for both origin and destination

  try {    const [originCities, destCities] = await Promise.all([

    console.log('🌎 Generating geographic crawl pairs...');      findNearbyKMAs(origin),

          findNearbyKMAs(destination)

    // Get nearby cities for both origin and destination    ]);

    const [originCities, destCities] = await Promise.all([

      findNearbyKMAs(origin),    console.log(`Found ${originCities.length} origin cities with unique KMAs`);

      findNearbyKMAs(destination)    console.log(`Found ${destCities.length} destination cities with unique KMAs`);

    ]);

    // Generate all valid pairs

    console.log(`Found ${originCities.length} origin cities with unique KMAs`);    const pairs = [];

    console.log(`Found ${destCities.length} destination cities with unique KMAs`);    const seenPairs = new Set();



    // Generate all valid pairs    for (const orig of originCities) {

    const pairs = [];      for (const dest of destCities) {

    const seenPairs = new Set();        const pairKey = `${orig.kma_code}-${dest.kma_code}`;

        if (!seenPairs.has(pairKey)) {

    for (const orig of originCities) {          pairs.push({

      for (const dest of destCities) {            origin: orig,

        const pairKey = `${orig.kma_code}-${dest.kma_code}`;            destination: dest,

        if (!seenPairs.has(pairKey)) {            total_distance: calculateDistance(

          pairs.push({              orig.latitude,

            origin: orig,              orig.longitude,

            destination: dest,              dest.latitude,

            total_distance: calculateDistance(              dest.longitude

              orig.latitude,            )

              orig.longitude,          });

              dest.latitude,          seenPairs.add(pairKey);

              dest.longitude        }

            )      }

          });    }

          seenPairs.add(pairKey);

        }    // Sort by optimal freight characteristics

      }    const rankedPairs = pairs.sort((a, b) => {

    }      // Prefer medium distances (300-800 miles)

      const aScore = a.total_distance > 300 && a.total_distance < 800 ? 2 : 1;

    // Sort by optimal freight characteristics      const bScore = b.total_distance > 300 && b.total_distance < 800 ? 2 : 1;

    const rankedPairs = pairs.sort((a, b) => {      return bScore - aScore;

      // Prefer medium distances (300-800 miles)    });

      const aScore = a.total_distance > 300 && a.total_distance < 800 ? 2 : 1;

      const bScore = b.total_distance > 300 && b.total_distance < 800 ? 2 : 1;    console.log(`Generated ${rankedPairs.length} unique pairs`);

      return bScore - aScore;    return {

    });      pairs: rankedPairs,

      debug: {

    console.log(`Generated ${rankedPairs.length} unique pairs`);        origin_kmas: originCities.map(c => c.kma_code),

    return {        dest_kmas: destCities.map(c => c.kma_code),

      pairs: rankedPairs,        total_pairs: rankedPairs.length

      debug: {      }

        origin_kmas: originCities.map(c => c.kma_code),    };

        dest_kmas: destCities.map(c => c.kma_code),

        total_pairs: rankedPairs.length  } catch (error) {

      }    console.error('Failed to generate pairs:', error);

    };    return {

      pairs: [],

  } catch (error) {      debug: {

    console.error('Failed to generate pairs:', error);        error: error.message,

    return {        stack: error.stack

      pairs: [],      }

      debug: {    };

        error: error.message,  }

        stack: error.stack}

      }

    };module.exports = { generateGeographicCrawlPairs };
  }
}

module.exports = { generateGeographicCrawlPairs };