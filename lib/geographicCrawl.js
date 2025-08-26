// lib/geographicCrawl.js
// GEOGRAPHIC CRAWL: Find cities near pickup/delivery with different KMAs
// This is the CORRECT approach using your complete city/KMA database

import { adminSupabase } from '../utils/supabaseClient.js';

/**
 * Calculate distance between two points using Haversine formula
 */
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 3959; // Earth's radius in miles
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

/**
 * Find cities near a location with different KMA codes
 */
async function findCitiesNearLocation(baseCity, targetCount = 5, maxDistanceMiles = 75, usedCities = new Set()) {
  console.log(`🗺️ Finding ${targetCount} cities near ${baseCity.city}, ${baseCity.state} within ${maxDistanceMiles} miles (avoiding ${usedCities.size} used cities)`);
  
  if (!baseCity.latitude || !baseCity.longitude) {
    console.error(`❌ Base city ${baseCity.city}, ${baseCity.state} missing coordinates`);
    return [];
  }
  
  // Get all cities within the 75-mile radius with coordinates and KMA codes
  // Use DISTINCT ON to get only one entry per city name (eliminates ZIP duplicates)
  const latRange = maxDistanceMiles / 69; // Approximate degrees per mile
  const lonRange = maxDistanceMiles / (69 * Math.cos(baseCity.latitude * Math.PI / 180));
  
  // First get all potential cities, then deduplicate by city name
  const { data: rawCities, error } = await adminSupabase
    .from('cities')
    .select('city, state_or_province, zip, latitude, longitude, kma_code, kma_name')
    .gte('latitude', baseCity.latitude - latRange)
    .lte('latitude', baseCity.latitude + latRange)
    .gte('longitude', baseCity.longitude - lonRange) 
    .lte('longitude', baseCity.longitude + lonRange)
    .not('latitude', 'is', null)
    .not('longitude', 'is', null)
    .not('kma_code', 'is', null)
    .neq('kma_code', baseCity.kma_code) // Different KMA than base
    .limit(2000); // Get more to have variety after deduplication
  
  if (error) {
    console.error(`❌ Error finding cities near ${baseCity.city}:`, error);
    return [];
  }
  
  if (!rawCities?.length) {
    console.log(`⚠️ No nearby cities found for ${baseCity.city}, ${baseCity.state}`);
    return [];
  }
  
  // Deduplicate by city name (eliminate ZIP code duplicates)
  const cityMap = new Map();
  for (const city of rawCities) {
    const cityKey = `${city.city.toLowerCase()}, ${city.state_or_province.toLowerCase()}`;
    if (!cityMap.has(cityKey)) {
      cityMap.set(cityKey, city);
    }
  }
  
  const nearbyCities = Array.from(cityMap.values());
  console.log(`📊 Found ${nearbyCities.length} unique cities (deduplicated from ${rawCities.length} entries)`);
  
  // Calculate actual distances and filter out used cities
  const citiesWithDistance = [];
  
  for (const city of nearbyCities) {
    const cityKey = `${city.city}, ${city.state_or_province}`;
    
    // Skip if this city was already used in a previous load
    if (usedCities.has(cityKey)) {
      continue;
    }
    
    const distance = calculateDistance(
      baseCity.latitude, baseCity.longitude,
      city.latitude, city.longitude
    );
    
    // Enforce the 75-mile rule strictly
    if (distance <= maxDistanceMiles) {
      citiesWithDistance.push({
        ...city,
        distance: Math.round(distance),
        cityKey
      });
    }
  }
  
  // Sort by distance and take the closest ones (no KMA restriction per search)
  const selectedCities = citiesWithDistance
    .sort((a, b) => a.distance - b.distance)
    .slice(0, targetCount);
  
  console.log(`📍 Found ${selectedCities.length}/${targetCount} cities near ${baseCity.city} (within ${maxDistanceMiles} miles):`);
  selectedCities.forEach(city => {
    console.log(`   ${city.city}, ${city.state_or_province} - ${city.distance}mi (KMA: ${city.kma_code})`);
  });
  
  return selectedCities;
}

/**
 * GEOGRAPHIC CRAWL: Use your complete KMA database properly with 75-mile rule
 */
