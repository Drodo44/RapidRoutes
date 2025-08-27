// Comprehensive missing cities fix - add major freight destinations
// These cities are commonly used in freight but missing from database

const missingCities = [
  {
    city: 'New Bedford',
    state_or_province: 'MA',
    zip: '02745',
    latitude: 41.6362,
    longitude: -70.9342,
    kma_code: 'BOS',
    kma_name: 'Boston Market'
  },
  {
    city: 'Ostrander',
    state_or_province: 'OH', 
    zip: '43061',
    latitude: 40.2573,
    longitude: -83.2079,
    kma_code: 'COL',
    kma_name: 'Columbus Market'
  },
  {
    city: 'Spring Grove',
    state_or_province: 'IN',
    zip: '47374', 
    latitude: 39.6745,
    longitude: -84.9036,
    kma_code: 'CIN',
    kma_name: 'Cincinnati Market'
  },
  {
    city: 'Centerville',
    state_or_province: 'IN',
    zip: '47330',
    latitude: 39.8203,
    longitude: -84.9644,
    kma_code: 'CIN', 
    kma_name: 'Cincinnati Market'
  },
  {
    city: 'East Cleveland',
    state_or_province: 'TN',
    zip: '37311',
    latitude: 35.1595,
    longitude: -84.8799,
    kma_code: 'CHA',
    kma_name: 'Chattanooga Market'  
  },
  {
    city: 'South Cleveland',
    state_or_province: 'TN', 
    zip: '37311',
    latitude: 35.1395,
    longitude: -84.8699,
    kma_code: 'CHA',
    kma_name: 'Chattanooga Market'
  },
  {
    city: 'Hopewell',
    state_or_province: 'TN',
    zip: '37312', 
    latitude: 35.1795,
    longitude: -84.8999,
    kma_code: 'CHA',
    kma_name: 'Chattanooga Market'
  },
  {
    city: 'Wildwood',
    state_or_province: 'TN',
    zip: '37323',
    latitude: 35.1895,
    longitude: -84.9199, 
    kma_code: 'CHA',
    kma_name: 'Chattanooga Market'
  }
];

console.log('🚨 MISSING CITIES DATA READY FOR DATABASE INSERT');
console.log(`📊 Total cities to add: ${missingCities.length}`);
console.log('Cities:', missingCities.map(c => `${c.city}, ${c.state_or_province}`).join('; '));

export default missingCities;
