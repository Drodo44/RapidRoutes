#!/usr/bin/env node

const fs = require('fs');

const content = fs.readFileSync('/workspaces/RapidRoutes/pages/lanes.js', 'utf8');
const lines = content.split('\n');

console.log('=== Analyzing lanes.js for potential React Error #130 causes ===\n');

// Find direct object rendering in JSX
console.log('Direct object rendering in JSX:');
const jsxObjectPattern = /\{[^}]*\w+\.[^}]*\}/g;
let matches = [];
let lineNumber = 0;

for (const line of lines) {
  lineNumber++;
  const jsxMatches = line.match(jsxObjectPattern);
  if (jsxMatches) {
    jsxMatches.forEach(match => {
      matches.push({ line: lineNumber, match: match.trim() });
    });
  }
}

console.log(`Found ${matches.length} instances:`);
matches.slice(0, 20).forEach(m => {
  console.log(`  Line ${m.line}: ${m.match}`);
});
if (matches.length > 20) {
  console.log(`  ... and ${matches.length - 20} more`);
}

// Find variables without null safety
console.log('\nMissing null checks:');
const variablePattern = /\{[^}]*[a-zA-Z_][a-zA-Z0-9_]*[^}]*\}/g;
let varMatches = [];
lineNumber = 0;

for (const line of lines) {
  lineNumber++;
  const varMatchesInLine = line.match(variablePattern);
  if (varMatchesInLine) {
    varMatchesInLine.forEach(match => {
      // Skip if it has null safety operators
      if (!match.includes('||') && !match.includes('??') && !match.includes('?')) {
        varMatches.push({ line: lineNumber, match: match.trim() });
      }
    });
  }
}

console.log(`Found ${varMatches.length} instances:`);
varMatches.slice(0, 20).forEach(m => {
  console.log(`  Line ${m.line}: ${m.match}`);
});
if (varMatches.length > 20) {
  console.log(`  ... and ${varMatches.length - 20} more`);
}

console.log('\n=== Checking for specific problem patterns ===\n');

// Look for places where objects might be rendered
const problematicLines = [];
lineNumber = 0;

for (const line of lines) {
  lineNumber++;
  
  // Look for object properties being rendered without safety
  if (line.includes('{') && line.includes('.') && line.includes('}')) {
    // Skip template strings and console.log
    if (!line.includes('`') && !line.includes('console.')) {
      problematicLines.push({ line: lineNumber, content: line.trim() });
    }
  }
}

console.log('⚠️  Potential object property rendering without String() wrapper:');
problematicLines.slice(0, 10).forEach(p => {
  console.log(`  Line ${p.line}: ${p.content}`);
});

console.log('\n=== Analysis complete ===');