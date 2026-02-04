#!/usr/bin/env node
/**
 * Direct Library Test for Geographic Crawl
 * Tests the geographicCrawl function directly
 */

import { generateGeographicCrawlPairs } from './lib/geographicCrawl.js';

// Test cases that should have good KMA diversity
const TEST_CASES = [
  {
    name: 'Chicago to Atlanta',
    origin: {
      city: 'Chicago',
      state: 'IL',
      latitude: 41.8781,
      longitude: -87.6298
    },
    dest: {
      city: 'Atlanta',
      state: 'GA',
      latitude: 33.7488,
      longitude: -84.3877
    },
    equipmentCode: 'FD'
  },
  {
    name: 'Los Angeles to Dallas',
    origin: {
      city: 'Los Angeles',
      state: 'CA',
      latitude: 34.0522,
      longitude: -118.2437
    },
    dest: {
      city: 'Dallas',
      state: 'TX',
      latitude: 32.7767,
      longitude: -96.7970
    },
    equipmentCode: 'V'
  }
];

// Test directly with the library function
async function runTest() {
  console.log('🧪 DIRECT LIBRARY TEST: Geographic Crawl\n');
  
  for (const testCase of TEST_CASES) {
    try {
      console.log(`\n📍 Testing ${testCase.name}`);
      
      const result = await generateGeographicCrawlPairs(
        testCase.origin,
        testCase.dest,
        testCase.equipmentCode
      );
      
      // Count unique KMAs
      const kmas = new Set();
      result.pairs.forEach(pair => {
        if (pair.origin?.kma_code) kmas.add(pair.origin.kma_code);
        if (pair.destination?.kma_code) kmas.add(pair.destination.kma_code);
      });
      
      console.log(`✅ SUCCESS: Generated ${result.pairs.length} pairs with ${kmas.size} unique KMAs`);
      console.log(`🔍 KMAs: ${[...kmas].join(', ')}`);
      console.log(`📊 Meets requirement: ${kmas.size >= 6 ? 'YES' : 'NO'}`);
    } catch (error) {
      console.log(`❌ TEST FAILED: ${error.message}`);
    }
  }
}

runTest().catch(console.error);