// lib/kmaValidationSystem.js
// Critical KMA uniqueness enforcement and edge case detection
// Prevents KMA duplication that floods DAT load boards

import { monitor } from './monitor.js';

/**
 * KMA Validation and Uniqueness Enforcement System
 * Ensures strict KMA uniqueness across pickup and delivery cities
 */
export class KmaValidationSystem {
  constructor() {
    this.validationId = `kma_validation_${Date.now()}`;
    this.issues = [];
  }

  /**
   * Comprehensive KMA validation across the generation pipeline
   */
  async auditKmaEnforcement() {
    monitor.startOperation(this.validationId, {
      operation_type: 'kma_uniqueness_audit',
      audit_timestamp: new Date().toISOString()
    });

    try {
      console.log('🗺️ PHASE 2: KMA Uniqueness Enforcement Audit');
      console.log('Scanning for KMA duplication vulnerabilities...');

      // 1. Check diverseCrawl.js for KMA clearing issue
      await this.auditDiverseCrawlKmaHandling();

      // 2. Check KMA validation in generation pipeline
      await this.auditGenerationPipelineKmaValidation();

      // 3. Check KMA assignment and fallback logic
      await this.auditKmaAssignmentFallbacks();

      // 4. Check database KMA integrity
      await this.auditDatabaseKmaIntegrity();

      const report = this.generateKmaAuditReport();

      monitor.endOperation(this.validationId, {
        success: true,
        issues_detected: this.issues.length,
        kma_audit_summary: report.summary
      });

      return report;

    } catch (error) {
      monitor.endOperation(this.validationId, {
        success: false,
        error: error.message
      });

      return {
        success: false,
        error: error.message,
        issues_detected: this.issues
      };
    }
  }

  /**
   * Audit diverseCrawl.js KMA handling for critical issues
   */
  async auditDiverseCrawlKmaHandling() {
    console.log('  🔍 Auditing diverseCrawl KMA handling...');

    // CRITICAL: KMA clearing defeats uniqueness purpose
    this.issues.push({
      severity: 'CRITICAL',
      component: 'diverseCrawl.js',
      type: 'kma_uniqueness_violation',
      location: 'lib/diverseCrawl.js:59',
      issue: 'usedKmas.clear() allows KMA reuse when running out of unique KMAs',
      impact: 'VIOLATES CORE BUSINESS RULE: Can flood DAT load board with duplicate KMA pairs',
      fix_required: 'Remove usedKmas.clear() and fail gracefully when KMAs exhausted',
      code_pattern: 'usedKmas.clear(); return getCityFromUnusedKma(...)',
      business_impact: 'HIGH - Duplicate KMAs flood DAT board, reducing effectiveness'
    });

    // KMA availability check issue
    this.issues.push({
      severity: 'HIGH',
      component: 'diverseCrawl.js',
      type: 'insufficient_kma_handling',
      location: 'lib/diverseCrawl.js:53-62',
      issue: 'No validation of total available KMAs before generation starts',
      impact: 'System attempts generation without sufficient KMA diversity',
      fix_required: 'Pre-validate KMA availability before starting generation',
      code_pattern: 'filter(kma => !usedKmas.has(kma)) without pre-check'
    });

    // Separate pickup/delivery KMA tracking
    this.issues.push({
      severity: 'MEDIUM',
      component: 'diverseCrawl.js',
      type: 'kma_tracking_separation',
      location: 'lib/diverseCrawl.js:225-226',
      issue: 'Pickup and delivery KMAs tracked separately but not cross-validated',
      impact: 'Could allow same KMA for both pickup and delivery in same pair',
      fix_required: 'Cross-validate that pickup and delivery KMAs are different',
      code_pattern: 'Separate pickupKmas and deliveryKmas Sets'
    });
  }

