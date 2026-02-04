// test-partial-destination.js
// Test script to verify that partial destination data validation works correctly

const fetch = require('node-fetch');

// Helper function for coloring console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

// Base test lane data
const baseLane = {
  origin_city: "Columbus",
  origin_state: "OH",
  equipment_code: "V",
  weight_lbs: 40000,
  length_ft: 53,
  pickup_earliest: new Date().toISOString(),
  pickup_latest: new Date(Date.now() + 86400000).toISOString(),  // Tomorrow
  full_partial: "Full",
  commodity: "General merchandise",
};

// Test scenarios
const scenarios = [
  {
    name: "Complete data (both city and state)",
    lane: {
      ...baseLane,
      dest_city: "Chicago",
      dest_state: "IL"
    },
    expectSuccess: true
  },
  {
    name: "City only (no state)",
    lane: {
      ...baseLane,
      dest_city: "Chicago",
      dest_state: ""  // Empty string
    },
    expectSuccess: true
  },
  {
    name: "State only (no city)",
    lane: {
      ...baseLane,
      dest_city: "",  // Empty string
      dest_state: "IL"
    },
    expectSuccess: true
  },
  {
    name: "Missing both city and state",
    lane: {
      ...baseLane,
      dest_city: "",
      dest_state: ""
    },
    expectSuccess: false
  }
];

// Run all test scenarios
async function runTests() {
  console.log(`${colors.cyan}===== Testing Partial Destination Validation =====\n${colors.reset}`);
  
  const results = [];
  
  for (const scenario of scenarios) {
    console.log(`${colors.yellow}Testing: ${scenario.name}${colors.reset}`);
    console.log(`  Lane data: ${JSON.stringify(scenario.lane)}`);
    
    try {
      // Try to create the lane
      const createResponse = await fetch('http://localhost:3000/api/lanes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer YOUR_AUTH_TOKEN'  // Replace with a valid token
        },
        body: JSON.stringify(scenario.lane)
      });
      
      const createData = await createResponse.json();
      const success = createResponse.ok;
      
      // Record result
      results.push({
        scenario: scenario.name,
        expectedSuccess: scenario.expectSuccess,
        actualSuccess: success,
        statusCode: createResponse.status,
        response: createData
      });
      
      // Log the result
      if (success === scenario.expectSuccess) {
        console.log(`  ${colors.green}✓ Test passed - Got ${success ? 'success' : 'failure'} as expected${colors.reset}`);
      } else {
        console.log(`  ${colors.red}✗ Test failed - Expected ${scenario.expectSuccess ? 'success' : 'failure'} but got ${success ? 'success' : 'failure'}${colors.reset}`);
      }
      console.log(`  Status: ${createResponse.status} ${createResponse.statusText}`);
      console.log(`  Response: ${JSON.stringify(createData, null, 2)}\n`);
    } catch (error) {
      console.error(`  ${colors.red}✗ Test error: ${error.message}${colors.reset}\n`);
      results.push({
        scenario: scenario.name,
        error: error.message
      });
    }
  }
  
  // Summary
  console.log(`${colors.cyan}===== Test Summary =====\n${colors.reset}`);
  
  const passed = results.filter(r => r.expectedSuccess === r.actualSuccess).length;
  const failed = results.length - passed;
  
  console.log(`${colors.yellow}Total tests: ${results.length}${colors.reset}`);
  console.log(`${colors.green}Passed: ${passed}${colors.reset}`);
  console.log(`${colors.red}Failed: ${failed}${colors.reset}`);
  
  if (failed === 0) {
    console.log(`\n${colors.green}All tests passed! Partial destination validation is working correctly.${colors.reset}`);
  } else {
    console.log(`\n${colors.red}Some tests failed. Check the output above for details.${colors.reset}`);
  }
}

// Run the tests
runTests().catch(error => {
  console.error(`${colors.red}Error running tests: ${error.message}${colors.reset}`);
});