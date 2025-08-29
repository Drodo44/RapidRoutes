// pages/api/getPostedPairs.js
// Get the posted city pairs for a specific lane to enable smart recap matching

import { adminSupabase as supabase } from '../../utils/supabaseClient.js';

async function getCitiesInRadius(city, state, zip, maxMiles = 100) {
  try {
    // Get the base city coordinates
    const { data: baseCity, error: baseCityError } = await supabase
      .from('cities')
      .select('id, city, state_or_province, zip, latitude, longitude, kma_code, kma_name')
      .eq('city', city)
      .eq('state_or_province', state)
      .not('latitude', 'is', null)
      .not('longitude', 'is', null)
      .single();

    if (baseCityError || !baseCity) {
      console.error(`Base city not found: ${city}, ${state}`);
      return [];
    }

    // Use bounding box query for efficiency
    const latDelta = maxMiles / 69;
    const lonDelta = maxMiles / (69 * Math.cos(baseCity.latitude * Math.PI / 180));

    const { data: rawData, error: rawError } = await supabase
      .from('cities')
      .select('id, city, state_or_province, zip, latitude, longitude, kma_code, kma_name')
      .gte('latitude', baseCity.latitude - latDelta)
      .lte('latitude', baseCity.latitude + latDelta)
      .gte('longitude', baseCity.longitude - lonDelta)
      .lte('longitude', baseCity.longitude + lonDelta)
      .not('latitude', 'is', null)
      .not('longitude', 'is', null)
      .limit(500);

    if (rawError) {
      console.error('Database error:', rawError);
      return [];
    }

    // Deduplicate by city + state
    const uniqueCities = new Map();
    rawData?.forEach(row => {
      const key = `${row.city.toLowerCase()}_${row.state_or_province.toLowerCase()}`;
      if (!uniqueCities.has(key)) {
        uniqueCities.set(key, row);
      }
    });

    const candidates = Array.from(uniqueCities.values());
    
    // Calculate distances and filter
    const results = [];
    for (const candidate of candidates) {
      const distance = haversineDistance(
        baseCity.latitude, baseCity.longitude,
        candidate.latitude, candidate.longitude
      );
      
      if (distance <= maxMiles && distance > 0) { // Exclude the base city itself
        results.push({
          ...candidate,
          distance: distance
        });
      }
    }

    // Sort by distance and return top candidates
    return results.sort((a, b) => a.distance - b.distance).slice(0, 10);
    
  } catch (error) {
    console.error('Error in getCitiesInRadius:', error);
    return [];
  }
}

function haversineDistance(lat1, lon1, lat2, lon2) {
  const toRad = (deg) => (deg * Math.PI) / 180;
  const R = 3959; // Earth radius in miles
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.asin(Math.sqrt(a));
}

export default async function handler(req, res) {
  try {
    const { laneId } = req.query;
    
    if (!laneId) {
      return res.status(400).json({ error: 'Lane ID required' });
    }

    // Get the original lane
    const { data: lane, error: laneError } = await supabase
      .from('lanes')
      .select('*')
      .eq('id', laneId)
      .single();

    if (laneError) {
      throw new Error(`Failed to fetch lane: ${laneError.message}`);
    }

    if (!lane) {
      return res.status(404).json({ error: 'Lane not found' });
    }

    // Simulate the crawl process to get the posted pairs
    const pickupCandidates = await getCitiesInRadius(
      lane.origin_city,
      lane.origin_state,
      lane.origin_zip || null,
      125 // max radius
    );

    const deliveryCandidates = await getCitiesInRadius(
      lane.dest_city,
      lane.dest_state,
      lane.dest_zip || null,
      125 // max radius
    );

    // Generate the same pairs that would have been posted
    // This is a simplified version - in production, you'd want to store the actual posted pairs
    const postedPairs = [];
    
    // Take up to 12 combinations (to match the 12 rows per lane)
    const maxPairs = Math.min(12, pickupCandidates.length * deliveryCandidates.length);
    let pairCount = 0;

    for (let i = 0; i < pickupCandidates.length && pairCount < maxPairs; i++) {
      for (let j = 0; j < deliveryCandidates.length && pairCount < maxPairs; j++) {
        const pickup = pickupCandidates[i];
        const delivery = deliveryCandidates[j];
        
        postedPairs.push({
          id: `${laneId}-${i}-${j}`,
          laneId: laneId,
          pickup: {
            city: pickup.city,
            state: pickup.state_or_province,
            zip: pickup.zip,
            kma: pickup.kma_name
          },
          delivery: {
            city: delivery.city,
            state: delivery.state_or_province,
            zip: delivery.zip,
            kma: delivery.kma_name
          }
        });
        
        pairCount++;
      }
    }

    res.status(200).json({
      lane,
      postedPairs,
      totalPairs: postedPairs.length
    });

  } catch (error) {
    console.error('Error fetching posted pairs:', error);
    res.status(500).json({ error: error.message });
  }
}