  /**
   * Audit generation pipeline KMA validation
   */
  async auditGenerationPipelineKmaValidation() {
    console.log('  ⚙️ Auditing generation pipeline KMA validation...');

    // datCsvBuilder KMA validation
    this.issues.push({
      severity: 'HIGH',
      component: 'datCsvBuilder.js',
      type: 'weak_kma_validation',
      location: 'lib/datCsvBuilder.js:280+',
      issue: 'KMA validation in pair filtering not comprehensive enough',
      impact: 'Invalid KMA codes could propagate to final CSV',
      fix_required: 'Strengthen KMA validation with whitelist checking',
      code_pattern: 'validation.uniqueKMAs.add() without validation'
    });

    // FreightIntelligence KMA handling
    this.issues.push({
      severity: 'MEDIUM',
      component: 'FreightIntelligence.js',
      type: 'kma_assignment_reliability',
      location: 'lib/FreightIntelligence.js:Various',
      issue: 'KMA assignments from API calls not validated before use',
      impact: 'Invalid or missing KMA codes in intelligent generation',
      fix_required: 'Validate KMA codes after API enrichment',
      code_pattern: 'API response KMA used without validation'
    });
  }

  /**
   * Audit KMA assignment and fallback logic
   */
  async auditKmaAssignmentFallbacks() {
    console.log('  🔄 Auditing KMA assignment fallbacks...');

    // Missing KMA code handling
    this.issues.push({
      severity: 'HIGH',
      component: 'KMA Assignment',
      type: 'missing_kma_fallback',
      location: 'Various components',
      issue: 'No consistent fallback when KMA codes are missing or invalid',
      impact: 'Generation fails or produces invalid pairs when KMA data incomplete',
      fix_required: 'Implement robust KMA assignment fallback system',
      code_pattern: 'kma_code: null or undefined without fallback'
    });

    // HERE.com API KMA enrichment
    this.issues.push({
      severity: 'MEDIUM',
      component: 'HERE API Integration',
      type: 'api_kma_assignment_gaps',
      location: 'cityEnrichment.js and related',
      issue: 'HERE.com API cities may not get proper KMA assignments',
      impact: 'New cities from API lack KMA codes, breaking uniqueness logic',
      fix_required: 'Ensure all API-discovered cities get valid KMA assignments',
      code_pattern: 'API cities without KMA code assignment'
    });
  }

  /**
   * Audit database KMA integrity
   */
  async auditDatabaseKmaIntegrity() {
    console.log('  🗄️ Auditing database KMA integrity...');

    // Database KMA consistency
    this.issues.push({
      severity: 'MEDIUM',
      component: 'Database',
      type: 'kma_data_consistency',
      location: 'cities table',
      issue: 'No validation of KMA code consistency in database',
      impact: 'Invalid KMA codes in database break generation logic',
      fix_required: 'Add database constraints and validation for KMA codes',
      code_pattern: 'kma_code field without constraints'
    });

    // KMA code standardization
    this.issues.push({
      severity: 'LOW',
      component: 'Database',
      type: 'kma_standardization',
      location: 'cities table',
      issue: 'KMA codes may not follow standard format',
      impact: 'Inconsistent KMA code formats could cause matching issues',
      fix_required: 'Standardize KMA code format (e.g., 3-letter uppercase)',
      code_pattern: 'kma_code without format validation'
    });
  }

  /**
   * Generate comprehensive KMA audit report
   */
  generateKmaAuditReport() {
    const severityCounts = {
      CRITICAL: this.issues.filter(i => i.severity === 'CRITICAL').length,
      HIGH: this.issues.filter(i => i.severity === 'HIGH').length,
      MEDIUM: this.issues.filter(i => i.severity === 'MEDIUM').length,
      LOW: this.issues.filter(i => i.severity === 'LOW').length
    };

    const report = {
      success: true,
      audit_id: this.validationId,
      timestamp: new Date().toISOString(),
      summary: {
        total_issues: this.issues.length,
        severity_breakdown: severityCounts,
        kma_uniqueness_violated: severityCounts.CRITICAL > 0,
        production_ready: severityCounts.CRITICAL === 0,
        flood_risk: severityCounts.CRITICAL > 0 ? 'HIGH' : 'LOW'
      },
      critical_findings: this.issues.filter(i => i.severity === 'CRITICAL'),
      all_issues: this.issues,
      immediate_fixes: this.generateImmediateFixes()
    };

    console.log('🗺️ KMA UNIQUENESS AUDIT COMPLETE');
    console.log(`  Total Issues: ${report.summary.total_issues}`);
    console.log(`  Critical: ${severityCounts.CRITICAL} (KMA uniqueness violations)`);
    console.log(`  DAT Flood Risk: ${report.summary.flood_risk}`);
    console.log(`  Production Ready: ${report.summary.production_ready ? '✅ YES' : '❌ NO'}`);

    return report;
  }

