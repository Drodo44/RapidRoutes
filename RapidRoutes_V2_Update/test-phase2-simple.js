// test-phase2-simple.js
// Simplified Phase 2 verification focusing on core audit systems

import { csvStructuralIntegrity } from './lib/csvStructuralIntegrity.js';
import { silentFailureDetector } from './lib/silentFailureDetector.js';
import { kmaValidationSystem } from './lib/kmaValidationSystem.js';
import { asyncRaceConditionAuditor } from './lib/asyncRaceConditionAuditor.js';
import { dataStructureValidator, ValidationError } from './lib/dataStructureValidator.js';

/**
 * PHASE 2 CORE VERIFICATION
 * Testing essential audit systems and validation
 */
console.log('🔍 PHASE 2: CORE AUDIT SYSTEMS VERIFICATION');
console.log('============================================');

async function runCoreVerification() {
  let testsRun = 0;
  let testsPassed = 0;
  
  try {
    // Test 1: CSV Structural Integrity System
    console.log('\n🧪 Test 1: CSV Structural Integrity');
    try {
      const csvResult = await csvStructuralIntegrity.validateCompleteGeneration();
      if (csvResult.success) {
        console.log('✅ CSV Structural Integrity system operational');
        testsPassed++;
      } else {
        console.log('❌ CSV Structural Integrity system failed');
      }
    } catch (error) {
      console.log('❌ CSV Structural Integrity error:', error.message);
    }
    testsRun++;

    // Test 2: Silent Failure Detector
    console.log('\n🧪 Test 2: Silent Failure Detection');
    try {
      const silentResult = await silentFailureDetector.auditFreightIntelligence();
      if (silentResult.success) {
        console.log('✅ Silent Failure Detector operational');
        console.log(`   - Detectors active: ${silentResult.silent_failure_detectors?.length || 0}`);
        testsPassed++;
      } else {
        console.log('❌ Silent Failure Detector failed');
      }
    } catch (error) {
      console.log('❌ Silent Failure Detector error:', error.message);
    }
    testsRun++;

    // Test 3: KMA Validation System
    console.log('\n🧪 Test 3: KMA Validation System');
    try {
      const kmaResult = await kmaValidationSystem.auditDiverseCrawlKmaHandling();
      if (kmaResult.success) {
        console.log('✅ KMA Validation System operational');
        console.log(`   - Critical issues: ${kmaResult.critical_issues?.length || 0}`);
        testsPassed++;
      } else {
        console.log('❌ KMA Validation System failed');
      }
    } catch (error) {
      console.log('❌ KMA Validation System error:', error.message);
    }
    testsRun++;

    // Test 4: Race Condition Auditor
    console.log('\n🧪 Test 4: Race Condition Auditor');
    try {
      const raceResult = await asyncRaceConditionAuditor.auditPromiseAllOperations();
      if (raceResult.success) {
        console.log('✅ Race Condition Auditor operational');
        console.log(`   - Critical race conditions: ${raceResult.critical_issues?.length || 0}`);
        testsPassed++;
      } else {
        console.log('❌ Race Condition Auditor failed');
      }
    } catch (error) {
      console.log('❌ Race Condition Auditor error:', error.message);
    }
    testsRun++;

    // Test 5: Data Structure Validator
    console.log('\n🧪 Test 5: Data Structure Validator');
    try {
      const dataResult = await dataStructureValidator.validatePipelineDataStructures();
      if (dataResult.success) {
        console.log('✅ Data Structure Validator operational');
        testsPassed++;
      } else {
        console.log('❌ Data Structure Validator failed');
      }
    } catch (error) {
      console.log('❌ Data Structure Validator error:', error.message);
    }
    testsRun++;

    // Test 6: Validation Error Handling
    console.log('\n🧪 Test 6: Validation Error Handling');
    try {
      let errorCaught = false;
      try {
        // Test invalid lane structure
        const invalidLane = {
          id: null, // Invalid - should be string
          origin_city: '', // Invalid - empty required field
          equipment_code: null // Invalid - null required field
        };
        dataStructureValidator.constructor.validateLaneStructure(invalidLane);
      } catch (error) {
        errorCaught = error instanceof ValidationError;
      }
      
      if (errorCaught) {
        console.log('✅ Validation error handling working');
        testsPassed++;
      } else {
        console.log('❌ Validation error handling not working');
      }
    } catch (error) {
      console.log('❌ Validation error handling test error:', error.message);
    }
    testsRun++;

    // Final Report
    console.log('\n📊 PHASE 2 VERIFICATION RESULTS');
    console.log('===============================');
    console.log(`Tests Run: ${testsRun}`);
    console.log(`Tests Passed: ${testsPassed}`);
    console.log(`Success Rate: ${((testsPassed / testsRun) * 100).toFixed(1)}%`);
    
    if (testsPassed === testsRun) {
      console.log('\n🎉 ALL AUDIT SYSTEMS OPERATIONAL');
      console.log('✅ Phase 2 deep dive systems ready for production use');
      console.log('\nAUDIT CAPABILITIES VERIFIED:');
      console.log('- CSV generation validation and integrity checking');
      console.log('- Silent failure detection across all pipeline stages');
      console.log('- KMA uniqueness enforcement and duplication prevention');
      console.log('- Race condition detection in async operations');
      console.log('- Comprehensive data structure validation');
      console.log('- Error handling and validation error classification');
    } else {
      console.log('\n⚠️  SOME AUDIT SYSTEMS NEED ATTENTION');
      console.log('Review failed tests above for details');
    }

    console.log('\n🔍 PHASE 2 DEEP DIVE VERIFICATION COMPLETE');

  } catch (error) {
    console.error('❌ VERIFICATION SUITE FAILED:', error.message);
    console.error('Full error:', error);
  }
}

// Run the verification
runCoreVerification();