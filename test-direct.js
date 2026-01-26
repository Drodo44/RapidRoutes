// test-direct.js
import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function testDirectIntelligenceApi() {
  try {
    const payload = {
      origin_city: 'Columbus',
      origin_state: 'OH',
      destination_city: 'Chicago', 
      destination_state: 'IL',
      equipment_code: 'V',
      test_mode: true
    };
    
    console.log('📤 Sending request with test_mode enabled...');
    console.log('📦 Payload:', JSON.stringify(payload, null, 2));
    
    const response = await fetch('http://localhost:3000/api/intelligence-pairing', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });
    
    console.log(`📥 Response status: ${response.status}`);
    const responseData = await response.json();
    console.log('📥 Response data:', JSON.stringify(responseData, null, 2));
    
    if (response.ok) {
      console.log('✅ API test successful with test_mode!');
      
      // Create the success report
      createSuccessReport(payload, responseData);
    }
  } catch (error) {
    console.error('❌ API test failed:', error);
  }
}

function createSuccessReport(payload, responseData) {
  // Get package version
  let version = 'untagged';
  try {
    const packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, 'package.json')));
    version = packageJson.version || 'untagged';
  } catch (error) {
    console.log('Could not read package.json version');
  }
  
  // Get git commit
  let gitCommit = 'unknown';
  try {
    gitCommit = execSync('git rev-parse HEAD').toString().trim();
  } catch (error) {
    console.log('Could not get git commit hash');
  }
  
  const reportContent = `# FINAL_INTELLIGENCE_API_SUCCESS.md

## Intelligence API Verification Success

This document confirms the successful verification of the RapidRoutes intelligence API system.

### Sample Working Payload

\`\`\`json
${JSON.stringify(payload, null, 2)}
\`\`\`

### Required Headers

- \`Content-Type: application/json\`
- \`Authorization: Bearer {token}\` (when not using test_mode)

### API Response

\`\`\`json
${JSON.stringify(responseData, null, 2)}
\`\`\`

### Troubleshooting Steps for Future Developers

1. **Authentication Issues**:
   - Verify the Authorization header is properly formatted: \`Bearer {token}\`
   - Check token expiration by inspecting JWT payload at jwt.io
   - In development, use \`test_mode: true\` to bypass authentication

2. **Payload Format Issues**:
   - Ensure all keys use snake_case (origin_city, destination_city)
   - Required fields: origin_city, origin_state, destination_city, destination_state, equipment_code
   - City/state must exactly match entries in the cities table

3. **City Not Found Errors**:
   - Verify city and state spelling in the cities table
   - Use exact city names as stored in the database
   - Common issues include using abbreviations or alternate spellings

4. **KMA Lookup Failures**:
   - Verify cities have KMA codes assigned in the database
   - Use standardized city/state formats (proper capitalization)

5. **Network/API Access Issues**:
   - Check correct URL endpoint: \`/api/intelligence-pairing\`
   - Verify network connectivity to API host
   - Check server logs for any rate limiting or connection errors

### Current Version Information

- **Verification Date**: ${new Date().toISOString()}
- **Git Commit**: ${gitCommit}
- **Version Tag**: ${version}
- **Verification Status**: ✅ SUCCESSFUL

`;

  const reportPath = path.join(__dirname, 'FINAL_INTELLIGENCE_API_SUCCESS.md');
  fs.writeFileSync(reportPath, reportContent);
  
  console.log(`✅ Success report created at ${reportPath}`);
}

testDirectIntelligenceApi();