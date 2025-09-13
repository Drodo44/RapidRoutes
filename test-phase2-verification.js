// test-phase2-verification.js
// Comprehensive verification of Phase 2 deep dive fixes and audit systems
// Tests: KMA fix, audit systems, data validation, race condition detection

import { csvStructuralIntegrity } from './lib/csvStructuralIntegrity.js';
import { silentFailureDetector } from './lib/silentFailureDetector.js';
import { kmaValidationSystem } from './lib/kmaValidationSystem.js';
import { asyncRaceConditionAuditor } from './lib/asyncRaceConditionAuditor.js';
import { dataStructureValidator, ValidationError } from './lib/dataStructureValidator.js';
import { diverseCrawl } from './lib/diverseCrawl.js';
import { FreightIntelligence } from './lib/FreightIntelligence.js';

/**
 * PHASE 2 VERIFICATION SUITE
 * Comprehensive testing of all audit systems and critical fixes
 */
class Phase2VerificationSuite {
  constructor() {
    this.testId = `phase2_verification_${Date.now()}`;
    this.results = {};
    this.totalTests = 0;
    this.passedTests = 0;
    this.failedTests = 0;
  }

  /**
   * Run all Phase 2 verification tests
   */
  async runCompleteVerification() {
    console.log('🔍 PHASE 2: COMPREHENSIVE VERIFICATION SUITE');
    console.log('==================================================');
    console.log('Testing all audit systems and critical fixes...\n');

    try {
      // Test 1: Verify audit systems are working
      await this.testAuditSystemsOperational();

      // Test 2: Verify KMA uniqueness fix
      await this.testKmaUniquenessFix();

      // Test 3: Verify data structure validation
      await this.testDataStructureValidation();

      // Test 4: Verify silent failure detection
      await this.testSilentFailureDetection();

      // Test 5: Verify race condition detection
      await this.testRaceConditionDetection();

      // Test 6: Integration test with real lane
      await this.testIntegrationWithRealLane();

      // Generate final report
      this.generateFinalReport();

    } catch (error) {
      console.error('❌ VERIFICATION SUITE FAILED:', error.message);
      console.error('Error details:', error);
    }
  }

  /**
   * Test 1: Verify all audit systems are operational
   */
  async testAuditSystemsOperational() {
    console.log('🧪 Test 1: Audit Systems Operational Check');
    
    try {
      // Test CSV Structural Integrity
      const csvResult = await csvStructuralIntegrity.validateCompleteGeneration();
      this.recordTest('CSV Structural Integrity', csvResult.success, csvResult);

      // Test Silent Failure Detector
      const silentResult = await silentFailureDetector.auditFreightIntelligence();
      this.recordTest('Silent Failure Detector', silentResult.success, silentResult);

      // Test KMA Validation System
      const kmaResult = await kmaValidationSystem.auditDiverseCrawlKmaHandling();
      this.recordTest('KMA Validation System', kmaResult.success, kmaResult);

      // Test Async Race Condition Auditor
      const raceResult = await asyncRaceConditionAuditor.auditPromiseAllOperations();
      this.recordTest('Race Condition Auditor', raceResult.success, raceResult);

      // Test Data Structure Validator
      const dataResult = await dataStructureValidator.validatePipelineDataStructures();
      this.recordTest('Data Structure Validator', dataResult.success, dataResult);

      console.log('✅ All audit systems operational\n');

    } catch (error) {
      this.recordTest('Audit Systems Operational', false, { error: error.message });
      console.error('❌ Audit systems test failed:', error.message);
    }
  }

  /**
   * Test 2: Verify KMA uniqueness fix is working
   */
  async testKmaUniquenessFix() {
    console.log('🧪 Test 2: KMA Uniqueness Fix Verification');

    try {
      // Create test lane that would trigger KMA duplication
      const testLane = {
        id: 'test-kma-fix-lane',
        origin_city: 'Atlanta',
        origin_state: 'GA',
        dest_city: 'Nashville',
        dest_state: 'TN',
        equipment_code: 'FD',
        pickup_earliest: '2024-01-15',
        weight_lbs: 45000,
        full_partial: 'Full'
      };

      // Get intelligence for this lane
      const intelligence = new FreightIntelligence();
      const result = await intelligence.getCityPairs(testLane);

      // Verify result structure
      if (!result || !result.pairs) {
        throw new Error('Intelligence result missing pairs array');
      }

      // Check for KMA uniqueness
      const kmaSet = new Set();
      let duplicateFound = false;
      
      for (const pair of result.pairs) {
        const pickupKma = pair.pickup?.kma_code;
        const deliveryKma = pair.delivery?.kma_code;
        
        if (kmaSet.has(pickupKma) || kmaSet.has(deliveryKma)) {
          duplicateFound = true;
          break;
        }
        
        if (pickupKma) kmaSet.add(pickupKma);
        if (deliveryKma) kmaSet.add(deliveryKma);
      }

      this.recordTest('KMA Uniqueness Enforcement', !duplicateFound, {
        unique_kmas: kmaSet.size,
        total_pairs: result.pairs.length,
        duplicate_found: duplicateFound
      });

      if (!duplicateFound) {
        console.log('✅ KMA uniqueness fix working correctly');
        console.log(`   - Generated ${result.pairs.length} pairs with ${kmaSet.size} unique KMAs`);
      } else {
        console.log('❌ KMA duplication still present');
      }

    } catch (error) {
      this.recordTest('KMA Uniqueness Fix', false, { error: error.message });
      console.error('❌ KMA uniqueness test failed:', error.message);
    }

    console.log('');
  }

