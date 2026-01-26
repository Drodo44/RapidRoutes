#!/usr/bin/env node
/**
 * Simplified RapidRoutes Intelligence API Test
 * Tests the non-authenticated test endpoint
 */

import fetch from 'node-fetch';
import fs from 'fs/promises';

// Test configuration
const API_URL = 'https://rapid-routes.vercel.app/api/test-intelligence-pairing';
const REPORT_PATH = '/workspaces/RapidRoutes/PRODUCTION_HEALTH.md';

// Test lanes
const TEST_LANES = [
  {
    name: "Chicago to Atlanta (Flatbed)",
    data: {
      originCity: "Chicago",
      originState: "IL",
      destCity: "Atlanta", 
      destState: "GA",
      equipmentCode: "FD"
    }
  },
  {
    name: "Los Angeles to Dallas (Van)",
    data: {
      originCity: "Los Angeles",
      originState: "CA",
      destCity: "Dallas", 
      destState: "TX",
      equipmentCode: "V"
    }
  },
  {
    name: "New York to Miami (Reefer)",
    data: {
      originCity: "New York",
      originState: "NY",
      destCity: "Miami", 
      destState: "FL",
      equipmentCode: "R"
    }
  }
];

// Count unique KMAs in the response
function countUniqueKmas(pairs) {
  if (!pairs || !Array.isArray(pairs)) return { uniqueCount: 0, kmas: [] };
  
  const allKmas = new Set();
  
  pairs.forEach(pair => {
    // Handle different formats of KMA codes in response
    const originKma = pair.origin?.kma_code || pair.originKma;
    const destKma = pair.destination?.kma_code || pair.destKma;
    
    if (originKma) allKmas.add(originKma);
    if (destKma) allKmas.add(destKma);
  });
  
  return {
    uniqueCount: allKmas.size,
    kmas: Array.from(allKmas)
  };
}

// Test a single lane
async function testLane(lane) {
  console.log(`\n🚚 Testing lane: ${lane.name}`);
  
  try {
    console.log('📡 Sending request...');
    const startTime = Date.now();
    
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(lane.data)
    });
    
    const responseTime = Date.now() - startTime;
    console.log(`⏱️ Response received in ${responseTime}ms with status ${response.status}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ API error: ${response.status} ${response.statusText}`);
      console.error(`Error details: ${errorText}`);
      return {
        name: lane.name,
        success: false,
        status: response.status,
        error: errorText,
        responseTime
      };
    }
    
    const data = await response.json();
    
    // Verify pairs array exists
    if (!data.pairs || !Array.isArray(data.pairs)) {
      console.error('❌ Response missing pairs array');
      return {
        name: lane.name,
        success: false,
        error: 'Invalid response format: missing pairs array',
        responseTime
      };
    }
    
    // Count KMAs and analyze response
    const kmaInfo = countUniqueKmas(data.pairs);
    const pairsCount = data.pairs.length;
    
    console.log(`✅ Success! Received ${pairsCount} pairs with ${kmaInfo.uniqueCount} unique KMAs`);
    console.log(`KMA codes: ${kmaInfo.kmas.join(', ')}`);
    
    // Check KMA diversity requirement
    const meetsKmaRequirement = kmaInfo.uniqueCount >= 6;
    if (meetsKmaRequirement) {
      console.log('✅ KMA diversity requirement met');
    } else {
      console.log(`⚠️ KMA diversity below requirement: ${kmaInfo.uniqueCount}/6`);
    }
    
    return {
      name: lane.name,
      success: true,
      status: response.status,
      responseTime,
      pairsCount,
      kmaCount: kmaInfo.uniqueCount,
      kmas: kmaInfo.kmas,
      meetsRequirement: meetsKmaRequirement
    };
  } catch (error) {
    console.error(`❌ Error testing lane: ${error.message}`);
    return {
      name: lane.name,
      success: false,
      error: error.message
    };
  }
}

