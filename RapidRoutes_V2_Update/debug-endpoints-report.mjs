#!/usr/bin/env node
/**
 * Debug Endpoints Removal Script
 * Creates a report of debug endpoints that need to be removed
 * and recommends changes
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Define paths
const apiDir = path.join(__dirname, 'pages', 'api');
const debugReport = path.join(__dirname, 'DEBUG_ENDPOINTS.md');

// Debug endpoint patterns
const debugPatterns = [
  /\/debug\//,
  /-test\.js$/,
  /test-.*\.js$/,
  /example.*\.js$/,
  /mock.*\.js$/
];

// Function to recursively find debug endpoints
async function findDebugEndpoints(directory) {
  const endpoints = [];
  
  try {
    const items = await fs.readdir(directory, { withFileTypes: true });
    
    for (const item of items) {
      const fullPath = path.join(directory, item.name);
      
      if (item.isDirectory()) {
        const subDirEndpoints = await findDebugEndpoints(fullPath);
        endpoints.push(...subDirEndpoints);
      } else if (item.isFile() && item.name.endsWith('.js')) {
        // Get relative path from API directory
        const relativePath = fullPath.replace(apiDir, '');
        const apiEndpoint = `/api${relativePath.replace(/\.js$/, '')}`;
        
        // Check if this is a debug endpoint
        const isDebug = debugPatterns.some(pattern => pattern.test(relativePath));
        
        if (isDebug) {
          endpoints.push({
            endpoint: apiEndpoint,
            fullPath,
            relativePath,
            reason: 'Matches debug endpoint pattern'
          });
        }
      }
    }
    
    return endpoints;
  } catch (error) {
    console.error(`Error scanning directory ${directory}:`, error);
    return endpoints;
  }
}

// Generate report
async function generateReport() {
  console.log('🔍 Scanning for debug endpoints...');
  
  const debugEndpoints = await findDebugEndpoints(apiDir);
  
  console.log(`Found ${debugEndpoints.length} debug endpoints to remove.`);
  
  // Generate detailed report
  const report = `# Debug Endpoints Removal Report
  
## Overview

**Date:** ${new Date().toISOString()}
**Total Debug Endpoints:** ${debugEndpoints.length}

## Endpoints to Remove

${debugEndpoints.map((endpoint, index) => `
### ${index + 1}. \`${endpoint.endpoint}\`

- **File Path:** \`${endpoint.relativePath}\`
- **Reason:** ${endpoint.reason}
- **Recommended Action:** Remove this file from production deployments
`).join('\n')}

## Recommended Next Steps

1. Create a pre-deployment script to verify these endpoints don't exist in production
2. Implement proper API versioning and testing environments
3. Consider moving test endpoints to a separate directory structure

## Implementation Plan

\`\`\`javascript
// Example implementation for pages/api/_middleware.js
export default function middleware(req, res) {
  // Block debug endpoints in production
  if (process.env.NODE_ENV === 'production' && 
      (req.url.includes('/api/debug/') || 
       req.url.match(/\\/api\\/.*-test/))) {
    return new Response('Not Found', { status: 404 });
  }
  return next();
}
\`\`\`

*Generated on ${new Date().toISOString()}*
`;

  // Write report to file
  await fs.writeFile(debugReport, report);
  
  console.log(`✅ Debug endpoints report saved to ${debugReport}`);
  return debugEndpoints;
}

// Run the report generation
generateReport().catch(console.error);