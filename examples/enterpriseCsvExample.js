// examples/enterpriseCsvExample.js
// Example usage of the enterprise-grade CSV generation system

import { generateEnterpriseCsv, validateEnterpriseCsv } from '../lib/enterpriseCsvGenerator.js';
import { enterpriseMonitor } from '../lib/enterpriseMonitor.js';

/**
 * Example: Complete enterprise CSV generation workflow
 */
async function demonstrateEnterpriseCsv() {
  console.log('🚀 Starting Enterprise CSV Generation Demo\n');

  // Sample lane data with various scenarios
  const sampleLanes = [
    // Valid lane
    {
      id: 'lane-001',
      origin_city: 'Houston',
      origin_state: 'TX',
      origin_zip: '77001',
      dest_city: 'Dallas',
      dest_state: 'TX',
      dest_zip: '75201',
      equipment_code: 'FD',
      pickup_earliest: '12/25/2024',
      pickup_latest: '12/26/2024',
      length_ft: 48,
      randomize_weight: false,
      weight_lbs: 47000,
      full_partial: 'full',
      comment: 'Priority shipment',
      commodity: 'Steel coils'
    },
    
    // Another valid lane with different configuration
    {
      id: 'lane-002',
      origin_city: 'Los Angeles',
      origin_state: 'CA',
      origin_zip: '90001',
      dest_city: 'Phoenix',
      dest_state: 'AZ',
      dest_zip: '85001',
      equipment_code: 'V',
      pickup_earliest: '12/27/2024',
      length_ft: 53,
      randomize_weight: true,
      weight_min: 40000,
      weight_max: 44000,
      full_partial: 'full',
      comment: 'Temperature sensitive'
    },

    // Lane with potential issues (for testing error handling)
    {
      id: 'lane-003',
      origin_city: 'Miami',
      origin_state: 'FL',
      dest_city: 'Atlanta',
      dest_state: 'GA',
      equipment_code: 'R',
      pickup_earliest: '12/28/2024',
      length_ft: 48,
      randomize_weight: false,
      weight_lbs: 42000,
      full_partial: 'partial'
    }
  ];

  try {
    // Step 1: Pre-validation (optional but recommended)
    console.log('📋 Step 1: Pre-validation');
    const validationResult = await validateEnterpriseCsv(sampleLanes);
    
    if (validationResult.valid) {
      console.log(`✅ Pre-validation passed: ${validationResult.lanes_validated} lanes validated\n`);
    } else {
      console.log(`❌ Pre-validation failed: ${validationResult.error}\n`);
      console.log('Details:', validationResult.details);
      return;
    }

    // Step 2: Configure enterprise generation
    console.log('⚙️ Step 2: Configuring enterprise generation');
    const enterpriseConfig = {
      validation: {
        strictSchemaValidation: true,
        requireAllFields: true,
        validateBusinessRules: true,
        failOnFirstError: false
      },
      generation: {
        minPairsPerLane: 6,
        maxConcurrentLanes: 5,
        enableTransactions: true,
        enableCaching: true
      },
      verification: {
        postGenerationVerification: true,
        structureValidation: true,
        businessValidation: true,
        maxRowsToVerify: 1000
      },
      monitoring: {
        enableDetailedLogging: true,
        enablePerformanceTracking: true,
        enableAuditTrail: true,
        logLevel: 'info'
      },
      output: {
        maxRowsPerFile: 499,
        enableChunking: true,
        csvEncoding: 'utf-8'
      }
    };

    console.log('Configuration applied:\n', JSON.stringify(enterpriseConfig, null, 2));
    console.log();

    // Step 3: Generate CSV with enterprise guarantees
    console.log('🎯 Step 3: Generating CSV with enterprise guarantees');
    console.log('This process includes:');
    console.log('- Schema validation');
    console.log('- Atomic transactions');
    console.log('- Performance monitoring');
    console.log('- Post-generation verification');
    console.log('- Comprehensive error handling\n');

    const generationResult = await generateEnterpriseCsv(sampleLanes, {
      config: enterpriseConfig
    });

    // Step 4: Analyze results
    console.log('📊 Step 4: Generation Results Analysis');
    console.log('='.repeat(50));
    
    if (generationResult.success) {
      console.log('✅ GENERATION SUCCESSFUL');
      console.log(`Operation ID: ${generationResult.operation_id}`);
      console.log(`CSV Size: ${generationResult.csv.size_bytes.toLocaleString()} bytes`);
      console.log(`Total Rows: ${generationResult.csv.rows_count.toLocaleString()}`);
      console.log(`Chunks Created: ${generationResult.csv.chunks_count}`);
      console.log(`Verification: ${generationResult.verification.toUpperCase()}`);
      
      console.log('\n📈 Statistics:');
      console.log(`- Lanes Processed: ${generationResult.statistics.total_lanes}`);
      console.log(`- Successful Lanes: ${generationResult.statistics.successful_lanes}`);
      console.log(`- Failed Lanes: ${generationResult.statistics.failed_lanes}`);
      console.log(`- Average Rows per Lane: ${generationResult.statistics.avg_rows_per_lane}`);

      if (generationResult.generation_errors.length > 0) {
        console.log('\n⚠️ Generation Warnings:');
        generationResult.generation_errors.forEach((error, index) => {
          console.log(`${index + 1}. Lane ${error.lane_id}: ${error.error}`);
        });
      }

      // Display sample of generated CSV
      console.log('\n📄 Sample CSV Output (first 200 characters):');
      console.log(generationResult.csv.string.substring(0, 200) + '...');

      // Display chunk information
      if (generationResult.chunks.length > 1) {
        console.log('\n📦 Chunks Created:');
        generationResult.chunks.forEach(chunk => {
          console.log(`- ${chunk.filename}: ${chunk.rows.length} rows`);
        });
      }

    } else {
      console.log('❌ GENERATION FAILED');
      console.log(`Error: ${generationResult.error.message}`);
      console.log(`Error Type: ${generationResult.error.type}`);
      
      if (generationResult.error.details) {
        console.log('\n🔍 Error Details:');
        console.log(JSON.stringify(generationResult.error.details, null, 2));
      }
    }

    // Step 5: Generate system health report
    console.log('\n🏥 Step 5: System Health Report');
    console.log('='.repeat(50));
    
    const healthReport = enterpriseMonitor.getSystemHealth();
    console.log(`System Uptime: ${Math.round(healthReport.system.uptime / 60)} minutes`);
    console.log(`Memory Usage: ${Math.round(healthReport.system.memory.heapUsed / 1024 / 1024)}MB`);
    console.log(`Active Operations: ${healthReport.operations.active}`);
    console.log(`Recent Success Rate: ${healthReport.operations.recent_success_rate}%`);
    console.log(`Recent Errors: ${healthReport.errors.recent_count}`);

    // Step 6: Generate comprehensive CSV report
    console.log('\n📋 Step 6: Comprehensive Generation Report');
    console.log('='.repeat(50));
    
    const csvReport = enterpriseMonitor.generateCsvReport([generationResult.operation_id]);
    console.log(`Total Operations: ${csvReport.summary.total_operations}`);
    console.log(`Success Rate: ${Math.round((csvReport.summary.successful / csvReport.summary.total_operations) * 100)}%`);
    console.log(`Average Duration: ${csvReport.performance.avg_duration}ms`);
    console.log(`Total Errors: ${csvReport.summary.total_errors}`);

    if (csvReport.error_analysis.most_common.length > 0) {
      console.log('\n🚨 Most Common Errors:');
      csvReport.error_analysis.most_common.forEach((error, index) => {
        console.log(`${index + 1}. ${error.error_type}: ${error.count} occurrences`);
        console.log(`   Message: ${error.message}`);
      });
    }

    return generationResult;

  } catch (error) {
    console.error('💥 CRITICAL ERROR in enterprise CSV generation:');
    console.error(`Error: ${error.message}`);
    console.error(`Stack: ${error.stack}`);
    
    // Even in failure, try to get system status
    try {
      const healthReport = enterpriseMonitor.getSystemHealth();
      console.log('\n🏥 System Health at Time of Failure:');
      console.log(`Active Operations: ${healthReport.operations.active}`);
      console.log(`Recent Errors: ${healthReport.errors.recent_count}`);
    } catch (healthError) {
      console.error('Could not retrieve system health:', healthError.message);
    }
    
    throw error;
  }
}

