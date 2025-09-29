// lib/datCityFinder.js
// Intelligent DAT-compatible city finder with KMA awareness

import { adminSupabase as supabase } from '../utils/supabaseAdminClient.js';
import { calculateDistance } from './distanceCalculator.js';
import { validateCityCoordinates } from './cityValidator.js';

/**
 * Find DAT-compatible cities within a specific KMA
 */
export async function findDatCompatibleCities(baseCity, maxDistance = 75, minCities = 5, targetKMA = null) {
  try {
    if (!validateCityCoordinates(baseCity)) {
      console.error(`Base city has invalid coordinates: ${baseCity.city}, ${baseCity.state_or_province}`);
      return [];
    }

    // Use specific KMA if provided, otherwise use base city's KMA
    const kmaToSearch = targetKMA || baseCity.kma_code;
    console.log(`🔍 Finding cities in KMA: ${kmaToSearch}`);

    // Get cities from the target KMA
    const { data: cities, error } = await supabase
      .from('cities')
      .select('*')
      .eq('kma_code', kmaToSearch)
      .not('city', 'eq', baseCity.city) // Exclude base city
      .order('population', { ascending: false }); // Prefer larger cities

    if (error) {
      console.error('Error fetching cities:', error);
      return [];
    }

    // Validate and filter cities
    const validCities = cities.filter(city => {
      if (!validateCityCoordinates(city)) {
        console.warn(`Skipping city with invalid coordinates: ${city.city}, ${city.state_or_province}`);
        return false;
      }

      const distance = calculateDistance(
        Number(baseCity.latitude),
        Number(baseCity.longitude),
        Number(city.latitude),
        Number(city.longitude)
      );

      if (distance > maxDistance) {
        console.log(`Skipping ${city.city}, ${city.state_or_province} - too far (${Math.round(distance)}mi)`);
        return false;
      }

      // Add distance to city object for sorting
      city.distance = distance;
      return true;
    });

    // Sort by a combination of distance and population
    validCities.sort((a, b) => {
      // Population tier affects sort priority
      const aTier = a.population > 100000 ? 2 : a.population > 50000 ? 1 : 0;
      const bTier = b.population > 100000 ? 2 : b.population > 50000 ? 1 : 0;
      
      if (aTier !== bTier) return bTier - aTier;
      return a.distance - b.distance;
    });

    // Log results
    if (validCities.length > 0) {
      console.log(`Found ${validCities.length} valid cities in ${kmaToSearch}`);
      validCities.forEach(city => {
        console.log(`Distance from ${baseCity.city} to ${city.city}: ${city.distance.toFixed(1)}mi`);
      });
    } else {
      console.log(`No valid cities found in ${kmaToSearch} within ${maxDistance} miles`);
    }

    return validCities;

  } catch (error) {
    console.error('Error in findDatCompatibleCities:', error);
    return [];
  }
}
