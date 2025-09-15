import fetch from 'node-fetch';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const HERE_API_KEY = process.env.HERE_API_KEY;

/**
 * Sanitize and format query string for HERE.com API
 */
function sanitizeHereQuery(city, state) {
  let cleanCity = (city || '').toString().trim()
    .replace(/undefined/gi, '')
    .replace(/null/gi, '')
    .replace(/[^\w\s,-]/g, '')
    .replace(/\s+/g, ' ')
    .replace(/,,+/g, ',')
    .trim();
  
  let cleanState = (state || '').toString().trim()
    .replace(/undefined/gi, '')
    .replace(/null/gi, '')
    .replace(/[^\w\s,-]/g, '')
    .trim();
  
  if (cleanState && cleanState.toLowerCase() !== 'undefined') {
    return `${cleanCity}, ${cleanState}, USA`;
  } else {
    return `${cleanCity}, USA`;
  }
}

/**
 * Test HERE.com Discover API directly
 */
async function testHereDiscoverAPI(query, limit = 10) {
  try {
    const encodedQuery = encodeURIComponent(query);
    const url = `https://discover.search.hereapi.com/v1/discover?q=${encodedQuery}&limit=${Math.min(limit, 100)}&apikey=${HERE_API_KEY}`;
    
    console.log(`🌐 Testing HERE.com Discover API`);
    console.log(`└─ Query: "${query}"`);
    console.log(`└─ URL: ${url.replace(HERE_API_KEY, 'API_KEY_HIDDEN')}`);
    
    const response = await fetch(url);
    
    console.log(`└─ Response Status: ${response.status} ${response.statusText}`);
    
    if (!response.ok) {
      console.error(`❌ API Error: ${response.status} ${response.statusText}`);
      return [];
    }
    
    const data = await response.json();
    
    if (!data.items || data.items.length === 0) {
      console.log(`📭 No results found`);
      return [];
    }
    
    console.log(`📥 Found ${data.items.length} results`);
    
    const cities = data.items.map(item => ({
      city: item.address?.city || item.title?.split(',')[0] || 'Unknown',
      state: item.address?.stateCode || item.address?.state || null,
      latitude: item.position?.lat || 0,
      longitude: item.position?.lng || 0,
      zip: item.address?.postalCode || null
    }));
    
    // Show first few results
    console.log(`\n📋 Sample Results (first 5):`);
    cities.slice(0, 5).forEach((city, idx) => {
      console.log(`${idx + 1}. ${city.city}, ${city.state} (${city.latitude}, ${city.longitude})`);
    });
    
    return cities;
    
  } catch (error) {
    console.error(`❌ API call failed:`, error.message);
    return [];
  }
}

async function runHereAPITests() {
  console.log('🧪 Testing HERE.com API Integration');
  console.log('===================================\n');
  
  if (!HERE_API_KEY) {
    console.error('❌ HERE_API_KEY not found in environment');
    return;
  }
  
  console.log('✅ HERE_API_KEY configured');
  
  const testCases = [
    { city: "Bakersfield", state: "CA" },
    { city: "Fresno", state: "CA" },
    { city: "Phoenix", state: "AZ" },
    { city: "InvalidCity", state: null }  // Test null state handling
  ];
  
  for (const testCase of testCases) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`🎯 Testing: ${testCase.city}, ${testCase.state || 'null'}`);
    console.log(`${'='.repeat(60)}`);
    
    const sanitizedQuery = sanitizeHereQuery(testCase.city, testCase.state);
    console.log(`📝 Sanitized Query: "${sanitizedQuery}"`);
    
    await testHereDiscoverAPI(sanitizedQuery, 10);
    
    // Small delay to respect rate limits
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  console.log('\n✅ HERE.com API Test Complete');
}

runHereAPITests().catch(console.error);
