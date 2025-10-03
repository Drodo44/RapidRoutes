#!/usr/bin/env node
// Test the save API endpoint directly
import { config } from 'dotenv';

config({ path: '.env.local' });

const API_BASE = 'http://localhost:3000';

console.log('🧪 Testing Save City Choices API\n');

// Test data
const testPayload = {
  lane_id: 'd03fc3d1-8ef3-4597-9a90-3f3f3f3f3f3f', // Fitzgerald → Clinton
  origin_city: 'Fitzgerald',
  origin_state: 'GA',
  dest_city: 'Clinton',
  dest_state: 'SC',
  origin_chosen_cities: [
    { city: 'Fitzgerald', state_or_province: 'GA', kma_code: 'ATL', kma_name: 'Atlanta', miles: 0 },
    { city: 'Tifton', state_or_province: 'GA', kma_code: 'ATL', kma_name: 'Atlanta', miles: 25 }
  ],
  dest_chosen_cities: [
    { city: 'Clinton', state_or_province: 'SC', kma_code: 'GNV', kma_name: 'Greenville', miles: 0 },
    { city: 'Laurens', state_or_province: 'SC', kma_code: 'GNV', kma_name: 'Greenville', miles: 15 }
  ]
};

console.log('1️⃣  Sending test request to API...');
console.log('   Lane:', testPayload.origin_city, '→', testPayload.dest_city);
console.log('   Origin selections:', testPayload.origin_chosen_cities.length);
console.log('   Dest selections:', testPayload.dest_chosen_cities.length);

try {
  const response = await fetch(`${API_BASE}/api/save-city-choices`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(testPayload)
  });

  const data = await response.json();

  if (response.ok && data.ok) {
    console.log('\n✅ API Test Successful!');
    console.log('   RR Number:', data.rr_number);
    console.log('   Lane Status:', data.lane_status);
    console.log('   Data saved:', JSON.stringify(data.data, null, 2));
  } else {
    console.log('\n❌ API Test Failed');
    console.log('   Status:', response.status);
    console.log('   Error:', data.error);
  }

  // Test 2: Load saved choices
  console.log('\n2️⃣  Testing load saved choices...');
  const loadResponse = await fetch(`${API_BASE}/api/load-city-choices`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ lane_ids: [testPayload.lane_id] })
  });

  const loadData = await loadResponse.json();

  if (loadResponse.ok && loadData.ok) {
    console.log('✅ Load test successful!');
    console.log('   Found', loadData.count, 'saved choices');
    if (loadData.choices.length > 0) {
      const choice = loadData.choices[0];
      console.log('   RR Number:', choice.rr_number);
      console.log('   Origin cities:', choice.origin_chosen_cities?.length || 0);
      console.log('   Dest cities:', choice.dest_chosen_cities?.length || 0);
    }
  } else {
    console.log('❌ Load test failed');
    console.log('   Error:', loadData.error);
  }

} catch (error) {
  console.log('\n❌ Network Error:', error.message);
  console.log('\nMake sure the dev server is running:');
  console.log('   npm run dev');
}

console.log('\n✅ API Testing Complete!');
