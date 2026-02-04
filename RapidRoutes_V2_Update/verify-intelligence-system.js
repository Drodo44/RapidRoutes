// verify-intelligence-system.js
// Comprehensive verification of the intelligence pairing system

import { adminSupabase as supabase } from './utils/supabaseClient.js';

const TEST_CASES = [
  {
    name: 'Atlanta to Chicago',
    origin: { city: 'Atlanta', state: 'GA', zip: '30303' },
    destination: { city: 'Chicago', state: 'IL', zip: '60601' }
  },
  {
    name: 'New York to Los Angeles',
    origin: { city: 'New York', state: 'NY', zip: '10001' },
    destination: { city: 'Los Angeles', state: 'CA', zip: '90001' }
  },
  {
    name: 'Dallas to Miami',
    origin: { city: 'Dallas', state: 'TX', zip: '75201' },
    destination: { city: 'Miami', state: 'FL', zip: '33101' }
  }
];

async function verifyIntelligenceSystem() {
  console.log('🔍 INTELLIGENCE SYSTEM VERIFICATION');
  console.log('==================================\n');
  
  try {
    // Step 1: Check database function
    await verifyDatabaseFunction();
    
    // Step 2: Check API without making HTTP requests (direct call)
    await verifyApiDirectly();
    
    // Step 3: Test with sample lanes
    for (const testCase of TEST_CASES) {
      await testWithLane(testCase);
    }
    
    console.log('\n✅ VERIFICATION COMPLETE');
    
  } catch (error) {
    console.error('\n❌ VERIFICATION FAILED:', error);
  }
}

async function verifyDatabaseFunction() {
  console.log('STEP 1: Verifying Database Function');
  console.log('----------------------------------');
  
  // Test with Atlanta coordinates
  const lat = 33.749;
  const lng = -84.388;
  
  try {
    // Test coordinate-based function
    console.log('Testing coordinate-based lookup...');
    const { data: cities, error } = await supabase.rpc(
      'find_cities_within_radius',
      {
        lat_param: lat,
        lng_param: lng,
        radius_miles: 75
      }
    );
    
    if (error) {
      console.error('❌ Database function error:', error);
      throw error;
    }
    
    console.log(`✅ Found ${cities.length} cities within 75 miles of Atlanta coordinates`);
    console.log('First 3 cities:', cities.slice(0, 3).map(c => 
      `${c.city}, ${c.state_or_province} (${c.distance_miles?.toFixed(1) || 'unknown'}mi)`
    ).join(', '));
    
    // Test city-based function if available
    try {
      console.log('\nTesting city-based lookup...');
      const { data: citiesByName, error: nameError } = await supabase.rpc(
        'find_cities_within_radius',
        {
          p_city: 'Atlanta',
          p_state: 'GA',
          p_radius_miles: 75
        }
      );
      
      if (nameError) {
        console.warn('⚠️ City-based lookup not available:', nameError);
      } else {
        console.log(`✅ Found ${citiesByName.length} cities within 75 miles of Atlanta by name`);
        console.log('First 3 cities:', citiesByName.slice(0, 3).map(c => 
          `${c.city}, ${c.state_or_province} (${c.distance_miles?.toFixed(1) || 'unknown'}mi)`
        ).join(', '));
      }
    } catch (err) {
      console.warn('⚠️ City-based lookup not available:', err);
    }
    
  } catch (error) {
    console.error('❌ Database function verification failed:', error);
    throw error;
  }
}

