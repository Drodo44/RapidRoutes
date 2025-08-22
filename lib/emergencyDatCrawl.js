// lib/emergencyDatCrawl.js - SIMPLE WORKING VERSION
import { adminSupabase } from '../utils/supabaseClient';
import { distanceInMiles } from './haversine';

async function findCity(city, state) {
  const { data } = await adminSupabase
    .from('cities')
    .select('*')
    .ilike('city', city)
    .ilike('state_or_province', state)
    .limit(1);
  return data?.[0] || null;
}

async function findNearbyCities(baseCity, maxMiles = 125) {
  if (!baseCity?.latitude || !baseCity?.longitude) return [];
  
  const { data } = await adminSupabase
    .from('cities')
    .select('*')
    .limit(1000);
  
  if (!data) return [];
  
  const nearby = [];
  for (const city of data) {
    if (!city.latitude || !city.longitude) continue;
    const miles = distanceInMiles(
      baseCity.latitude, baseCity.longitude,
      city.latitude, city.longitude
    );
    if (miles > 0 && miles <= maxMiles) {
      nearby.push({ ...city, _miles: miles });
    }
  }
  
  return nearby.sort((a, b) => a._miles - b._miles).slice(0, 20);
}

export async function emergencyGeneratePairs(origin, destination, preferFillTo10 = false) {
  try {
    console.log('EMERGENCY CRAWL: Starting...');
    
    const originCity = await findCity(origin.city, origin.state);
    const destCity = await findCity(destination.city, destination.state);
    
    if (!originCity || !destCity) {
      console.log('EMERGENCY CRAWL: Cities not found');
      return { pairs: [], shortfall: 'cities_not_found' };
    }
    
    console.log('EMERGENCY CRAWL: Cities found, finding nearby...');
    const nearbyOrigins = await findNearbyCities(originCity);
    const nearbyDests = await findNearbyCities(destCity);
    
    console.log(`EMERGENCY CRAWL: Found ${nearbyOrigins.length} origin candidates, ${nearbyDests.length} dest candidates`);
    
    const pairs = [];
    const targetPairs = preferFillTo10 ? 5 : 3;
    
    for (let i = 0; i < targetPairs && i < Math.min(nearbyOrigins.length, nearbyDests.length); i++) {
      const o = nearbyOrigins[i % nearbyOrigins.length];
      const d = nearbyDests[i % nearbyDests.length];
      
      pairs.push({
        pickup: { city: o.city, state: o.state_or_province, zip: o.zip || '' },
        delivery: { city: d.city, state: d.state_or_province, zip: d.zip || '' },
        score: 0.75,
        reason: ['emergency_generation']
      });
    }
    
    console.log(`EMERGENCY CRAWL: Generated ${pairs.length} pairs`);
    
    return {
      baseOrigin: { city: originCity.city, state: originCity.state_or_province, zip: originCity.zip || '' },
      baseDest: { city: destCity.city, state: destCity.state_or_province, zip: destCity.zip || '' },
      pairs,
      count: pairs.length,
      shortfallReason: pairs.length < targetPairs ? 'insufficient_candidates' : null
    };
    
  } catch (error) {
    console.error('EMERGENCY CRAWL ERROR:', error);
    return { pairs: [], shortfall: error.message };
  }
}
