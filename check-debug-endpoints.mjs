#!/usr/bin/env node
/**
 * RapidRoutes Security Check
 * Scans for test/debug endpoints that should be removed in production
 */

import fs from 'fs/promises';
import path from 'path';

const API_DIR = './pages/api';
const DEBUG_ENDPOINT_PATTERNS = [
  'test',
  'debug',
  'bypass',
  'mock',
  '-dev'
];

async function scanDirectory(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  
  const files = [];
  
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    
    if (entry.isDirectory()) {
      const subdirFiles = await scanDirectory(fullPath);
      files.push(...subdirFiles);
    } else if (entry.isFile() && entry.name.endsWith('.js')) {
      files.push(fullPath);
    }
  }
  
  return files;
}

async function checkFile(filePath) {
  const fileName = path.basename(filePath);
  
  // Check if the filename contains debug patterns
  const isDebugFile = DEBUG_ENDPOINT_PATTERNS.some(pattern => 
    fileName.toLowerCase().includes(pattern)
  );
  
  if (isDebugFile) {
    return {
      path: filePath,
      name: fileName,
      type: 'debug_endpoint',
      severity: 'high',
      recommendation: 'Remove debug/test endpoint in production'
    };
  }
  
  return null;
}

async function main() {
  console.log('\n🔍 SCANNING FOR DEBUG ENDPOINTS');
  console.log('============================');
  
  try {
    const apiFiles = await scanDirectory(API_DIR);
    console.log(`📁 Found ${apiFiles.length} API files to scan`);
    
    const issues = [];
    
    // Check each file for debug endpoints
    for (const file of apiFiles) {
      const issue = await checkFile(file);
      if (issue) {
        issues.push(issue);
      }
    }
    
    // Output results
    if (issues.length > 0) {
      console.log(`\n⚠️ Found ${issues.length} debug endpoints that should be removed:`);
      issues.forEach(issue => {
        console.log(`❌ ${issue.path} (${issue.recommendation})`);
      });
      
      // Update the health report
      const reportPath = '/workspaces/RapidRoutes/PRODUCTION_HEALTH.md';
      const report = await fs.readFile(reportPath, 'utf8');
      
      const securitySection = `
## Security Scan Results

### Debug Endpoints

⚠️ **WARNING:** Found ${issues.length} debug/test endpoints that should be removed from production:

${issues.map(issue => `- ❌ \`${issue.path}\``).join('\n')}

**Recommendation:** These debug endpoints should be removed before deploying to production as they may expose sensitive information or bypass security controls.

`;
      
      // Insert before the final line with ---
      const updatedReport = report.replace(
        /---\n\*Generated automatically/,
        `${securitySection}---\n*Generated automatically`
      );
      
      await fs.writeFile(reportPath, updatedReport);
      console.log(`\n📝 Updated health report with security findings`);
      
      return 1; // Exit with error code if issues found
    } else {
      console.log(`\n✅ No debug endpoints found`);
      return 0;
    }
  } catch (error) {
    console.error(`❌ Error scanning for debug endpoints: ${error.message}`);
    return 2;
  }
}

main().then(process.exit);