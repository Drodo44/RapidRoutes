#!/usr/bin/env node

/**
 * Script to fix syntax errors in intelligence-pairing.js
 * Specifically targeting the missing catch blocks that prevent Vercel deployment
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

// Get the directory path
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// File paths
const apiFilePath = path.join(__dirname, 'pages', 'api', 'intelligence-pairing.js');
const backupFilePath = apiFilePath + '.bak-fix';

// First create a backup
console.log(`Creating backup at ${backupFilePath}`);
fs.copyFileSync(apiFilePath, backupFilePath);

// Read the file
let content = fs.readFileSync(apiFilePath, 'utf8');

// Fix #1: The critical syntax error around line 1138
// Replace the problematic try without a catch
content = content.replace(
  /\/\/ CRITICAL FIX: Remove redundant stats calculation and fix try-catch structure\s+try {/g,
  "// CRITICAL FIX: Remove redundant stats calculation and fix try-catch structure\n      {"
);

// Write the fixed content back to the file
fs.writeFileSync(apiFilePath, content);

console.log('Fixed the syntax errors in intelligence-pairing.js');
console.log('You can now commit and push to trigger a successful Vercel deployment');

// Verify the fix
try {
  execSync(`node --check ${apiFilePath}`);
  console.log('✅ Syntax check passed! The file is now valid JavaScript.');
} catch (error) {
  console.error('❌ There are still syntax errors in the file:');
  console.error(error.message);
}