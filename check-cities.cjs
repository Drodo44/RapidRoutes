// check-cities.cjs
// CommonJS script to check cities in database

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Cities to check
const citiesToCheck = [
  { city: 'Pasco', state: 'WA' },
  { city: 'Vancouver', state: 'WA' },
  { city: 'Russellville', state: 'AR' },
  { city: 'Frisco', state: 'TX' }
];

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// Check each city
async function checkCities() {
  console.log('Checking cities in database...\n');
  
  const missingCities = [];
  const foundCities = [];
  
  for (const { city, state } of citiesToCheck) {
    try {
      console.log(`Checking ${city}, ${state}...`);
      
      const { data, error } = await supabase
        .from('cities')
        .select('*')
        .ilike('city', city)
        .eq('state_or_province', state);
      
      if (error) {
        throw error;
      }
      
      if (!data || data.length === 0) {
        console.log(`❌ Not found: ${city}, ${state}`);
        missingCities.push({ city, state });
      } else {
        console.log(`✅ Found: ${city}, ${state}`);
        console.log(`  KMA Code: ${data[0].kma_code || 'N/A'}`);
        foundCities.push(data[0]);
      }
    } catch (error) {
      console.error(`Error checking ${city}, ${state}:`, error.message);
    }
  }
  
  // Summary
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
checkCities()
  .catch(console.error);