async function verifyApiDirectly() {
  console.log('\nSTEP 2: Verifying API Module Directly');
  console.log('----------------------------------');
  
  try {
    // Import the API handler
    const apiHandler = (await import('./pages/api/intelligence-pairing.js')).default;
    
    // Mock request and response objects
    const req = {
      method: 'POST',
      body: {
        origin_city: 'Atlanta',
        origin_state: 'GA',
        dest_city: 'Chicago',
        dest_state: 'IL',
        equipment_code: 'FD'
      },
      query: {}
    };
    
    const res = {
      status: (code) => {
        res.statusCode = code;
        return res;
      },
      json: (data) => {
        res.data = data;
        return res;
      },
      statusCode: 200,
      data: null
    };
    
    // Call the API handler
    console.log('Calling API handler directly...');
    await apiHandler(req, res);
    
    if (res.statusCode !== 200) {
      console.error(`❌ API returned status ${res.statusCode}`);
      console.error('Response:', res.data);
      throw new Error(`API returned status ${res.statusCode}`);
    }
    
    if (!res.data.success) {
      console.error('❌ API reported failure');
      console.error('Response:', res.data);
      throw new Error('API reported failure');
    }
    
    const pairs = res.data.pairs || res.data.cityPairs || [];
    console.log(`✅ API returned ${pairs.length} city pairs`);
    
    // Check KMAs
    if (pairs.length > 0) {
      const originKmas = new Set(pairs.filter(p => p.origin.kma_code).map(p => p.origin.kma_code));
      const destKmas = new Set(pairs.filter(p => p.destination.kma_code).map(p => p.destination.kma_code));
      
      console.log(`Found ${originKmas.size} unique origin KMAs and ${destKmas.size} unique destination KMAs`);
      
      if (originKmas.size < 6 || destKmas.size < 6) {
        console.warn('⚠️ Warning: Less than 6 unique KMAs found. This may cause issues with DAT CSV generation.');
      }
    }
    
  } catch (error) {
    console.error('❌ API verification failed:', error);
    throw error;
  }
}

async function testWithLane(testCase) {
  console.log(`\nTesting with ${testCase.name}`);
  console.log('----------------------------------');
  
  try {
    // Import the API handler
    const apiHandler = (await import('./pages/api/intelligence-pairing.js')).default;
    
    // Mock request and response objects
    const req = {
      method: 'POST',
      body: {
        lane: {
          origin_city: testCase.origin.city,
          origin_state: testCase.origin.state,
          origin_zip: testCase.origin.zip,
          dest_city: testCase.destination.city,
          dest_state: testCase.destination.state,
          dest_zip: testCase.destination.zip,
          equipment_code: 'FD',
          weight_lbs: 45000,
          length_ft: 48
        }
      },
      query: {}
    };
    
    const res = {
      status: (code) => {
        res.statusCode = code;
        return res;
      },
      json: (data) => {
        res.data = data;
        return res;
      },
      statusCode: 200,
      data: null
    };
    
    // Call the API handler
    await apiHandler(req, res);
    
    if (res.statusCode !== 200) {
      console.error(`❌ Test failed with status ${res.statusCode}`);
      console.error('Response:', res.data);
      return;
    }
    
    if (!res.data.success) {
      console.error('❌ Test reported failure');
      console.error('Response:', res.data);
      return;
    }
    
    const pairs = res.data.pairs || res.data.cityPairs || [];
    console.log(`✅ Generated ${pairs.length} city pairs`);
    
    // Check KMAs
    if (pairs.length > 0) {
      const originKmas = new Set(pairs.filter(p => p.origin.kma_code).map(p => p.origin.kma_code));
      const destKmas = new Set(pairs.filter(p => p.destination.kma_code).map(p => p.destination.kma_code));
      
      console.log(`Found ${originKmas.size} unique origin KMAs and ${destKmas.size} unique destination KMAs`);
      
      if (originKmas.size < 6 || destKmas.size < 6) {
        console.warn('⚠️ Warning: Less than 6 unique KMAs found. This may cause issues with DAT CSV generation.');
      } else {
        console.log('✅ KMA requirement satisfied');
      }
    }
    
  } catch (error) {
    console.error(`❌ Test with ${testCase.name} failed:`, error);
  }
}

// Run the verification
verifyIntelligenceSystem();