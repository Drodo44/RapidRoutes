#!/usr/bin/env node

/**
 * DIAGNOSTIC: Why did 9 lanes generate 64 rows instead of 108?
 * Expected with preferFillTo10=true: 9 lanes × 12 rows = 108 total
 * Actual result: 64 rows = 7.11 rows per lane average
 */

console.log('🔍 DIAGNOSTIC: Analyzing 64-row result vs 108 expected');
console.log('');

// Math breakdown
const lanes = 9;
const actualRows = 64;
const expectedRows = 108;
const expectedPerLane = 12; // 6 postings × 2 contacts
const actualPerLane = actualRows / lanes;

console.log('📊 MATH BREAKDOWN:');
console.log(`  • Lanes processed: ${lanes}`);
console.log(`  • Expected rows total: ${expectedRows} (${expectedPerLane} per lane)`);
console.log(`  • Actual rows total: ${actualRows} (${actualPerLane.toFixed(2)} per lane)`);
console.log(`  • Shortfall: ${expectedRows - actualRows} rows (${((actualRows/expectedRows)*100).toFixed(1)}% of expected)`);
console.log('');

// What does 7.11 rows per lane mean?
const avgPostings = actualPerLane / 2; // divide by 2 contacts
console.log('🎯 POSTING ANALYSIS:');
console.log(`  • Average postings per lane: ${avgPostings.toFixed(2)}`);
console.log(`  • Expected postings per lane: 6 (1 base + 5 crawl pairs)`);
console.log(`  • Actual appears to be: ~3.6 postings per lane`);
console.log(`  • This suggests: 1 base + ~2.6 crawl pairs (not 5)`);
console.log('');

// Diagnostic scenarios
console.log('🔬 POSSIBLE CAUSES:');
console.log('  1. 🟡 Enhanced system not fully triggering (fallback to old logic)');
console.log('  2. 🟡 KMA diversity constraints still limiting pairs');
console.log('  3. 🟡 Intelligent fallbacks not generating enough alternatives');
console.log('  4. 🟡 City filtering removing too many candidates');
console.log('  5. 🟡 Database query limits or performance issues');
console.log('');

// Row distribution analysis
console.log('📈 ROW DISTRIBUTION ANALYSIS:');
if (actualRows === 64) {
  // Common patterns for 64 rows with 9 lanes
  console.log('  Possible per-lane breakdown:');
  console.log('  • 7 lanes × 8 rows (4 postings) = 56 rows');
  console.log('  • 2 lanes × 4 rows (2 postings) = 8 rows');
  console.log('  • Total: 64 rows ✓');
  console.log('');
  console.log('  OR alternative:');
  console.log('  • 8 lanes × 8 rows (4 postings) = 64 rows');
  console.log('  • 1 lane × 0 rows (failed) = 0 rows');
  console.log('  • Total: 64 rows ✓');
}
console.log('');

console.log('🛠️ NEXT STEPS:');
console.log('  1. Check API logs for "INSUFFICIENT PAIRS" warnings');
console.log('  2. Verify enhanced geographic crawl is actually running');
console.log('  3. Test single lane to see exact pair generation');
console.log('  4. Review KMA distribution in your test lanes');
console.log('');

console.log('🎯 SUCCESS CRITERIA:');
console.log('  • Target: 108 rows (90-95% achievement = 97-103 rows acceptable)');
console.log('  • Current: 64 rows (59% achievement - needs investigation)');
console.log('  • Minimum viable: 72 rows (80% achievement)');
