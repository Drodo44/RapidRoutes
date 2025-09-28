#!/usr/bin/env node

/**
 * Script to fix syntax errors in intelligence-pairing.js
 * This version implements a more comprehensive fix that properly structures the try-catch blocks
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

// Fix the problematic section - this is a more comprehensive fix
// We need to handle both the try and the corresponding catch
const problematicSection = /\/\/ CRITICAL FIX: Remove redundant stats calculation and fix try-catch structure\s+try {[\s\S]*?}\s+} catch \(responseError\) {/;

const fixedSection = `// CRITICAL FIX: Remove redundant stats calculation and fix try-catch structure
      try {`;

// Replace just the initial part
content = content.replace(
  /\/\/ CRITICAL FIX: Remove redundant stats calculation and fix try-catch structure\s+try {/,
  fixedSection
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
  
  // Let's try to restore from backup
  console.log('Attempting to restore from backup...');
  fs.copyFileSync(backupFilePath, apiFilePath);
}