/**
 * Example: Testing edge cases and error conditions
 */
async function demonstrateErrorHandling() {
  console.log('\n🧪 Testing Error Handling and Edge Cases\n');

  const testCases = [
    {
      name: 'Empty lanes array',
      lanes: [],
      expectedToFail: true
    },
    {
      name: 'Invalid lane data',
      lanes: [
        {
          id: 'invalid-lane',
          // Missing required fields
          origin_city: 'Houston'
        }
      ],
      expectedToFail: true
    },
    {
      name: 'Weight exceeding equipment limits',
      lanes: [
        {
          id: 'overweight-lane',
          origin_city: 'Houston',
          origin_state: 'TX',
          dest_city: 'Dallas',
          dest_state: 'TX',
          equipment_code: 'V', // Van limit is 45000
          pickup_earliest: '1/1/2024',
          length_ft: 48,
          randomize_weight: false,
          weight_lbs: 50000 // Exceeds limit
        }
      ],
      expectedToFail: true
    }
  ];

  for (const testCase of testCases) {
    console.log(`🔍 Testing: ${testCase.name}`);
    
    try {
      const result = await validateEnterpriseCsv(testCase.lanes);
      
      if (testCase.expectedToFail && result.valid) {
        console.log(`❌ UNEXPECTED: Test should have failed but passed`);
      } else if (!testCase.expectedToFail && !result.valid) {
        console.log(`❌ UNEXPECTED: Test should have passed but failed: ${result.error}`);
      } else if (testCase.expectedToFail && !result.valid) {
        console.log(`✅ EXPECTED FAILURE: ${result.error}`);
      } else {
        console.log(`✅ EXPECTED SUCCESS: ${result.lanes_validated} lanes validated`);
      }
    } catch (error) {
      if (testCase.expectedToFail) {
        console.log(`✅ EXPECTED EXCEPTION: ${error.message}`);
      } else {
        console.log(`❌ UNEXPECTED EXCEPTION: ${error.message}`);
      }
    }
    
    console.log();
  }
}

/**
 * Run all demonstrations
 */
async function runAllDemonstrations() {
  try {
    console.log('🎬 Enterprise CSV Generation System Demonstration');
    console.log('='.repeat(60));
    console.log(`Started at: ${new Date().toISOString()}\n`);

    // Main demonstration
    await demonstrateEnterpriseCsv();

    // Error handling demonstration
    await demonstrateErrorHandling();

    console.log('\n🎉 All demonstrations completed successfully!');
    console.log('The enterprise CSV generation system is ready for production use.');

  } catch (error) {
    console.error('\n💥 Demonstration failed:', error.message);
    process.exit(1);
  }
}

// Export for testing
export { 
  demonstrateEnterpriseCsv, 
  demonstrateErrorHandling, 
  runAllDemonstrations 
};

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runAllDemonstrations();
}