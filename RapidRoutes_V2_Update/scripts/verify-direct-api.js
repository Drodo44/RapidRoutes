/**
 * Direct API verification script
 * 
 * This script tests the intelligence-pairing API directly using the same payload
 * that works with curl, to verify the API endpoint is functioning correctly.
 */

import fetch from 'node-fetch';

async function testDirectApiCall() {
  console.log('🧪 Testing direct API call with known working payload...');
  
  const testPayload = {
    "origin_city": "Pasco",
    "origin_state": "WA",
    "dest_city": "Vancouver",
    "dest_state": "WA",
    "equipment_code": "FD"
  };
  
  console.log('📤 Sending payload:');
  console.log(JSON.stringify(testPayload, null, 2));
  
  try {
    const response = await fetch('https://rapid-routes.vercel.app/api/intelligence-pairing', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testPayload),
    });

    const status = response.status;
    console.log(`📥 Response status: ${status}`);
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Success! API returned data:');
      console.log(JSON.stringify(data, null, 2));
      
      // Log the structure for comparison with our adapter
      console.log('\n📋 Fields present in working request:');
      Object.keys(testPayload).forEach(key => {
        console.log(`- ${key}`);
      });
      
      return { success: true, data };
    } else {
      const errorText = await response.text();
      console.error(`❌ API error (${response.status}):`, errorText);
      return { success: false, error: errorText };
    }
  } catch (error) {
    console.error('❌ Network error:', error.message);
    return { success: false, error: error.message };
  }
}

// Run the test
testDirectApiCall()
  .then(result => {
    if (result.success) {
      console.log('\n✅ Direct API verification PASSED');
      console.log('Compare this working payload with what your adapter sends.');
    } else {
      console.log('\n❌ Direct API verification FAILED');
      console.log('The API might be having issues or the payload structure has changed.');
    }
  })
  .catch(err => {
    console.error('Script execution failed:', err);
  });