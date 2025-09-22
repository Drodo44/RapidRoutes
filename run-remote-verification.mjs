// run-remote-verification.mjs
// Script to call the remote verification endpoint

import fetch from 'node-fetch';
import fs from 'fs/promises';

const API_URL = 'https://rapid-routes.vercel.app/api/verify-intelligence-api';

async function runRemoteVerification() {
  console.log(`🚀 Starting remote verification: ${API_URL}`);
  console.log(`📅 Timestamp: ${new Date().toISOString()}`);
  
  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: 'aconnellan@tql.com',
        password: 'Drodo4492'
      })
    });
    
    if (!response.ok) {
      console.error(`❌ API error: ${response.status}`);
      const error = await response.text();
      console.error('Error details:', error);
      return false;
    }
    
    const data = await response.json();
    
    // Save the complete response
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
    
    // Generate a markdown report
    const report = generateMarkdownReport(data);
    await fs.writeFile('FINAL_LANE_VERIFICATION_REPORT.md', report);
    console.log('✅ Report generated: FINAL_LANE_VERIFICATION_REPORT.md');
    
    return data.successfulTests === data.totalTests && data.kmaRequirementsMet === data.totalTests;
  } catch (error) {
    console.error('❌ Verification failed:', error.message);
    return false;
  }
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

runRemoteVerification();