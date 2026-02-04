// verify-intelligence-system.mjs
// Server-side verification script for the intelligence-pairing API

import fetch from 'node-fetch';
import fs from 'fs/promises';

// API configuration
const API_URL = 'https://rapid-routes.vercel.app/api/server-api-verification';

async function verifyIntelligenceAPI() {
  console.log(`🚀 Starting server-side API verification: ${API_URL}`);
  console.log(`📅 Timestamp: ${new Date().toISOString()}`);
  
  try {
    // Make request to the server-side verification endpoint
    console.log('Sending GET request to server-side verification endpoint...');
    const response = await fetch(API_URL);
    
    if (!response.ok) {
      console.error(`❌ API error: ${response.status}`);
      try {
        const error = await response.json();
        console.error('Error details:', JSON.stringify(error, null, 2));
      } catch (e) {
        const errorText = await response.text();
        console.error('Error text:', errorText);
      }
      
      // Check if it's a 404 error (endpoint doesn't exist yet)
      if (response.status === 404) {
        console.error('\n❌ The server-api-verification endpoint does not exist in production.');
        console.error('This endpoint needs to be deployed first before running this verification.');
        console.error('Please deploy the application with the new endpoint and try again.');
      }
      
      return false;
    }
    
    const data = await response.json();
    
    // Save the complete response to a file
    await fs.writeFile('verification-response.json', JSON.stringify(data, null, 2));
    console.log('✅ Full response saved to verification-response.json');
    
    // Display summary
    console.log('\n📊 VERIFICATION SUMMARY:');
    console.log('====================');
    console.log(`Total tests: ${data.totalTests}`);
    console.log(`Successful API calls: ${data.successfulTests}`);
    console.log(`Failed API calls: ${data.failedTests}`);
    console.log(`Tests meeting KMA requirements (≥5 unique KMAs): ${data.kmaRequirementsMet}`);
    
    if (data.kmaAnalysis) {
      console.log(`Average unique KMAs per test: ${data.kmaAnalysis.kmaAverage.toFixed(2)}`);
      console.log(`Total KMA distribution: ${data.kmaAnalysis.kmaDistribution}`);
    }
    
    // Display individual test results
    console.log('\n🔍 INDIVIDUAL TEST RESULTS:');
    if (data.results && Array.isArray(data.results)) {
      data.results.forEach((result, index) => {
        console.log(`\nTest #${index + 1}: ${result.lane.origin_city}, ${result.lane.origin_state} to ${result.lane.dest_city}, ${result.lane.dest_state}`);
        console.log(`Status: ${result.success ? '✅ SUCCESS' : '❌ FAILED'}`);
        if (result.matches) console.log(`Matches: ${result.matches}`);
        if (result.uniqueKmas) console.log(`Unique KMAs: ${result.uniqueKmas} ${result.hasEnoughKmas ? '✅' : '❌'}`);
        if (result.error) console.log(`Error: ${result.error}`);
      });
    }
    
    // Generate markdown report
    const report = generateMarkdownReport(data);
    await fs.writeFile('FINAL_LANE_VERIFICATION_REPORT.md', report);
    console.log('✅ Report generated: FINAL_LANE_VERIFICATION_REPORT.md');
    
    // Save text response for easy viewing
    const textSummary = generateTextSummary(data);
    await fs.writeFile('verification-response.txt', textSummary);
    console.log('✅ Text summary saved to verification-response.txt');
    
    const allPassed = data.successfulTests === data.totalTests && data.kmaRequirementsMet === data.totalTests;
    
    if (allPassed) {
      console.log('\n🎉 ALL TESTS PASSED: The intelligence-pairing API is functioning correctly');
    } else {
      console.log('\n⚠️ SOME TESTS FAILED: Review the detailed results for more information');
    }
    
    return allPassed;
  } catch (error) {
    console.error('❌ Verification failed:', error.message);
    return false;
  }
}

function generateTextSummary(data) {
  let summary = `RAPIDROUTES INTELLIGENCE API VERIFICATION
================================================
Timestamp: ${data.timestamp}

SUMMARY
-------
Total tests: ${data.totalTests}
Successful API calls: ${data.successfulTests}
Failed API calls: ${data.failedTests}
Tests meeting KMA requirements (≥5 unique KMAs): ${data.kmaRequirementsMet}
`;

  if (data.kmaAnalysis) {
    summary += `Average unique KMAs per test: ${data.kmaAnalysis.kmaAverage.toFixed(2)}
Total unique KMA distribution: ${data.kmaAnalysis.kmaDistribution}

KMA FREQUENCY (TOP 10)
---------------------
`;
    
    const sortedKmas = Object.entries(data.kmaAnalysis.kmaFrequency)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);
    
    sortedKmas.forEach(([kma, freq]) => {
      summary += `${kma}: ${freq}\n`;
    });
  }

  summary += `
INDIVIDUAL TEST RESULTS
----------------------
`;

  if (data.results && Array.isArray(data.results)) {
    data.results.forEach((result, index) => {
      const lane = result.lane;
      summary += `Test #${index + 1}: ${lane.origin_city}, ${lane.origin_state} to ${lane.dest_city}, ${lane.dest_state}
Status: ${result.success ? 'SUCCESS' : 'FAILED'}
${result.matches ? 'Matches: ' + result.matches : ''}
${result.uniqueKmas ? 'Unique KMAs: ' + result.uniqueKmas + (result.hasEnoughKmas ? ' (PASS)' : ' (FAIL)') : ''}
${result.error ? 'Error: ' + result.error : ''}

`;
    });
  }

  summary += `
CONCLUSION
---------
${data.successfulTests === data.totalTests && data.kmaRequirementsMet === data.totalTests 
  ? "The intelligence-pairing API is functioning correctly in production. All tests passed successfully and KMA diversity requirements are being met." 
  : "The intelligence-pairing API has issues that need to be addressed. See the test details for specific failures."}

${data.kmaRequirementsMet === data.totalTests
  ? "KMA diversity requirement is being met. All tested lane pairs returned at least 5 unique KMAs."
  : "KMA diversity requirement is not being met for all lane pairs. Some tests returned fewer than 5 unique KMAs."}
`;

  return summary;
}

