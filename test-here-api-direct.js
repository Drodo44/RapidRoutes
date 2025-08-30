#!/usr/bin/env node

// Load environment variables
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

console.log('🔧 Direct HERE.com API Test');
console.log('============================\n');

// Test the HERE.com service directly
const { generateAlternativeCitiesWithHERE } = await import('./lib/hereVerificationService.js');

console.log('🌍 Testing HERE.com alternative city discovery:');
console.log('   Center: Atlanta, GA coordinates');
console.log('   Radius: 50 miles');
console.log('   Searching for cities...\n');

try {
  // Atlanta coordinates
  const atlantaLat = 33.7628;
  const atlantaLng = -84.422;
  
  const cities = await generateAlternativeCitiesWithHERE(atlantaLat, atlantaLng, 50, 10);
  
  console.log(`🎯 HERE.com Results: ${cities?.length || 0} cities found`);
  
  if (cities && cities.length > 0) {
    console.log('\n🏙️ Discovered Cities:');
    cities.slice(0, 5).forEach((city, i) => {
      console.log(`   ${i+1}. ${city.city}, ${city.state} (${city.zip || 'no zip'})`);
      console.log(`      📍 ${city.latitude}, ${city.longitude}`);
    });
    
    console.log('\n✅ HERE.com API is working correctly!');
    console.log('   The system can discover new cities and add them to the database');
  } else {
    console.log('\n⚠️ HERE.com returned no cities');
    console.log('   This could mean:');
    console.log('   • API call failed (check logs above)');
    console.log('   • No cities found in the specified radius');
    console.log('   • API response format changed');
  }
  
} catch (error) {
  console.error('\n❌ HERE.com API test failed:');
  console.error('   Error:', error.message);
  console.log('\n🔧 Troubleshooting:');
  console.log('   • Check HERE_API_KEY is valid');
  console.log('   • Check internet connection');
  console.log('   • Check API quotas');
}
