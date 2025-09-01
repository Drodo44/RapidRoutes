import { adminSupabase } from './utils/supabaseClient.js';

// Debug coordinate data format
async function debugCoordinates() {
  try {
    console.log('Checking city coordinate data...');
    
    // Sample from cities table
    const { data: cities } = await adminSupabase
      .from('cities')
      .select('city, state_or_province, latitude, longitude, kma_code')
      .limit(5);

    if (cities?.length) {
      console.log('Sample city data:');
      cities.forEach(city => {
        console.log(`
City: ${city.city}, ${city.state_or_province}
Coordinates: (${city.latitude}, ${city.longitude})
Raw values:
  latitude: ${typeof city.latitude} = ${city.latitude}
  longitude: ${typeof city.longitude} = ${city.longitude}
Parsed:
  latitude: ${Number(city.latitude)}
  longitude: ${Number(city.longitude)}
`);
      });
    } else {
      console.log('No cities found in database');
    }

  } catch (error) {
    console.error('Error querying database:', error);
  }
}

// Run the debug check
debugCoordinates();
