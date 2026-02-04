// Test script to verify the intelligenceApiAdapter export
const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'utils', 'intelligenceApiAdapter.js');
const content = fs.readFileSync(filePath, 'utf-8');

console.log('Checking intelligenceApiAdapter.js exports...\n');

// Check for export statements
const exportDefault = content.match(/export\s+default\s+/g);
const exportNamed = content.match(/export\s+(async\s+)?function/g);
const moduleExports = content.match(/module\.exports\s*=/g);

console.log('Export patterns found:');
console.log('- export default:', exportDefault ? exportDefault.length : 0);
console.log('- export function (named):', exportNamed ? exportNamed.length : 0);
console.log('- module.exports:', moduleExports ? moduleExports.length : 0);

// Check function definition
const functionDef = content.match(/async\s+function\s+callIntelligencePairingApi/);
console.log('\nFunction definition found:', !!functionDef);

// Extract last 5 lines
const lines = content.split('\n');
console.log('\nLast 5 lines of file:');
lines.slice(-5).forEach((line, i) => {
  console.log(`${lines.length - 5 + i + 1}: ${line}`);
});