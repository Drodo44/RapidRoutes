// intelligence-verification.js
// Script to verify the intelligence pairing API is working after deployment

import fetch from 'node-fetch';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://rapid-routes.vercel.app';
const API_ENDPOINT = `${API_URL}/api/intelligence-pairing`;

async function verifyIntelligencePairingApi() {
  console.log('Starting intelligence pairing API verification...');
  console.log(`Using API endpoint: ${API_ENDPOINT}`);
  
  const testPayload = {
    origin_city: 'Cincinnati',
    origin_state: 'OH',
    origin_zip: '45201',
    dest_city: 'Chicago',
    dest_state: 'IL',
    dest_zip: '60601',
    equipment_code: 'V',
    weight_lbs: 40000,
    length_ft: 53,
    pickup_earliest: new Date().toISOString().split('T')[0], // Today's date
    pickup_latest: new Date(Date.now() + 86400000).toISOString().split('T')[0], // Tomorrow's date
    lane_id: 'test-verification-lane'
  };
  
  try {
    console.log('Sending test request with payload:', JSON.stringify(testPayload, null, 2));
    
    const response = await fetch(API_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testPayload)
    });
    
    console.log('API Response Status:', response.status);
    
    // Get the raw text first
    const responseText = await response.text();
    console.log('Raw API Response:', responseText);
    
    // Try to parse as JSON if possible
    let data;
    try {
      data = JSON.parse(responseText);
      console.log('API Response (parsed):', JSON.stringify(data, null, 2));
    } catch (jsonError) {
      console.log('Could not parse response as JSON:', jsonError.message);
      data = null;
    }
    
    if (data && data.success) {
      console.log('✅ API responded with success flag');
      
      if (data.pairs && Array.isArray(data.pairs) && data.pairs.length > 0) {
        console.log(`✅ API returned ${data.pairs.length} pairs`);
        console.log('Sample pair:', JSON.stringify(data.pairs[0], null, 2));
      } else {
        console.log('⚠️ API returned success but no pairs');
        console.log('This is expected with the minimal version of the API');
      }
      
      console.log('Processing time:', data.processingTimeMs || 'Not available', 'ms');
    } else if (data) {
      console.log('❌ API responded with success=false');
      console.log('Error message:', data.error || 'No error message provided');
    }
    
  } catch (error) {
    console.error('❌ Error during API verification:', error);
  }
}

// Run the verification
verifyIntelligencePairingApi();