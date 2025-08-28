#!/usr/bin/env node

/**
 * SIMPLE MATH CHECK: Is the row calculation logic correct?
 */

console.log('🔢 ROW CALCULATION VERIFICATION');
console.log('');

// Test scenario: 9 lanes, each should generate 6 postings
const lanes = 9;
const targetPostingsPerLane = 6; // 1 base + 5 crawl pairs
const contactMethods = 2; // email + primary phone

const expectedRowsPerLane = targetPostingsPerLane * contactMethods;
const expectedTotalRows = lanes * expectedRowsPerLane;

console.log('📊 EXPECTED MATH:');
console.log(`  • Lanes: ${lanes}`);
console.log(`  • Target postings per lane: ${targetPostingsPerLane} (1 base + 5 crawl pairs)`);
console.log(`  • Contact methods: ${contactMethods} (email + primary phone)`);
console.log(`  • Expected rows per lane: ${expectedRowsPerLane}`);
console.log(`  • Expected total rows: ${expectedTotalRows}`);
console.log('');

// Your actual results
const actualTotalRows = 64;
const actualRowsPerLane = actualTotalRows / lanes;
const actualPostingsPerLane = actualRowsPerLane / contactMethods;

console.log('📊 ACTUAL RESULTS:');
console.log(`  • Actual total rows: ${actualTotalRows}`);
console.log(`  • Actual rows per lane: ${actualRowsPerLane.toFixed(2)}`);
console.log(`  • Actual postings per lane: ${actualPostingsPerLane.toFixed(2)}`);
console.log('');

// Gap analysis  
const shortfall = expectedTotalRows - actualTotalRows;
const shortfallPerLane = (expectedRowsPerLane - actualRowsPerLane);
const missingPostingsPerLane = shortfallPerLane / contactMethods;

console.log('📉 GAP ANALYSIS:');
console.log(`  • Total shortfall: ${shortfall} rows`);
console.log(`  • Shortfall per lane: ${shortfallPerLane.toFixed(2)} rows`);
console.log(`  • Missing postings per lane: ${missingPostingsPerLane.toFixed(2)}`);
console.log('');

console.log('🔍 LIKELY CAUSE:');
if (missingPostingsPerLane > 2) {
  console.log(`  • Enhanced system is generating ~${(actualPostingsPerLane - 1).toFixed(1)} crawl pairs instead of 5`);
  console.log(`  • This suggests geographic crawl limitations or KMA diversity issues`);
} else {
  console.log(`  • Minor shortfall - could be city filtering or database issues`);
}

console.log('');
console.log('🎯 INVESTIGATION NEEDED:');
console.log(`  • Check server logs for geographic crawl pair generation`);
console.log(`  • Verify KMA diversity in your test lanes' markets`);
console.log(`  • Test single lane to confirm enhanced system behavior`);
