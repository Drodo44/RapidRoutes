// comprehensive-diagnostic.js
// Full pipeline diagnostic for the DAT CSV export system
// Traces the complete export flow from database fetch to CSV output

import { adminSupabase } from './utils/supabaseClient.js';
import { EnterpriseCsvGenerator } from './lib/enterpriseCsvGenerator.js';
import { validateLane } from './lib/enterpriseValidation.js';
import { generateDatCsvRows } from './lib/datCsvBuilder.js';

console.log('🔬 COMPREHENSIVE EXPORT PIPELINE DIAGNOSTIC');
console.log('='.repeat(80));

async function diagnosticReport() {
  const report = {
    timestamp: new Date().toISOString(),
    phase1_database: {},
    phase2_validation: {},
    phase3_intelligence: {},
    phase4_csv_generation: {},
    summary: {},
    recommendations: []
  };

  try {
    // PHASE 1: Database Lane Retrieval
    console.log('\n📦 PHASE 1: DATABASE LANE RETRIEVAL');
    console.log('-'.repeat(50));

    const { data: allLanes, error: fetchError } = await adminSupabase
      .from('lanes')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(10); // Test with first 10 pending lanes

    if (fetchError) {
      report.phase1_database.error = fetchError.message;
      console.error('❌ Database fetch failed:', fetchError.message);
      return report;
    }

    report.phase1_database = {
      total_pending_lanes: allLanes?.length || 0,
      sample_lanes: allLanes?.slice(0, 3).map(lane => ({
        id: lane.id,
        origin: `${lane.origin_city}, ${lane.origin_state}`,
        destination: `${lane.dest_city}, ${lane.dest_state}`,
        equipment: lane.equipment_code,
        weight_lbs: lane.weight_lbs,
        randomize_weight: lane.randomize_weight,
        pickup_earliest: lane.pickup_earliest,
        pickup_latest: lane.pickup_latest,
        status: lane.status
      }))
    };

    console.log(`✅ Retrieved ${allLanes?.length || 0} pending lanes from database`);
    if (allLanes?.length > 0) {
      console.log('📋 Sample lanes:');
      allLanes.slice(0, 3).forEach((lane, i) => {
        console.log(`  [${i}] ID: ${lane.id} | ${lane.origin_city}, ${lane.origin_state} → ${lane.dest_city}, ${lane.dest_state} | ${lane.equipment_code}`);
        console.log(`      Weight: ${lane.weight_lbs} (randomize: ${lane.randomize_weight}) | Pickup: ${lane.pickup_earliest}`);
      });
    }

    if (!allLanes || allLanes.length === 0) {
      report.summary.root_cause = "No pending lanes found in database";
      console.log('❌ ROOT CAUSE: No pending lanes in database');
      return report;
    }

    // PHASE 2: Lane Validation
    console.log('\n🧪 PHASE 2: LANE VALIDATION');
    console.log('-'.repeat(50));

    const validationResults = [];
    let validLanes = [];

    for (let i = 0; i < allLanes.length; i++) {
      const lane = { ...allLanes[i] }; // Copy to avoid mutations
      const laneResult = {
        id: lane.id,
        original_pickup_earliest: lane.pickup_earliest,
        original_pickup_latest: lane.pickup_latest,
        validation_passed: false,
        errors: []
      };

      try {
        // Apply same date normalization as in production
        if (!lane.pickup_earliest) {
          const tomorrow = new Date();
          tomorrow.setDate(tomorrow.getDate() + 1);
          lane.pickup_earliest = tomorrow.toISOString();
          laneResult.pickup_earliest_defaulted = lane.pickup_earliest;
        }
        if (!lane.pickup_latest) {
          const dayAfterTomorrow = new Date();
          dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 2);
          lane.pickup_latest = dayAfterTomorrow.toISOString();
          laneResult.pickup_latest_defaulted = lane.pickup_latest;
        }

        // Normalize to MM/DD/YYYY format as done in production
        if (lane.pickup_earliest) {
          const earliestDate = new Date(lane.pickup_earliest);
          if (!isNaN(earliestDate.getTime())) {
            lane.pickup_earliest = earliestDate.toLocaleDateString('en-US');
            laneResult.pickup_earliest_normalized = lane.pickup_earliest;
          }
        }
        if (lane.pickup_latest) {
          const latestDate = new Date(lane.pickup_latest);
          if (!isNaN(latestDate.getTime())) {
            lane.pickup_latest = latestDate.toLocaleDateString('en-US');
            laneResult.pickup_latest_normalized = lane.pickup_latest;
          }
        }

        validateLane(lane);
        laneResult.validation_passed = true;
        validLanes.push(lane);
        console.log(`✅ Lane ${lane.id}: Validation passed`);

      } catch (error) {
        laneResult.errors.push(error.message);
        console.log(`❌ Lane ${lane.id}: Validation failed - ${error.message}`);
      }

      validationResults.push(laneResult);
    }

    report.phase2_validation = {
      total_lanes_tested: allLanes.length,
      valid_lanes: validLanes.length,
      invalid_lanes: allLanes.length - validLanes.length,
      validation_rate: Math.round((validLanes.length / allLanes.length) * 100),
      validation_results: validationResults
    };

    console.log(`📊 Validation Summary: ${validLanes.length}/${allLanes.length} lanes passed (${Math.round((validLanes.length / allLanes.length) * 100)}%)`);

    if (validLanes.length === 0) {
      report.summary.root_cause = "All lanes failed validation";
      console.log('❌ ROOT CAUSE: All lanes failed validation');
      return report;
    }

    // PHASE 3: Intelligence System Test (City Pair Generation)
    console.log('\n🧠 PHASE 3: INTELLIGENCE SYSTEM TEST');
    console.log('-'.repeat(50));

    const intelligenceResults = [];
    let lanesWithPairs = [];

    for (let i = 0; i < Math.min(validLanes.length, 5); i++) { // Test first 5 valid lanes
      const lane = validLanes[i];
      const intelligenceResult = {
        id: lane.id,
        origin: `${lane.origin_city}, ${lane.origin_state}`,
        destination: `${lane.dest_city}, ${lane.dest_state}`,
        pairs_generated: 0,
        unique_kmas: 0,
        here_fallback_used: false,
        intelligence_success: false,
        error: null
      };

      try {
        console.log(`🔍 Testing intelligence for Lane ${lane.id}: ${lane.origin_city}, ${lane.origin_state} → ${lane.dest_city}, ${lane.dest_state}`);
        
        // Import intelligent cache
        const { intelligentCache } = await import('./lib/intelligentCache.js');
        
        const result = await intelligentCache.getIntelligentPairs(
          { 
            city: lane.origin_city, 
            state: lane.origin_state,
            zip: lane.origin_zip 
          },
          { 
            city: lane.dest_city, 
            state: lane.dest_state,
            zip: lane.dest_zip 
          },
          lane.equipment_code,
          lane.id
        );

        intelligenceResult.pairs_generated = result?.pairs?.length || 0;
        intelligenceResult.here_fallback_used = result?.source?.toLowerCase().includes('here') || false;
        intelligenceResult.cached = result?.cached || false;
        intelligenceResult.source = result?.source || 'unknown';

        if (result?.pairs?.length > 0) {
          const kmas = new Set();
          result.pairs.forEach(pair => {
            if (pair.pickup?.kma_code) kmas.add(pair.pickup.kma_code);
            if (pair.delivery?.kma_code) kmas.add(pair.delivery.kma_code);
          });
          intelligenceResult.unique_kmas = kmas.size;
          intelligenceResult.intelligence_success = true;
          lanesWithPairs.push(lane);
        }

        console.log(`  → Generated ${intelligenceResult.pairs_generated} pairs, ${intelligenceResult.unique_kmas} unique KMAs`);
        console.log(`  → Source: ${intelligenceResult.source}, Cached: ${intelligenceResult.cached}`);

      } catch (error) {
        intelligenceResult.error = error.message;
        console.log(`  ❌ Intelligence failed: ${error.message}`);
      }

      intelligenceResults.push(intelligenceResult);
    }

    report.phase3_intelligence = {
      lanes_tested: intelligenceResults.length,
      successful_lanes: lanesWithPairs.length,
      intelligence_success_rate: Math.round((lanesWithPairs.length / intelligenceResults.length) * 100),
      intelligence_results: intelligenceResults
    };

    console.log(`📊 Intelligence Summary: ${lanesWithPairs.length}/${intelligenceResults.length} lanes generated pairs (${Math.round((lanesWithPairs.length / intelligenceResults.length) * 100)}%)`);

    if (lanesWithPairs.length === 0) {
      report.summary.root_cause = "Intelligence system failed to generate city pairs for any lane";
      console.log('❌ ROOT CAUSE: Intelligence system failed to generate city pairs');
      return report;
    }

    // PHASE 4: CSV Row Generation
    console.log('\n📄 PHASE 4: CSV ROW GENERATION');
    console.log('-'.repeat(50));

    const csvResults = [];
    let successfulCsvLanes = [];

    for (let i = 0; i < Math.min(lanesWithPairs.length, 3); i++) { // Test first 3 lanes with pairs
      const lane = lanesWithPairs[i];
      const csvResult = {
        id: lane.id,
        rows_generated: 0,
        csv_generation_success: false,
        error: null
      };

      try {
        console.log(`📝 Testing CSV generation for Lane ${lane.id}`);
        
        const csvRows = await generateDatCsvRows(lane);
        
        if (Array.isArray(csvRows)) {
          csvResult.rows_generated = csvRows.length;
          csvResult.csv_generation_success = true;
          csvResult.sample_row = csvRows[0] || null;
          successfulCsvLanes.push(lane);
          console.log(`  ✅ Generated ${csvRows.length} CSV rows`);
        } else {
          csvResult.error = "generateDatCsvRows returned non-array";
          console.log(`  ❌ CSV generation failed: returned non-array`);
        }

      } catch (error) {
        csvResult.error = error.message;
        console.log(`  ❌ CSV generation failed: ${error.message}`);
      }

      csvResults.push(csvResult);
    }

    report.phase4_csv_generation = {
      lanes_tested: csvResults.length,
      successful_lanes: successfulCsvLanes.length,
      csv_success_rate: Math.round((successfulCsvLanes.length / csvResults.length) * 100),
      csv_results: csvResults
    };

    console.log(`📊 CSV Generation Summary: ${successfulCsvLanes.length}/${csvResults.length} lanes generated CSV rows (${Math.round((successfulCsvLanes.length / csvResults.length) * 100)}%)`);

    // PHASE 5: Enterprise Generator Test
    console.log('\n🏢 PHASE 5: ENTERPRISE GENERATOR TEST');
    console.log('-'.repeat(50));

    try {
      console.log('🧪 Testing EnterpriseCsvGenerator with sample lanes...');
      
      const generator = new EnterpriseCsvGenerator({
        generation: {
          minPairsPerLane: 5,
          enableTransactions: true,
          enableCaching: true
        },
        verification: { postGenerationVerification: true }
      });

      const testLanes = validLanes.slice(0, 3); // Test with first 3 valid lanes
      const result = await generator.generate(testLanes);

      report.phase5_enterprise = {
        test_lanes: testLanes.length,
        enterprise_success: result.success || false,
        total_rows: result.csv?.rows?.length || 0,
        lane_results: result.laneResults?.map(lr => ({
          lane_id: lr.lane_id || lr.lane?.id,
          success: lr.success,
          error: lr.error,
          rows_generated: lr.rows_generated
        })) || []
      };

      console.log(`📊 Enterprise Generator: Success=${result.success}, Rows=${result.csv?.rows?.length || 0}`);

    } catch (error) {
      report.phase5_enterprise = {
        error: error.message,
        enterprise_success: false
      };
      console.log(`❌ Enterprise generator failed: ${error.message}`);
    }

    // SUMMARY
    console.log('\n🎯 DIAGNOSTIC SUMMARY');
    console.log('='.repeat(80));

    report.summary = {
      total_pending_lanes: allLanes.length,
      lanes_passed_validation: validLanes.length,
      lanes_with_intelligence: lanesWithPairs.length,
      lanes_with_csv_rows: successfulCsvLanes.length,
      enterprise_generator_success: report.phase5_enterprise?.enterprise_success || false,
      pipeline_success_rate: successfulCsvLanes.length > 0 ? Math.round((successfulCsvLanes.length / allLanes.length) * 100) : 0
    };

    // Determine root cause
    if (allLanes.length === 0) {
      report.summary.root_cause = "No pending lanes in database";
    } else if (validLanes.length === 0) {
      report.summary.root_cause = "All lanes failed validation";
    } else if (lanesWithPairs.length === 0) {
      report.summary.root_cause = "Intelligence system failed to generate city pairs";
    } else if (successfulCsvLanes.length === 0) {
      report.summary.root_cause = "CSV row generation failed for all lanes";
    } else if (!report.phase5_enterprise?.enterprise_success) {
      report.summary.root_cause = "Enterprise generator failed despite individual components working";
    } else {
      report.summary.root_cause = "Pipeline appears to be working - investigate API endpoint logic";
    }

    console.log(`📈 Pipeline Success Rate: ${report.summary.pipeline_success_rate}%`);
    console.log(`🔍 Root Cause: ${report.summary.root_cause}`);

    // Generate recommendations
    if (report.summary.root_cause.includes("No pending lanes")) {
      report.recommendations.push("Create test lanes with 'pending' status in the database");
    }
    if (report.summary.root_cause.includes("validation")) {
      report.recommendations.push("Review and fix lane validation logic - check date formats and required fields");
    }
    if (report.summary.root_cause.includes("Intelligence system")) {
      report.recommendations.push("Investigate HERE.com API connectivity and city database completeness");
    }
    if (report.summary.root_cause.includes("CSV row generation")) {
      report.recommendations.push("Check city pair validation and CSV row building logic");
    }
    if (report.summary.root_cause.includes("Enterprise generator")) {
      report.recommendations.push("Debug EnterpriseCsvGenerator transaction and verification logic");
    }

  } catch (error) {
    report.error = error.message;
    report.summary.root_cause = `Diagnostic script failed: ${error.message}`;
    console.error('❌ Diagnostic failed:', error.message);
  }

  return report;
}

// Run diagnostic and output results
diagnosticReport().then(report => {
  console.log('\n📋 FULL DIAGNOSTIC REPORT');
  console.log('='.repeat(80));
  console.log(JSON.stringify(report, null, 2));
  
  console.log('\n🚨 IMMEDIATE ACTION ITEMS:');
  console.log('-'.repeat(40));
  report.recommendations?.forEach((rec, i) => {
    console.log(`${i + 1}. ${rec}`);
  });
  
  process.exit(0);
}).catch(error => {
  console.error('💥 DIAGNOSTIC SCRIPT CRASHED:', error.message);
  console.error(error.stack);
  process.exit(1);
});