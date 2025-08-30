require('dotenv').config({ path: '.env.local' });
console.log('🔍 HERE.com API Configuration Check');
console.log('====================================');
console.log('HERE_API_KEY configured:', !!process.env.HERE_API_KEY);
console.log('Key length:', process.env.HERE_API_KEY?.length || 'N/A');
if (process.env.HERE_API_KEY) {
  console.log('Key prefix:', process.env.HERE_API_KEY.substring(0, 10) + '...');
} else {
  console.log('❌ HERE_API_KEY is missing - this explains the city validation issues!');
}
