// Simplified direct API test script
// This script makes a direct request to the auth-check endpoint

import fetch from 'node-fetch';

const API_URL = 'https://rapid-routes.vercel.app/api/auth-check';

(async () => {
  try {
    console.log(`🔍 Testing endpoint: ${API_URL}`);
    
    const response = await fetch(API_URL, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    const data = await response.json();
    console.log('Response:', JSON.stringify(data, null, 2));
    
    // Check environment variables
    console.log('\nEnvironment Variables Status:');
    for (const [key, value] of Object.entries(data.env)) {
      console.log(`- ${key}: ${value ? '✅ Present' : '❌ Missing'}`);
    }
    
    console.log(`\nSupabase URL: ${data.supabaseUrl}`);
    console.log(`Timestamp: ${data.timestamp}`);
    
  } catch (error) {
    console.error('Error:', error);
  }
})();