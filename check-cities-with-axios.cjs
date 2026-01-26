// check-cities-with-axios.cjs
// Use Axios to check cities directly against Supabase

const axios = require('axios');
require('dotenv').config();

// Cities to check
const citiesToCheck = [
  { city: 'Pasco', state: 'WA' },
  { city: 'Vancouver', state: 'WA' },
  { city: 'Russellville', state: 'AR' },
  { city: 'Frisco', state: 'TX' }
];

// Initialize Supabase REST client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials. Please check your .env file.');
  process.exit(1);
}

console.log(`Using Supabase URL: ${supabaseUrl}`);

// Check a single city
async function checkCity(city, state) {
  try {
    console.log(`Checking ${city}, ${state}...`);
    
    // Create query URL
    const url = `${supabaseUrl}/rest/v1/cities`;
    
    // Make request to Supabase REST API
    const response = await axios({
      method: 'GET',
      url,
      params: {
        city: `ilike.${city}`,
        state_or_province: `eq.${state}`,
        select: '*'
      },
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`
      }
    });
    
    // Check if any results
    if (!response.data || response.data.length === 0) {
      console.log(`❌ Not found: ${city}, ${state}`);
      return { found: false, city, state };
    } else {
      console.log(`✅ Found: ${city}, ${state}`);
      console.log(`  KMA Code: ${response.data[0].kma_code || 'N/A'}`);
      console.log(`  DB Name: ${response.data[0].city}`);
      return { found: true, city, state, data: response.data[0] };
    }
  } catch (error) {
    console.error(`Error checking ${city}, ${state}:`, error.message);
    if (error.response) {
      console.error('  Status:', error.response.status);
      console.error('  Data:', error.response.data);
    }
    return { found: false, city, state, error: error.message };
  }
}

// Check all cities
async function checkAllCities() {
  console.log('Checking cities in database...\n');
  
  const results = [];
  
  for (const cityData of citiesToCheck) {
    const result = await checkCity(cityData.city, cityData.state);
    results.push(result);
  }
  
  const foundCities = results.filter(r => r.found);
  const missingCities = results.filter(r => !r.found);
  
  // Print summary
  console.log('\n=== Summary ===');
  console.log(`Cities found: ${foundCities.length}`);
  console.log(`Cities missing: ${missingCities.length}`);
  
  // Print missing cities
  if (missingCities.length > 0) {
    console.log('\n=== Missing Cities ===');
    missingCities.forEach(({ city, state }) => {
      console.log(`${city}, ${state}`);
    });
  }
}

// Run the check
checkAllCities()
  .catch(console.error);