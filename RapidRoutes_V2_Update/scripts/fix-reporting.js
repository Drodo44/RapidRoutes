// scripts/fix-reporting.js
import fs from 'fs/promises';
import path from 'path';

async function fixSearchReporting() {
  const filePath = path.resolve(process.cwd(), 'lib/improvedCitySearch.js');
  const originalContent = await fs.readFile(filePath, 'utf8');
  
  // Update the function to properly report the search radius
  const updatedContent = originalContent.replace(
    /const MAX_RADIUS = 100;/,
    `const MAX_RADIUS = 100; // Absolute maximum radius - never exceed this
    const INITIAL_RADIUS = 75; // Start with this radius`
  ).replace(
    /let currentRadius = radius;/,
    'let currentRadius = INITIAL_RADIUS;'
  ).replace(
    /metadata: {/,
    `metadata: {
      effectiveRadius: Math.min(currentRadius, MAX_RADIUS), // Never report > 100`
  );
  
  await fs.writeFile(filePath, updatedContent, 'utf8');
  console.log('✅ Updated search reporting');
}

fixSearchReporting();