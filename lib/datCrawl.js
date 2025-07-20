import { allCities } from './allCities.js';

function logSampleCities() {
  const states = ['TX', 'GA', 'AL'];
  states.forEach(state => {
    const cities = allCities[state];
    console.log(`Top 5 cities for ${state}:`);
    console.log(cities.slice(0, 5));
  });
}

logSampleCities();
