/**
 * Test city data used across test suites
 */
const TEST_CITIES = [
  // Major Cities
  { city: 'Chicago', state: 'IL', zip: '60601', latitude: 41.8781, longitude: -87.6298, industrial_score: 0.9, kma: 'CHI' },
  { city: 'Atlanta', state: 'GA', zip: '30303', latitude: 33.7490, longitude: -84.3880, industrial_score: 0.85, kma: 'ATL' },
  { city: 'Dallas', state: 'TX', zip: '75201', latitude: 32.7767, longitude: -96.7970, industrial_score: 0.88, kma: 'DAL' },
  { city: 'Houston', state: 'TX', zip: '77002', latitude: 29.7604, longitude: -95.3698, industrial_score: 0.92, kma: 'HOU' },
  { city: 'Los Angeles', state: 'CA', zip: '90012', latitude: 34.0522, longitude: -118.2437, industrial_score: 0.95, kma: 'LAX' },
  { city: 'Phoenix', state: 'AZ', zip: '85004', latitude: 33.4484, longitude: -112.0740, industrial_score: 0.82, kma: 'PHX' },
  
  // Chicago Area
  { city: 'Oak Park', state: 'IL', zip: '60302', latitude: 41.8850, longitude: -87.7845, industrial_score: 0.75, kma: 'CHI' },
  { city: 'Evanston', state: 'IL', zip: '60201', latitude: 42.0451, longitude: -87.6877, industrial_score: 0.7, kma: 'CHI' },
  { city: 'Cicero', state: 'IL', zip: '60804', latitude: 41.8456, longitude: -87.7539, industrial_score: 0.85, kma: 'CHI' },
  { city: 'Hammond', state: 'IN', zip: '46320', latitude: 41.5833, longitude: -87.5000, industrial_score: 0.88, kma: 'CHI' },
  
  // Mountain Region
  { city: 'Salt Lake City', state: 'UT', zip: '84111', latitude: 40.7608, longitude: -111.8910, industrial_score: 0.78, kma: 'SLC' },
  { city: 'Bozeman', state: 'MT', zip: '59715', latitude: 45.6770, longitude: -111.0429, industrial_score: 0.65, kma: 'BZN' },
  { city: 'Ogden', state: 'UT', zip: '84401', latitude: 41.2230, longitude: -111.9738, industrial_score: 0.72, kma: 'SLC' },
  { city: 'Provo', state: 'UT', zip: '84601', latitude: 40.2338, longitude: -111.6585, industrial_score: 0.7, kma: 'SLC' },
  
  // Industrial Corridor
  { city: 'Pittsburgh', state: 'PA', zip: '15222', latitude: 40.4406, longitude: -79.9959, industrial_score: 0.95, kma: 'PIT' },
  { city: 'Cleveland', state: 'OH', zip: '44113', latitude: 41.4995, longitude: -81.6954, industrial_score: 0.92, kma: 'CLE' },
  { city: 'Akron', state: 'OH', zip: '44308', latitude: 41.0814, longitude: -81.5190, industrial_score: 0.88, kma: 'CLE' },
  { city: 'Youngstown', state: 'OH', zip: '44503', latitude: 41.0998, longitude: -80.6495, industrial_score: 0.85, kma: 'YNG' }
];

export default TEST_CITIES;
