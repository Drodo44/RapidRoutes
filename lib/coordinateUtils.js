// lib/coordinateUtils.js
// Utilities for getting city coordinates for distance calculations

import { adminSupabase as supabase } from '../utils/supabaseClient.js';

export async function getCityCoordinates(city, state) {
  try {
    const { data, error } = await supabase
      .from('cities')
      .select('latitude, longitude')
      .eq('city', city)
      .eq('state_or_province', state)
      .single();

    if (error || !data) {
      console.error(`Coordinates not found for ${city}, ${state}`);
      return null;
    }

    return {
      lat: parseFloat(data.latitude),
      lon: parseFloat(data.longitude)
    };
  } catch (error) {
    console.error('Error fetching coordinates:', error);
    return null;
  }
}

export async function calculateRealDistance(city1, city2) {
  const coord1 = await getCityCoordinates(city1.city, city1.state);
  const coord2 = await getCityCoordinates(city2.city, city2.state);
  
  if (!coord1 || !coord2) {
    return null;
  }
  
  // Use the haversine formula
  const { distanceInMiles } = await import('./haversine.js');
  return distanceInMiles(coord1, coord2);
}
