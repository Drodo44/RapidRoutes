// pages/api/calculateDistance.js
// API endpoint for calculating real distances between cities

import { adminSupabase as supabase } from '../../utils/supabaseAdminClient.js';
import { distanceInMiles } from '../../lib/haversine.js';

export default async function handler(req, res) {
  try {
    const { city1, state1, city2, state2 } = req.query;
    
    if (!city1 || !state1 || !city2 || !state2) {
      return res.status(400).json({ error: 'All city and state parameters required' });
    }

    // Get coordinates for both cities
    const [coord1Response, coord2Response] = await Promise.all([
      supabase
        .from('cities')
        .select('latitude, longitude')
        .eq('city', city1)
        .eq('state_or_province', state1)
        .single(),
      supabase
        .from('cities')
        .select('latitude, longitude')
        .eq('city', city2)
        .eq('state_or_province', state2)
        .single()
    ]);

    if (coord1Response.error || coord2Response.error) {
      return res.status(404).json({ 
        error: 'One or both cities not found in database',
        details: {
          city1Found: !coord1Response.error,
          city2Found: !coord2Response.error
        }
      });
    }

    const coord1 = {
      lat: parseFloat(coord1Response.data.latitude),
      lon: parseFloat(coord1Response.data.longitude)
    };

    const coord2 = {
      lat: parseFloat(coord2Response.data.latitude),
      lon: parseFloat(coord2Response.data.longitude)
    };

    const distance = distanceInMiles(coord1, coord2);

    res.status(200).json({
      distance: Math.round(distance * 10) / 10, // Round to 1 decimal place
      from: { city: city1, state: state1 },
      to: { city: city2, state: state2 }
    });

  } catch (error) {
    console.error('Error calculating distance:', error);
    res.status(500).json({ error: error.message });
  }
}