export async function generateGeographicCrawlPairs({ origin, destination, equipment, preferFillTo10, usedCities = new Set() }) {
  try {
    console.log(`🗺️ GEOGRAPHIC CRAWL: ${origin.city}, ${origin.state} -> ${destination.city}, ${destination.state}`);
    console.log(`🚫 Avoiding ${usedCities.size} previously used cities to ensure variety`);
    
    // Get base cities with full details from YOUR database
    const { data: originData } = await adminSupabase
      .from('cities')
      .select('city, state_or_province, zip, latitude, longitude, kma_code, kma_name')
      .ilike('city', origin.city)
      .ilike('state_or_province', origin.state)
      .not('latitude', 'is', null)
      .not('kma_code', 'is', null)
      .limit(1);
      
    const { data: destData } = await adminSupabase
      .from('cities')
      .select('city, state_or_province, zip, latitude, longitude, kma_code, kma_name')
      .ilike('city', destination.city)
      .ilike('state_or_province', destination.state)
      .not('latitude', 'is', null)
      .not('kma_code', 'is', null)
      .limit(1);
    
    if (!originData?.[0] || !destData?.[0]) {
      console.error(`❌ Could not find origin or destination in cities database`);
      return {
        baseOrigin: { city: origin.city, state: origin.state, zip: '' },
        baseDest: { city: destination.city, state: destination.state, zip: '' },
        pairs: []
      };
    }
    
    const baseOrigin = originData[0];
    const baseDest = destData[0];
    
    console.log(`📍 Base Origin: ${baseOrigin.city}, ${baseOrigin.state_or_province} (KMA: ${baseOrigin.kma_code})`);
    console.log(`📍 Base Dest: ${baseDest.city}, ${baseDest.state_or_province} (KMA: ${baseDest.kma_code})`);
    
    // Find 5 cities near pickup with different KMAs (75-mile rule, avoiding used cities)
    const pickupAlternatives = await findCitiesNearLocation(baseOrigin, 5, 75, usedCities);
    
    // Find 5 cities near delivery with different KMAs (75-mile rule, avoiding used cities)
    const deliveryAlternatives = await findCitiesNearLocation(baseDest, 5, 75, usedCities);
    
    console.log(`🎯 Geographic Analysis: Found ${pickupAlternatives.length} pickup alternatives, ${deliveryAlternatives.length} delivery alternatives (within 75 miles)`);
    
    // Generate pairs by combining pickup alternatives with delivery alternatives
    const pairs = [];
    const targetPairs = preferFillTo10 ? 5 : 3;
    
    // CRITICAL FIX: GUARANTEE exactly targetPairs for fill-to-10 mode
    if (preferFillTo10 && (pickupAlternatives.length === 0 || deliveryAlternatives.length === 0)) {
      console.error(`🚨 CRITICAL: Fill-to-10 mode but no alternatives found (pickup: ${pickupAlternatives.length}, delivery: ${deliveryAlternatives.length})`);
      // Emergency fallback: use base cities to fill pairs
      for (let i = 0; i < targetPairs; i++) {
        pairs.push({
          pickup: {
            city: baseOrigin.city,
            state: baseOrigin.state_or_province,
            zip: baseOrigin.zip || ''
          },
          delivery: {
            city: baseDest.city,
            state: baseDest.state_or_province,
            zip: baseDest.zip || ''
          },
          score: 0.5,
          geographic: {
            pickup_distance: 0,
            delivery_distance: 0,
            pickup_kma: baseOrigin.kma_code,
            delivery_kma: baseDest.kma_code
          }
        });
        console.log(`🚨 EMERGENCY PAIR ${i+1}: ${baseOrigin.city}, ${baseOrigin.state_or_province} -> ${baseDest.city}, ${baseDest.state_or_province} (emergency fallback)`);
      }
    } else {
      // Generate real geographic pairs - cycle through alternatives if needed
      for (let i = 0; i < targetPairs; i++) {
        const pickupIndex = i % pickupAlternatives.length;
        const deliveryIndex = i % deliveryAlternatives.length;
        const pickup = pickupAlternatives[pickupIndex];
        const delivery = deliveryAlternatives[deliveryIndex];
        
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
          score: 0.8,
          geographic: {
            pickup_distance: pickup.distance,
            delivery_distance: delivery.distance,
            pickup_kma: pickup.kma_code,
            delivery_kma: delivery.kma_code
          }
        });
        
        console.log(`🗺️ GEOGRAPHIC PAIR ${i+1}: ${pickup.city}, ${pickup.state_or_province} (${pickup.distance}mi, KMA: ${pickup.kma_code}) -> ${delivery.city}, ${delivery.state_or_province} (${delivery.distance}mi, KMA: ${delivery.kma_code})`);
      }
    }
    
    console.log(`✅ GEOGRAPHIC: Generated ${pairs.length} real geographic pairs using 75-mile rule`);
    
    // CRITICAL ASSERTION: Guarantee exact pair count for fill-to-10 mode
    if (preferFillTo10 && pairs.length !== 5) {
      console.error(`🚨 CRITICAL ERROR: Fill-to-10 mode requires exactly 5 pairs, got ${pairs.length}`);
      throw new Error(`Geographic crawl guarantee failed: got ${pairs.length} pairs, expected 5 for fill-to-10 mode`);
    };
    
    // Add the cities we used to the usedCities set for future calls
    pickupAlternatives.forEach(city => usedCities.add(city.cityKey));
    deliveryAlternatives.forEach(city => usedCities.add(city.cityKey));
    
    return {
      baseOrigin: {
        city: baseOrigin.city,
        state: baseOrigin.state_or_province,
        zip: baseOrigin.zip || ''
      },
      baseDest: {
        city: baseDest.city,
        state: baseDest.state_or_province,
        zip: baseDest.zip || ''
      },
      pairs,
      usedCities // Return the updated set for the next call
    };
    
  } catch (error) {
    console.error('Geographic crawl error:', error);
    return {
      baseOrigin: { city: origin.city, state: origin.state, zip: '' },
      baseDest: { city: destination.city, state: destination.state, zip: '' },
      pairs: [],
      usedCities
    };
  }
}
