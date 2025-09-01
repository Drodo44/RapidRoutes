import { generateDefinitiveIntelligentPairs } from './lib/definitiveIntelligent.new.js';
import { validateCityCoordinates } from './lib/cityValidator.js';
import { calculateDistance } from './lib/distanceCalculator.js';

async function testIntelligentGeneration() {
  console.log('Testing Intelligent City Pair Generation\n');

  // Test case 1: Atlanta to Miami
  const test1 = {
    origin: {
      city: "Atlanta",
      state: "GA"
    },
    destination: {
      city: "Miami",
      state: "FL"
    }
  };

  console.log(`Test Case 1: ${test1.origin.city}, ${test1.origin.state} -> ${test1.destination.city}, ${test1.destination.state}`);
  const result1 = await generateDefinitiveIntelligentPairs(test1.origin, test1.destination);
  
  console.log('\nValidating Results:');
  console.log('Generated Pairs:', result1.pairs.length);
  
  // Validate each pair
  result1.pairs.forEach((pair, index) => {
    console.log(`\nPair ${index + 1}:`);
    console.log(`Pickup: ${pair.pickup.city}, ${pair.pickup.state}`);
    console.log(`Delivery: ${pair.delivery.city}, ${pair.delivery.state}`);
    console.log(`Score: ${pair.score.toFixed(2)}`);
    console.log(`KMA Diversity: ${pair.geographic.pickup_kma} -> ${pair.geographic.delivery_kma}`);
    console.log(`Distances: ${Math.round(pair.geographic.pickup_distance)}mi -> ${Math.round(pair.geographic.delivery_distance)}mi`);
  });

  // Test case 2: Chicago to New York (different KMAs)
  const test2 = {
    origin: {
      city: "Chicago",
      state: "IL"
    },
    destination: {
      city: "New York",
      state: "NY"
    }
  };

  console.log('\n-------------------\n');
  console.log(`Test Case 2: ${test2.origin.city}, ${test2.origin.state} -> ${test2.destination.city}, ${test2.destination.state}`);
  const result2 = await generateDefinitiveIntelligentPairs(test2.origin, test2.destination);
  
  console.log('\nValidating Results:');
  console.log('Generated Pairs:', result2.pairs.length);
  
  result2.pairs.forEach((pair, index) => {
    console.log(`\nPair ${index + 1}:`);
    console.log(`Pickup: ${pair.pickup.city}, ${pair.pickup.state}`);
    console.log(`Delivery: ${pair.delivery.city}, ${pair.delivery.state}`);
    console.log(`Score: ${pair.score.toFixed(2)}`);
    console.log(`KMA Diversity: ${pair.geographic.pickup_kma} -> ${pair.geographic.delivery_kma}`);
    console.log(`Distances: ${Math.round(pair.geographic.pickup_distance)}mi -> ${Math.round(pair.geographic.delivery_distance)}mi`);
  });
}

// Run the tests
testIntelligentGeneration()
  .catch(error => console.error('Test failed:', error));
