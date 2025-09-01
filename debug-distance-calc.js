import { adminSupabase } from './utils/supabaseClient.js';
import { calculateDistance } from './lib/distanceCalculator.js';
import { findDatCompatibleCities } from './lib/datCityFinder.js';

async function debugDistanceCalc() {
  try {
    console.log('Testing distance calculations...');

    // Get a sample base city
    const { data: baseCity } = await adminSupabase
      .from('cities')
      .select('*')
      .eq('city', 'Atlanta')
      .eq('state_or_province', 'GA')
      .single();

    if (!baseCity) {
      console.error('Could not find base city');
      return;
    }

    console.log('\nBase city:', baseCity.city, baseCity.state_or_province);
    console.log('Base coordinates:', baseCity.latitude, baseCity.longitude);

    // Test direct distance calculation
    const testCoords = [
      {lat: 33.7490, lon: -84.3880}, // Atlanta coords
      {lat: 40.7128, lon: -74.0060}, // NYC coords 
      {lat: null, lon: -80.1917},    // Test null lat
      {lat: 25.7617, lon: undefined} // Test undefined lon
    ];

    console.log('\nTesting direct coordinate calculations:');
    testCoords.forEach(coord => {
      const distance = calculateDistance(
        baseCity.latitude,
        baseCity.longitude,
        coord.lat,
        coord.lon
      );

      console.log(`\nTest coordinates: (${coord.lat}, ${coord.lon})`);
      console.log(`Raw input types: lat=${typeof coord.lat}, lon=${typeof coord.lon}`);
      console.log(`Calculated distance: ${distance}`);
    });

    // Test with actual nearby cities
    console.log('\nTesting with actual nearby cities:');
    const compatibleCities = await findDatCompatibleCities(baseCity, 100);
    
    if (compatibleCities?.length) {
      compatibleCities.slice(0, 3).forEach(city => {
        const distance = calculateDistance(
          baseCity.latitude,
          baseCity.longitude,
          city.latitude,
          city.longitude
        );

        console.log(`\nCity: ${city.city}, ${city.state_or_province}`);
        console.log(`Coordinates: (${city.latitude}, ${city.longitude})`);
        console.log(`Raw input types: lat=${typeof city.latitude}, lon=${typeof city.longitude}`);
        console.log(`Calculated distance: ${distance}`);
      });
    }

  } catch (error) {
    console.error('Error in debug script:', error);
  }
}

// Run debug tests
debugDistanceCalc();
