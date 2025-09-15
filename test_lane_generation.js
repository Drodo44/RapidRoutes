/**
 * Test script to validate lane generation with no maximum limits
 * 
 * Tests the updated system that:
 * - Requires minimum 5 unique KMA pairs per lane
 * - Generates 2 contact methods per pair (≥10 CSV rows)
 * - Accepts any number of pairs ≥5 (no maximum limits)
 * - Uses smart radius crawl (75→100→125 mile progression)
 * 
 * Usage: node test_lane_generation.js
 */

import { generateDatCsvRows } from './lib/datCsvBuilder.js';
import { verifyBusinessRequirements } from './lib/csvVerification.js';

// Configuration constants
const MIN_PAIRS_REQUIRED = 5;
const ROWS_PER_PAIR = 2;

/**
 * Create test scenarios with different pair counts to validate no maximum limits
 */
function createTestScenarios() {
  const basePairs = [
    { pickup: { city: 'Columbus', state: 'OH', kma_code: 'CMH' }, delivery: { city: 'Atlanta', state: 'GA', kma_code: 'ATL' }},
    { pickup: { city: 'Dayton', state: 'OH', kma_code: 'DAY' }, delivery: { city: 'Charlotte', state: 'NC', kma_code: 'CLT' }},
    { pickup: { city: 'Cincinnati', state: 'OH', kma_code: 'CIN' }, delivery: { city: 'Raleigh', state: 'NC', kma_code: 'RDU' }},
    { pickup: { city: 'Cleveland', state: 'OH', kma_code: 'CLE' }, delivery: { city: 'Orlando', state: 'FL', kma_code: 'ORL' }},
    { pickup: { city: 'Toledo', state: 'OH', kma_code: 'TOL' }, delivery: { city: 'Nashville', state: 'TN', kma_code: 'BNA' }}
  ];

  const extraPairs = [
    { pickup: { city: 'Akron', state: 'OH', kma_code: 'CAK' }, delivery: { city: 'Memphis', state: 'TN', kma_code: 'MEM' }},
    { pickup: { city: 'Youngstown', state: 'OH', kma_code: 'YNG' }, delivery: { city: 'Louisville', state: 'KY', kma_code: 'SDF' }},
    { pickup: { city: 'Lima', state: 'OH', kma_code: 'LIM' }, delivery: { city: 'Birmingham', state: 'AL', kma_code: 'BHM' }},
    { pickup: { city: 'Mansfield', state: 'OH', kma_code: 'MFD' }, delivery: { city: 'Jackson', state: 'MS', kma_code: 'JAN' }},
    { pickup: { city: 'Newark', state: 'OH', kma_code: 'LCK' }, delivery: { city: 'Mobile', state: 'AL', kma_code: 'MOB' }}
  ];

  return {
    minimum: basePairs.slice(0, 5),           // Exactly 5 pairs (minimum)
    moderate: [...basePairs, ...extraPairs.slice(0, 3)], // 8 pairs (above minimum)
    high: [...basePairs, ...extraPairs]       // 10 pairs (well above minimum)
  };
}

/**
 * Create test lane with all required fields
 */
function createTestLane(id = 'test-lane') {
  return {
    id,
    reference_id: `RR${String(Math.floor(Math.random() * 90000) + 10000)}`,
    origin_city: 'Columbus',
    origin_state: 'OH', 
    origin_zip: '43215',
    dest_city: 'Atlanta',
    dest_state: 'GA',
    dest_zip: '30309',
    equipment_code: 'V',
    weight_lbs: 25000,
    randomize_weight: false,
    full_partial: 'F',
    pickup_earliest: '2024-12-20',
    pickup_latest: '2024-12-21',
    commodity: 'General Freight',
    comment: 'Test lane for validation',
    created_at: new Date().toISOString()
  };
}

/**
 * Test CSV generation with different pair counts
 */
async function testScenario(scenarioName, pairs, expectedMinRows) {
  console.log(`\n=== Testing ${scenarioName} scenario (${pairs.length} pairs) ===`);
  
  const lane = createTestLane(`test-${scenarioName}`);
  
  try {
    // Generate CSV using the actual datCsvBuilder
    const csvResult = await generateDatCsvRows(lane, pairs);
    
    if (!csvResult.success) {
      console.log(`❌ CSV generation failed: ${csvResult.error}`);
      return { success: false, error: csvResult.error };
    }
    
    const rows = csvResult.data;
    console.log(`✅ Generated ${rows.length} CSV rows from ${pairs.length} pairs`);
    
    // Verify business requirements using actual csvVerification
    const verification = verifyBusinessRequirements(csvResult.csvString, [lane]);
    
    console.log(`📋 Verification result: ${verification.valid ? 'PASSED' : 'FAILED'}`);
    console.log(`   Expected minimum: ${expectedMinRows} rows`);
    console.log(`   Actual: ${verification.actual.totalRows} rows`);
    
    if (verification.errors.length > 0) {
      console.log(`   Errors: ${verification.errors.map(e => e.message).join(', ')}`);
    }
    
    return {
      success: verification.valid,
      pairCount: pairs.length,
      rowCount: verification.actual.totalRows,
      expectedMin: expectedMinRows,
      errors: verification.errors
    };
    
  } catch (error) {
    console.log(`❌ Test failed with error: ${error.message}`);
    return { success: false, error: error.message };
  }
}

/**
 * Main test execution
 */
async function main() {
  console.log('🧪 Testing RapidRoutes CSV generation with no maximum limits');
  console.log(`📋 Business rules: ≥${MIN_PAIRS_REQUIRED} pairs, ${ROWS_PER_PAIR} rows per pair, ≥${MIN_PAIRS_REQUIRED * ROWS_PER_PAIR} total rows`);

  const scenarios = createTestScenarios();
  const results = [];

  // Test minimum requirement (5 pairs = 10 rows)
  results.push(await testScenario('minimum', scenarios.minimum, 10));

  // Test moderate count (8 pairs = 16 rows) 
  results.push(await testScenario('moderate', scenarios.moderate, 10));

  // Test high count (10 pairs = 20 rows)
  results.push(await testScenario('high', scenarios.high, 10));

  // Summary
  console.log('\n=== TEST SUMMARY ===');
  const passed = results.filter(r => r.success).length;
  const total = results.length;
  
  console.log(`✅ Passed: ${passed}/${total} scenarios`);
  
  results.forEach((result, i) => {
    const scenario = ['minimum', 'moderate', 'high'][i];
    const status = result.success ? '✅' : '❌';
    console.log(`   ${status} ${scenario}: ${result.pairCount} pairs → ${result.rowCount || 0} rows`);
    if (!result.success && result.error) {
      console.log(`     Error: ${result.error}`);
    }
  });

  // Validate no maximum limits are enforced
  const highResult = results[2]; // 10 pairs scenario
  if (highResult.success && highResult.rowCount >= 20) {
    console.log('\n🎯 SUCCESS: System accepts >5 pairs and generates >10 rows (no maximum limits)');
  } else {
    console.log('\n⚠️  WARNING: System may have artificial maximum limits');
  }

  return {
    totalTests: total,
    passed,
    failed: total - passed,
    results: results.map(r => ({
      pairs: r.pairCount,
      rows: r.rowCount || 0,
      success: r.success
    }))
  };
}

// Execute if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main()
    .then(result => {
      console.log('\n📊 Final Results:', JSON.stringify(result, null, 2));
      process.exit(result.failed > 0 ? 1 : 0);
    })
    .catch(err => {
      console.error('❌ Test execution failed:', err);
      process.exit(1);
    });
}

export { main as testLaneGeneration };