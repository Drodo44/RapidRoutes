import { allCities } from '../../lib/allCities.js';

export default function handler(req, res) {
  const states = ['TX', 'GA', 'AL'];
  const result = {};
  states.forEach(state => {
    const cities = allCities[state];
    result[state] = cities ? cities.slice(0, 5) : [];
  });
  res.status(200).json(result);
}
