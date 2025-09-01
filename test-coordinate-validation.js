import { findDatCompatibleCities } from './lib/datCityFinder.js';
import { validateCityCoordinates } from './lib/cityValidator.js';
import { calculateDistance } from './lib/distanceCalculator.js';

// Test cities
const testCases = [
  {
    city: "Atlanta",
    state_or_province: "GA",
    latitude: 33.7628,
    longitude: -84.422
  },
  {
    city: "Invalid City",
    state_or_province: "XX",
    latitude: null,
    longitude: -84.422
  },
  {
    city: "Another Invalid",
    state_or_province: "YY",
    latitude: 33.7628,
    longitude: undefined
  }
];

async function runTests() {
  console.log('Running validation tests...\n');

  // Test coordinate validation
  testCases.forEach(city => {
    console.log(`Testing city: ${city.city}, ${city.state_or_province}`);
    const isValid = validateCityCoordinates(city);
    console.log('Coordinates valid:', isValid);
    console.log('');
  });

  // Test city finding with valid city
  console.log('\nTesting findDatCompatibleCities with valid city:');
  const validCities = await findDatCompatibleCities(testCases[0], 50);
  
  console.log(`\nFound ${validCities.length} compatible cities`);
  console.log('Verifying distances are within range...');
  
  validCities.forEach(city => {
    const distance = calculateDistance(
      testCases[0].latitude,
      testCases[0].longitude,
      city.latitude,
      city.longitude
    );
    console.log(`${city.city}, ${city.state_or_province}: ${distance.toFixed(1)} miles`);
  });
}

// Run the tests
runTests();
