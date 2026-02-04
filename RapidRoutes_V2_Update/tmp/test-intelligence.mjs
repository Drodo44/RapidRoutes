#!/usr/bin/env node
// Quick test of intelligence system after postal_code fix

import { generateGeographicCrawlPairs } from '../lib/geographicCrawl.js';

async function testIntelligence() {
  console.log('Testing intelligence system with sample data...');
  
  const testLane = {
    origin: { city: 'Atlanta', state: 'GA' },
    destination: { city: 'Chicago', state: 'IL' }
  };
  
  try {
    console.log(`Testing: ${testLane.origin.city}, ${testLane.origin.state} → ${testLane.destination.city}, ${testLane.destination.state}`);
    
    const pairs = await generateGeographicCrawlPairs({
      origin: testLane.origin,
      destination: testLane.destination,
      equipment: 'FD',
      preferFillTo10: true
    });
    
    console.log(`Intelligence generated ${pairs.length} city pairs`);
    
    if (pairs.length > 0) {
      console.log('Sample pairs:');
      pairs.slice(0, 3).forEach((pair, i) => {
        console.log(`  ${i + 1}: ${pair.origin.city}, ${pair.origin.state} → ${pair.destination.city}, ${pair.destination.state}`);
      });
      console.log('✅ Intelligence system working correctly');
    } else {
      console.log('❌ Intelligence system not generating pairs');
    }
    
  } catch (error) {
    console.error('❌ Intelligence system error:', error.message);
  }
}

testIntelligence().catch(console.error);
