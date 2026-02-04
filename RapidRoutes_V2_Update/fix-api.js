#!/usr/bin/env node

/**
 * This script fixes all syntax errors in the intelligence-pairing.js file
 * that were causing Vercel build failures.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Paths
const apiFilePath = path.join(process.cwd(), 'pages', 'api', 'intelligence-pairing.js');
const backupPath = `${apiFilePath}.bak-fix`;

// First create a backup
console.log('Creating backup of intelligence-pairing.js...');
fs.copyFileSync(apiFilePath, backupPath);
console.log(`Backup saved to ${backupPath}`);

// Read the file content
let content = fs.readFileSync(apiFilePath, 'utf8');
console.log('Original file loaded, fixing syntax errors...');

// Fix 1: Close the try block at line ~1006 that's missing a catch
// This is a complex operation as we need to identify an unclosed try block
content = content.replace(
  /if \(pairs\.length < 6\) \{\s+try \{[\s\S]*?console\.warn\(`⚠️ Generated \${pairs\.length} pairs with fallback data to meet minimum requirements`\);\s+\}\s+/gs,
  (match) => {
    // Add a catch block to the try
    return match.replace(
      /console\.warn\(`⚠️ Generated \${pairs\.length} pairs with fallback data to meet minimum requirements`\);\s+\}/s,
      `console.warn(\`⚠️ Generated \${pairs.length} pairs with fallback data to meet minimum requirements\`);
      } catch (fallbackError) {
        console.error('Error generating fallback data:', fallbackError);
      }
      }`
    );
  }
);

// Fix 2: Remove the problematic try block without a catch at line ~1138
content = content.replace(
  /\/\/ CRITICAL FIX: Remove redundant stats calculation and fix try-catch structure\s+try \{/g, 
  '// CRITICAL FIX: Remove redundant stats calculation and fix try-catch structure\n      {'
);

// Fix 3: Add missing semicolon after JSON response at line ~1178
content = content.replace(
  /processingTimeMs: Date\.now\(\) - startTime\s+\}\)/g,
  'processingTimeMs: Date.now() - startTime\n        });'
);

// Write the fixed content back to the file
fs.writeFileSync(apiFilePath, content, 'utf8');
console.log('Fixes applied to intelligence-pairing.js');

// Check if the syntax is correct
console.log('Verifying syntax...');
try {
  execSync(`node --check ${apiFilePath}`, { stdio: 'pipe' });
  console.log('✅ Syntax check passed! All errors fixed.');
} catch (error) {
  console.error('❌ Syntax errors still present:');
  console.error(error.stdout?.toString() || error.message);
  
  // Restore the backup in case of failure
  console.log('Restoring backup...');
  fs.copyFileSync(backupPath, apiFilePath);
  process.exit(1);
}

console.log('Creating API testing guide...');

// Create a test API file to help verify everything works
fs.writeFileSync(
  path.join(process.cwd(), 'API_TESTING_GUIDE.md'),
  `# API Testing Guide

## Fixed Issues

1. Fixed missing RPC function \`find_cities_within_radius\` in Supabase
2. Fixed syntax errors in \`intelligence-pairing.js\`:
   - Added missing catch block for try statement at line ~1006
   - Fixed malformed try-catch structure at line ~1138
   - Added missing semicolons in JSON responses

## How to Test

1. Use the \`simple-api-test.html\` file to test the API:
   - It provides a simple interface to test the intelligence pairing API
   - Enter your authentication token (JWT)
   - Send a test request with origin and destination

2. Check Vercel deployment:
   - Deploy to Vercel to verify the build succeeds
   - Test the API endpoints in production

## Expected Results

- API should return city pairs based on origin and destination
- Response should include statistics about the pairs
- No server errors should occur

## Troubleshooting

If you encounter issues:
- Check Vercel build logs for any remaining syntax errors
- Verify the Supabase RPC function is available
- Ensure your authentication token is valid
`,
  'utf8'
);

console.log('✅ API fix complete! Use simple-api-test.html to verify functionality.');