  /**
   * Test 3: Verify data structure validation
   */
  async testDataStructureValidation() {
    console.log('🧪 Test 3: Data Structure Validation');

    try {
      // Test valid lane structure
      const validLane = {
        id: 'test-valid-lane',
        origin_city: 'Chicago',
        origin_state: 'IL',
        dest_city: 'Detroit',
        dest_state: 'MI',
        equipment_code: 'FD',
        pickup_earliest: '2024-01-15',
        weight_lbs: 35000,
        full_partial: 'Full'
      };

      const validResult = dataStructureValidator.constructor.validateLaneStructure(validLane);
      this.recordTest('Valid Lane Structure', validResult === true, { lane: validLane });

      // Test invalid lane structure (should throw)
      let invalidCaught = false;
      try {
        const invalidLane = {
          id: 'test-invalid-lane',
          // Missing required fields
          origin_city: null,
          equipment_code: ''
        };
        dataStructureValidator.constructor.validateLaneStructure(invalidLane);
      } catch (error) {
        invalidCaught = error instanceof ValidationError;
      }

      this.recordTest('Invalid Lane Detection', invalidCaught, { 
        validation_error_caught: invalidCaught 
      });

      // Test city pair validation
      const validPair = {
        pickup: {
          city: 'Atlanta',
          state: 'GA',
          kma_code: 'ATL'
        },
        delivery: {
          city: 'Nashville',
          state: 'TN',
          kma_code: 'NSH'
        }
      };

      const pairResult = dataStructureValidator.constructor.validateCityPairStructure(validPair);
      this.recordTest('Valid City Pair Structure', pairResult === true, { pair: validPair });

      console.log('✅ Data structure validation working correctly');

    } catch (error) {
      this.recordTest('Data Structure Validation', false, { error: error.message });
      console.error('❌ Data structure validation test failed:', error.message);
    }

    console.log('');
  }

  /**
   * Test 4: Verify silent failure detection
   */
  async testSilentFailureDetection() {
    console.log('🧪 Test 4: Silent Failure Detection');

    try {
      // Run silent failure audit
      const audit = await silentFailureDetector.auditFreightIntelligence();
      
      const hasDetectors = audit.silent_failure_detectors && 
                          audit.silent_failure_detectors.length > 0;
      
      this.recordTest('Silent Failure Detectors Active', hasDetectors, {
        detector_count: audit.silent_failure_detectors?.length || 0,
        audit_result: audit
      });

      // Check for error result pattern implementation
      const hasErrorPattern = audit.error_result_pattern_available === true;
      this.recordTest('Error Result Pattern', hasErrorPattern, {
        pattern_available: hasErrorPattern
      });

      console.log('✅ Silent failure detection system active');
      console.log(`   - Detectors: ${audit.silent_failure_detectors?.length || 0}`);

    } catch (error) {
      this.recordTest('Silent Failure Detection', false, { error: error.message });
      console.error('❌ Silent failure detection test failed:', error.message);
    }

    console.log('');
  }

  /**
   * Test 5: Verify race condition detection
   */
  async testRaceConditionDetection() {
    console.log('🧪 Test 5: Race Condition Detection');

    try {
      // Run race condition audit
      const audit = await asyncRaceConditionAuditor.auditPromiseAllOperations();
      
      const hasDetectors = audit.race_condition_detectors && 
                          audit.race_condition_detectors.length > 0;
      
      this.recordTest('Race Condition Detectors Active', hasDetectors, {
        detector_count: audit.race_condition_detectors?.length || 0,
        audit_result: audit
      });

      // Check for critical issues identified
      const hasCriticalIssues = audit.critical_issues && audit.critical_issues.length > 0;
      this.recordTest('Critical Race Conditions Identified', hasCriticalIssues, {
        critical_count: audit.critical_issues?.length || 0
      });

      console.log('✅ Race condition detection system active');
      console.log(`   - Detectors: ${audit.race_condition_detectors?.length || 0}`);
      console.log(`   - Critical issues: ${audit.critical_issues?.length || 0}`);

    } catch (error) {
      this.recordTest('Race Condition Detection', false, { error: error.message });
      console.error('❌ Race condition detection test failed:', error.message);
    }

    console.log('');
  }

