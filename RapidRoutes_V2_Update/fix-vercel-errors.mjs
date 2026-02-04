#!/usr/bin/env node

/**
 * Script to fix all syntax errors in intelligence-pairing.js for Vercel deployment
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get the directory path
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// File paths
const apiFilePath = path.join(__dirname, 'pages', 'api', 'intelligence-pairing.js');
const backupFilePath = apiFilePath + '.bak-final';

// First create a backup
console.log(`Creating backup at ${backupFilePath}`);
fs.copyFileSync(apiFilePath, backupFilePath);

// Read the file
let content = fs.readFileSync(apiFilePath, 'utf8');

// Fix the syntax errors identified in the Vercel build log
const fixes = [
  // Fix 1: Line 1138 - Remove the try block that's causing problems
  {
    from: /\/\/ CRITICAL FIX: Remove redundant stats calculation and fix try-catch structure\s+try {/g,
    to: "// CRITICAL FIX: Remove redundant stats calculation and fix try-catch structure\n      {"
  },
  
  // Fix 2: Line 1196 - Fix the catch block that doesn't match any try
  {
    from: /\s+} catch \(pairError\) {/g,
    to: "\n      } \n    catch (pairError) {"
  },
  
  // Fix 3: Line 1231 - Fix the missing closing brace at the end of file
  {
    from: /\s+}\s+}\s*$/g,
    to: "\n  }\n}\n"  // Add proper closing braces and a newline
  }
];

// Apply all fixes
let fixedContent = content;
for (const fix of fixes) {
  fixedContent = fixedContent.replace(fix.from, fix.to);
}

// Write the fixed content back to the file
fs.writeFileSync(apiFilePath, fixedContent);

console.log('Fixed all syntax errors in intelligence-pairing.js');
console.log('You can now commit and push to trigger a successful Vercel deployment');