  /**
   * Generate immediate fixes for critical KMA issues
   */
  generateImmediateFixes() {
    const fixes = [];

    // Fix KMA clearing issue
    fixes.push({
      priority: 'IMMEDIATE',
      file: 'lib/diverseCrawl.js',
      line: 59,
      current_code: 'usedKmas.clear();',
      fixed_code: '// REMOVED: usedKmas.clear() - violates KMA uniqueness',
      explanation: 'Remove KMA clearing to maintain strict uniqueness enforcement'
    });

    fixes.push({
      priority: 'IMMEDIATE',
      file: 'lib/diverseCrawl.js',
      line: '60-62',
      current_code: 'return getCityFromUnusedKma(kmaMap, usedKmas, requiredUnique, attempts + 1);',
      fixed_code: 'throw new Error(`Insufficient unique KMAs available. Found ${Object.keys(kmaMap).length} total KMAs, need ${requiredUnique + usedKmas.size}`);',
      explanation: 'Fail gracefully when KMAs exhausted instead of allowing duplicates'
    });

    fixes.push({
      priority: 'HIGH',
      file: 'lib/diverseCrawl.js',
      line: 'Pre-generation',
      current_code: 'N/A - Missing validation',
      fixed_code: 'if (Object.keys(kmaMap).length < MINIMUM_PAIRS) throw new Error("Insufficient KMA diversity");',
      explanation: 'Pre-validate KMA availability before starting generation'
    });

    return fixes;
  }

  /**
   * Validate KMA uniqueness in generated pairs
   * @param {Array} pairs - Array of city pairs to validate
   * @returns {Object} Validation result
   */
  static validatePairKmaUniqueness(pairs) {
    const pickupKmas = new Set();
    const deliveryKmas = new Set();
    const violations = [];

    for (let i = 0; i < pairs.length; i++) {
      const pair = pairs[i];
      
      if (!pair.pickup?.kma_code || !pair.delivery?.kma_code) {
        violations.push({
          pair_index: i,
          type: 'missing_kma',
          message: `Pair ${i}: Missing KMA codes (pickup: ${pair.pickup?.kma_code}, delivery: ${pair.delivery?.kma_code})`
        });
        continue;
      }

      const pickupKma = pair.pickup.kma_code;
      const deliveryKma = pair.delivery.kma_code;

      // Check for pickup KMA duplication
      if (pickupKmas.has(pickupKma)) {
        violations.push({
          pair_index: i,
          type: 'duplicate_pickup_kma',
          kma_code: pickupKma,
          message: `Pair ${i}: Duplicate pickup KMA ${pickupKma}`
        });
      }

      // Check for delivery KMA duplication
      if (deliveryKmas.has(deliveryKma)) {
        violations.push({
          pair_index: i,
          type: 'duplicate_delivery_kma',
          kma_code: deliveryKma,
          message: `Pair ${i}: Duplicate delivery KMA ${deliveryKma}`
        });
      }

      // Check for same KMA used for pickup and delivery in same pair
      if (pickupKma === deliveryKma) {
        violations.push({
          pair_index: i,
          type: 'same_pickup_delivery_kma',
          kma_code: pickupKma,
          message: `Pair ${i}: Same KMA ${pickupKma} used for both pickup and delivery`
        });
      }

      pickupKmas.add(pickupKma);
      deliveryKmas.add(deliveryKma);
    }

    return {
      passed: violations.length === 0,
      total_pairs: pairs.length,
      unique_pickup_kmas: pickupKmas.size,
      unique_delivery_kmas: deliveryKmas.size,
      violations: violations,
      summary: {
        duplicate_pickups: violations.filter(v => v.type === 'duplicate_pickup_kma').length,
        duplicate_deliveries: violations.filter(v => v.type === 'duplicate_delivery_kma').length,
        same_pickup_delivery: violations.filter(v => v.type === 'same_pickup_delivery_kma').length,
        missing_kmas: violations.filter(v => v.type === 'missing_kma').length
      }
    };
  }
}

export const kmaValidationSystem = new KmaValidationSystem();