// Main function
async function main() {
  console.log('\n🔍 RAPIDROUTES INTELLIGENCE API VERIFICATION');
  console.log('==========================================');
  console.log(`📆 Date: ${new Date().toISOString()}`);
  console.log(`🌐 Testing API: ${API_URL}`);
  
  // Test each lane
  const results = [];
  let allSuccessful = true;
  let allMeetRequirement = true;
  
  for (const lane of TEST_LANES) {
    const result = await testLane(lane);
    results.push(result);
    
    if (!result.success) {
      allSuccessful = false;
    } else if (!result.meetsRequirement) {
      allMeetRequirement = false;
    }
  }
  
  // Calculate statistics
  const successfulTests = results.filter(r => r.success);
  const meetRequirementTests = results.filter(r => r.success && r.meetsRequirement);
  const avgResponseTime = successfulTests.length > 0
    ? Math.round(successfulTests.reduce((sum, r) => sum + r.responseTime, 0) / successfulTests.length)
    : 0;
  
  // Display summary
  console.log('\n📊 VERIFICATION SUMMARY:');
  console.log('---------------------');
  
  results.forEach(result => {
    if (result.success) {
      const requirementIcon = result.meetsRequirement ? '✅' : '⚠️';
      console.log(`${requirementIcon} ${result.name}: ${result.pairsCount} pairs, ${result.kmaCount} KMAs in ${result.responseTime}ms`);
    } else {
      console.log(`❌ FAIL ${result.name}: ${result.error}`);
    }
  });
  
  console.log('\n📈 STATISTICS:');
  console.log(`- API calls successful: ${successfulTests.length}/${results.length} (${Math.round(successfulTests.length/results.length*100)}%)`);
  console.log(`- KMA requirement met: ${meetRequirementTests.length}/${results.length} (${Math.round(meetRequirementTests.length/results.length*100)}%)`);
  console.log(`- Average response time: ${avgResponseTime}ms`);
  
  // Overall result
  const overallIcon = allSuccessful ? (allMeetRequirement ? '✅' : '⚠️') : '❌';
  let overallStatus = allSuccessful 
    ? (allMeetRequirement ? 'SUCCESS' : 'WARNING - Some lanes have insufficient KMA diversity')
    : 'FAILURE - Some API calls failed completely';
  
  console.log(`\n❓ OVERALL RESULT: ${overallIcon} ${overallStatus}`);
  
  // Save results to file
  await fs.writeFile(
    '/workspaces/RapidRoutes/verification-results.json',
    JSON.stringify({ 
      timestamp: new Date().toISOString(),
      results,
      statistics: {
        successful: successfulTests.length,
        meetRequirement: meetRequirementTests.length,
        total: results.length,
        averageResponseTime: avgResponseTime
      },
      overall: {
        success: allSuccessful,
        meetsRequirements: allMeetRequirement,
        status: overallStatus
      }
    }, null, 2)
  );
  
  console.log('\n📄 Detailed results saved to verification-results.json');

  // Generate PRODUCTION_HEALTH.md report
  const healthReport = `# RapidRoutes Production Health Report

## Intelligence API Verification
**Date:** ${new Date().toISOString()}
**Status:** ${overallIcon} ${overallStatus}

### Test Results

${results.map(r => {
  if (r.success) {
    const icon = r.meetsRequirement ? '✅' : '⚠️';
    return `${icon} **${r.name}**
  - Pairs Generated: ${r.pairsCount}
  - Unique KMAs: ${r.kmaCount}/6 ${r.meetsRequirement ? '(PASS)' : '(WARN)'}
  - Response Time: ${r.responseTime}ms
  - KMA Codes: ${r.kmas.join(', ')}`;
  } else {
    return `❌ **${r.name}**
  - Status: FAILED
  - Error: ${r.error}`;
  }
}).join('\n\n')}

### API Performance

- **Success Rate:** ${Math.round(successfulTests.length/results.length*100)}% (${successfulTests.length}/${results.length})
- **KMA Requirement Compliance:** ${Math.round(meetRequirementTests.length/results.length*100)}% (${meetRequirementTests.length}/${results.length})
- **Average Response Time:** ${avgResponseTime}ms

### Business Rule Verification

- **KMA Diversity (≥6 unique KMAs):** ${allMeetRequirement ? '✅ PASS' : '⚠️ WARN'}
- **Geographic Crawl Functionality:** ${allSuccessful ? '✅ PASS' : '❌ FAIL'}

---
*Generated automatically by RapidRoutes verification system*
`;

  await fs.writeFile(REPORT_PATH, healthReport);
  console.log(`\n📋 Production health report generated at ${REPORT_PATH}`);
  
  // Exit with appropriate code
  process.exit(allSuccessful ? (allMeetRequirement ? 0 : 1) : 2);
}

// Execute main function
main();