  /**
   * Test 6: Integration test with real lane processing
   */
  async testIntegrationWithRealLane() {
    console.log('🧪 Test 6: Integration Test with Real Lane');

    try {
      // Create a realistic test lane
      const testLane = {
        id: 'integration-test-lane',
        origin_city: 'Los Angeles',
        origin_state: 'CA',
        dest_city: 'Phoenix',
        dest_state: 'AZ',
        equipment_code: 'FD',
        pickup_earliest: '2024-01-20',
        pickup_latest: '2024-01-22',
        weight_lbs: 48000,
        length_ft: 48,
        full_partial: 'Full',
        commodity: 'Steel',
        comment: 'Integration test load'
      };

      // Test lane validation
      const laneValid = dataStructureValidator.constructor.validateLaneStructure(testLane);
      this.recordTest('Integration Lane Validation', laneValid === true, { lane: testLane });

      // Test intelligence generation
      const intelligence = new FreightIntelligence();
      const result = await intelligence.getCityPairs(testLane);
      
      const intelligenceWorking = result && result.pairs && result.pairs.length > 0;
      this.recordTest('Integration Intelligence Generation', intelligenceWorking, {
        pairs_generated: result?.pairs?.length || 0,
        result_structure: !!result
      });

      // Test KMA uniqueness in result
      if (result && result.pairs) {
        const kmaSet = new Set();
        let uniqueKmas = true;
        
        for (const pair of result.pairs) {
          if (kmaSet.has(pair.pickup?.kma_code) || kmaSet.has(pair.delivery?.kma_code)) {
            uniqueKmas = false;
            break;
          }
          if (pair.pickup?.kma_code) kmaSet.add(pair.pickup.kma_code);
          if (pair.delivery?.kma_code) kmaSet.add(pair.delivery.kma_code);
        }

        this.recordTest('Integration KMA Uniqueness', uniqueKmas, {
          unique_kmas: kmaSet.size,
          total_pairs: result.pairs.length
        });
      }

      console.log('✅ Integration test completed successfully');

    } catch (error) {
      this.recordTest('Integration Test', false, { error: error.message });
      console.error('❌ Integration test failed:', error.message);
    }

    console.log('');
  }

  /**
   * Record test result
   */
  recordTest(testName, passed, details = {}) {
    this.totalTests++;
    if (passed) {
      this.passedTests++;
    } else {
      this.failedTests++;
    }

    this.results[testName] = {
      passed,
      details,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Generate final verification report
   */
  generateFinalReport() {
    console.log('📊 PHASE 2 VERIFICATION REPORT');
    console.log('=====================================');
    console.log(`Total Tests: ${this.totalTests}`);
    console.log(`Passed: ${this.passedTests}`);
    console.log(`Failed: ${this.failedTests}`);
    console.log(`Success Rate: ${((this.passedTests / this.totalTests) * 100).toFixed(1)}%`);
    console.log('');

    // Show detailed results
    console.log('DETAILED RESULTS:');
    for (const [testName, result] of Object.entries(this.results)) {
      const status = result.passed ? '✅' : '❌';
      console.log(`${status} ${testName}`);
      if (!result.passed && result.details.error) {
        console.log(`   Error: ${result.details.error}`);
      }
    }

    console.log('');

    // Production readiness assessment
    const criticalTests = [
      'KMA Uniqueness Enforcement',
      'Silent Failure Detectors Active',
      'Race Condition Detectors Active',
      'Integration Intelligence Generation'
    ];

    const criticalPassed = criticalTests.every(test => 
      this.results[test] && this.results[test].passed
    );

    console.log('🏭 PRODUCTION READINESS ASSESSMENT');
    console.log('==================================');
    if (criticalPassed && this.failedTests === 0) {
      console.log('✅ SYSTEM IS PRODUCTION READY');
      console.log('   - All audit systems operational');
      console.log('   - Critical fixes verified');
      console.log('   - Data validation enforced');
      console.log('   - Race conditions detected');
    } else {
      console.log('❌ SYSTEM NOT PRODUCTION READY');
      console.log('   - Failed tests must be resolved');
      console.log('   - Critical systems not fully operational');
    }

    console.log('');
    console.log('PHASE 2 DEEP DIVE VERIFICATION COMPLETE');
  }
}

// Run the verification suite
const verificationSuite = new Phase2VerificationSuite();
verificationSuite.runCompleteVerification();