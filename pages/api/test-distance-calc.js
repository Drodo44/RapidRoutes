// Test distance calculation for actual production lanes
import supabaseAdmin from "@/lib/supabaseAdmin";

// Haversine distance calculation (copied from definitiveIntelligent.js)
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 3959; // Earth's radius in miles
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c; // Distance in miles
}

export default async function handler(req, res) {
  try {
    // Get a specific lane we know exists - Opelika, AL
    const { data: lanes } = await supabase
      .from('lanes')
      .select('origin_city, origin_state, dest_city, dest_state')
      .eq('origin_city', 'Opelika')
      .eq('origin_state', 'AL')
      .limit(1);

    if (!lanes?.[0]) {
      return res.status(404).json({ error: 'No lanes found' });
    }

    const lane = lanes[0];
    
    // Find origin city in database
    const { data: originData } = await supabase
      .from('cities')
      .select('city, state_or_province, zip, latitude, longitude, kma_code')
      .ilike('city', lane.origin_city)
      .ilike('state_or_province', lane.origin_state)
      .not('latitude', 'is', null)
      .not('kma_code', 'is', null)
      .limit(1);

    if (!originData?.[0]) {
      return res.status(404).json({ 
        error: `Origin city not found: ${lane.origin_city}, ${lane.origin_state}` 
      });
    }

    const origin = originData[0];
    
    // Get nearby cities from the same state and adjacent states for testing
    const { data: nearbyCities } = await supabase
      .from('cities')
      .select('city, state_or_province, zip, latitude, longitude, kma_code')
      .not('latitude', 'is', null)
      .not('kma_code', 'is', null)
      .in('state_or_province', ['AL', 'GA', 'FL', 'TN', 'MS']) // States around Alabama
      .limit(500); // More cities from relevant geographic area
    
    console.log(`Found ${nearbyCities?.length || 0} cities to test distance against`);
    
    // Calculate distances
    const distances = [];
    for (const city of nearbyCities || []) {
      const distance = calculateDistance(
        origin.latitude, origin.longitude,
        city.latitude, city.longitude
      );
      
      if (distance <= 100) { // Within 100 miles
        distances.push({
          city: `${city.city}, ${city.state_or_province}`,
          distance: Math.round(distance * 100) / 100,
          coords: `${city.latitude}, ${city.longitude}`
        });
      }
    }
    
    // Sort by distance
    distances.sort((a, b) => a.distance - b.distance);
    
    res.status(200).json({
      success: true,
      testLane: `${lane.origin_city}, ${lane.origin_state}`,
      origin: {
        city: `${origin.city}, ${origin.state_or_province}`,
        coords: `${origin.latitude}, ${origin.longitude}`,
        kma: origin.kma_code
      },
      totalCitiesChecked: nearbyCities?.length || 0,
      citiesWithin100Miles: distances.length,
      citiesWithin75Miles: distances.filter(d => d.distance <= 75).length,
      closestCities: distances.slice(0, 10), // Top 10 closest
      distanceCalculationTest: {
        originCoords: [origin.latitude, origin.longitude],
        sampleDistance: distances[0] ? calculateDistance(
          origin.latitude, origin.longitude,
          parseFloat(distances[0].coords.split(', ')[0]),
          parseFloat(distances[0].coords.split(', ')[1])
        ) : null
      }
    });
    
  } catch (error) {
    console.error('Distance test error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message,
      stack: error.stack 
    });
  }
}
