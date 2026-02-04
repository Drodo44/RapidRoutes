// test-intelligence.js
// Set up test environment
if (!process.env.NODE_ENV) process.env.NODE_ENV = 'test';
if (!process.env.NEXT_PUBLIC_SUPABASE_URL) process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://localhost:54321';
if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';
if (!process.env.SUPABASE_SERVICE_ROLE_KEY) process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-key';

import { FreightIntelligence } from './lib/FreightIntelligence.js';

async function testSmallCityLane() {
  console.log('Testing intelligence system with smaller cities...');
  
  const fi = new FreightIntelligence();
  
  try {
    const result = await fi.generatePairs({
      origin: { city: 'Mount Holly', state: 'NJ' },
      destination: { city: 'Harrison', state: 'OH' },
      equipment: 'V',
      count: 22
    });
    
    console.log('\nGenerated pairs:');
    console.log(JSON.stringify(result, null, 2));
    
    // Analyze KMA diversity
    const originKMAs = new Set();
    const destKMAs = new Set();
    
    result.forEach(pair => {
      originKMAs.add(pair.origin.kma_code);
      destKMAs.add(pair.destination.kma_code);
    });
    
    console.log('\nDiversity Analysis:');
    console.log(`Origin KMAs: ${originKMAs.size} unique`);
    console.log(`Destination KMAs: ${destKMAs.size} unique`);
    
  } catch (error) {
    console.error('Test failed:', error);
  }
}

testSmallCityLane();