function generateMarkdownReport(data) {
  const timestamp = new Date().toISOString();
  const allTestsPassed = data.successfulTests === data.totalTests;
  const allKmaRequirementsMet = data.kmaRequirementsMet === data.totalTests;
  const overallStatus = allTestsPassed && allKmaRequirementsMet ? '✅ PASSED' : '❌ FAILED';
  
  let report = `# RapidRoutes Intelligence API Verification Report

## Executive Summary

**Verification Date:** ${timestamp}
**Overall Status:** ${overallStatus}
**API Endpoint:** \`intelligence-pairing\`

The RapidRoutes Intelligence API has been verified for:
1. Authentication functionality
2. Lane pair generation
3. KMA (Key Market Area) diversity requirements (≥5 unique KMAs)
4. Response structure and data integrity

## Test Results

| Metric | Value | Status |
|--------|-------|--------|
| Total Tests | ${data.totalTests} | - |
| Successful API Calls | ${data.successfulTests} | ${data.successfulTests === data.totalTests ? '✅' : '❌'} |
| API Call Success Rate | ${((data.successfulTests / data.totalTests) * 100).toFixed(1)}% | - |
| Tests Meeting KMA Requirements | ${data.kmaRequirementsMet} | ${data.kmaRequirementsMet === data.totalTests ? '✅' : '❌'} |
| KMA Requirement Success Rate | ${((data.kmaRequirementsMet / data.totalTests) * 100).toFixed(1)}% | - |
`;

  if (data.kmaAnalysis) {
    report += `| Average Unique KMAs | ${data.kmaAnalysis.kmaAverage.toFixed(2)} | ${data.kmaAnalysis.kmaAverage >= 5 ? '✅' : '❌'} |
| Total Unique KMA Distribution | ${data.kmaAnalysis.kmaDistribution} | - |
`;
  }

  report += `
## Lane Test Details

`;

  if (data.results && Array.isArray(data.results)) {
    data.results.forEach((result, index) => {
      const lane = result.lane;
      const status = result.success ? (result.hasEnoughKmas ? '✅ PASS' : '⚠️ INSUFFICIENT KMAs') : '❌ FAIL';
      
      report += `### Test #${index + 1}: ${lane.origin_city}, ${lane.origin_state} to ${lane.dest_city}, ${lane.dest_state}

- **Status:** ${status}
- **API Response:** ${result.success ? 'Success' : 'Failed'}
- **Match Count:** ${result.matches || 'N/A'}
- **Unique KMAs:** ${result.uniqueKmas || 'N/A'}
- **KMA Requirement Met:** ${result.hasEnoughKmas ? 'Yes' : 'No'}
`;

      if (result.error) {
        report += `- **Error:** ${result.error}\n`;
      }
      
      if (result.matchDetails && result.matchDetails.length > 0) {
        report += `
#### Sample Matches:

`;
        result.matchDetails.slice(0, 3).forEach((match, i) => {
          report += `${i + 1}. **KMA:** ${match.kma_code || 'N/A'} (${match.kma_name || 'Unknown'})
   - City: ${match.city || 'N/A'}, ${match.state_or_province || 'N/A'}
   - Distance: ${match.distance_miles ? match.distance_miles.toFixed(1) + ' miles' : 'N/A'}
`;
        });
      }
      
      report += `\n`;
    });
  }

  report += `
## KMA Distribution Analysis

`;

  if (data.kmaAnalysis && data.kmaAnalysis.kmaFrequency) {
    const sortedKmas = Object.entries(data.kmaAnalysis.kmaFrequency)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);
    
    report += `### Top KMAs by Frequency

| KMA Code | Frequency |
|----------|-----------|
`;
    
    sortedKmas.forEach(([kma, freq]) => {
      report += `| ${kma} | ${freq} |\n`;
    });
    
    report += `\n*Note: Only showing top 10 KMAs*\n`;
  }
  
  report += `
## Conclusion

${allTestsPassed && allKmaRequirementsMet 
    ? "✅ **The intelligence-pairing API is functioning correctly in production.** All tests passed successfully and KMA diversity requirements are being met." 
    : "⚠️ **The intelligence-pairing API has issues that need to be addressed.** See the test details for specific failures."}

${data.kmaRequirementsMet === data.totalTests
    ? "✅ **KMA diversity requirement is being met.** All tested lane pairs returned at least 5 unique KMAs."
    : "❌ **KMA diversity requirement is not being met for all lane pairs.** Some tests returned fewer than 5 unique KMAs."}

## Recommendations

${allTestsPassed && allKmaRequirementsMet
    ? "- Continue monitoring the API for consistent performance\n- Consider expanding test coverage to include more diverse lane pairs\n- Implement regular automated testing to catch any regressions"
    : "- Address the failed tests and KMA diversity issues\n- Review the intelligence algorithm for potential improvements\n- Add monitoring for KMA diversity in production\n- Re-run verification after fixes are implemented"}

---

*Report generated automatically on ${timestamp}*
`;

  return report;
}

// Run the verification
verifyIntelligenceAPI();