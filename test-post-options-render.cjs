// Test script to identify React Error #130 source
// Run with: node test-post-options-render.js

const fs = require('fs');
const path = require('path');

// Read the post-options.js file
const postOptionsPath = path.join(__dirname, 'pages', 'post-options.js');
const content = fs.readFileSync(postOptionsPath, 'utf-8');

console.log('=== Analyzing post-options.js for potential React Error #130 causes ===\n');

// Check for common patterns that cause React Error #130
const checks = [
  {
    name: 'Direct object rendering in JSX',
    regex: /{[a-zA-Z_$][a-zA-Z0-9_$]*\.[a-zA-Z_$][a-zA-Z0-9_$]*}/g,
    description: 'Found potential direct object rendering'
  },
  {
    name: 'Missing null checks',
    regex: /{[a-zA-Z_$][a-zA-Z0-9_$]*(?!\s*\|\||\s*\?\.|\s*\?\?)/g,
    description: 'Variables without null safety operators'
  },
  {
    name: 'Component imports',
    regex: /import\s+(?:{[^}]+}|[a-zA-Z_$][a-zA-Z0-9_$]*)\s+from\s+['"][^'"]+['"]/g,
    description: 'Import statements'
  }
];

let foundIssues = false;

checks.forEach(check => {
  const matches = content.match(check.regex);
  if (matches && matches.length > 0) {
    console.log(`\n${check.name}:`);
    console.log(`${check.description}`);
    console.log(`Found ${matches.length} instances:`);
    
    // Show first 20 matches
    matches.slice(0, 20).forEach((match, i) => {
      // Find line number
      const beforeMatch = content.substring(0, content.indexOf(match));
      const lineNum = (beforeMatch.match(/\n/g) || []).length + 1;
      console.log(`  Line ${lineNum}: ${match}`);
    });
    
    if (matches.length > 20) {
      console.log(`  ... and ${matches.length - 20} more`);
    }
    
    foundIssues = true;
  }
});

// Look for specific problem patterns
console.log('\n=== Checking for specific problem patterns ===\n');

// Check if Header is imported correctly
const headerImport = content.match(/import\s+.*Header.*from\s+['"][^'"]+['"]/);
if (headerImport) {
  console.log('Header import found:', headerImport[0]);
  
  // Check if it's a default or named import
  if (headerImport[0].includes('{')) {
    console.log('⚠️  WARNING: Header is imported as named export, but it might be default export');
  } else {
    console.log('✓ Header is imported as default export');
  }
}

// Check for any rendering of objects directly
const objectRenderPattern = /{(?!\/)[^}]*\.(?!length|map|filter|reduce|slice|join|split|trim|toString|toFixed|toLocaleString)[a-zA-Z_$][a-zA-Z0-9_$]*}/g;
const potentialObjectRenders = content.match(objectRenderPattern);
if (potentialObjectRenders) {
  console.log('\n⚠️  Potential object property rendering without String() wrapper:');
  potentialObjectRenders.slice(0, 10).forEach(match => {
    const beforeMatch = content.substring(0, content.indexOf(match));
    const lineNum = (beforeMatch.match(/\n/g) || []).length + 1;
    console.log(`  Line ${lineNum}: ${match}`);
  });
}

if (!foundIssues) {
  console.log('\n✓ No obvious React Error #130 patterns found in static analysis');
}

console.log('\n=== Analysis complete ===');
