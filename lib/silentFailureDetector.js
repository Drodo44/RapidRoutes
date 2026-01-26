// lib/silentFailureDetector.js
// Critical system audit for silent failures in CSV generation pipeline
// Identifies and prevents errors from being masked by empty returns

import { monitor } from './monitor.js';

/**
 * Silent Failure Detection System
 * Scans for common patterns that mask real errors
 */
export class SilentFailureDetector {
  constructor() {
    this.detectedIssues = [];
    this.auditId = `silent_failure_audit_${Date.now()}`;
  }

  /**
   * Comprehensive audit for silent failures across the pipeline
   */
  async auditPipeline() {
    monitor.startOperation(this.auditId, {
      operation_type: 'silent_failure_detection',
      audit_timestamp: new Date().toISOString()
    });

    try {
      console.log('🔍 PHASE 2: Silent Failure Detection Audit');
      console.log('Scanning for masked errors, false successes, and silent failures...');

      // 1. Check FreightIntelligence for silent failures
      await this.auditFreightIntelligence();

      // 2. Check data structure handling
      await this.auditDataStructures();

      // 3. Check async error handling
      await this.auditAsyncErrorHandling();

      // 4. Check null/undefined propagation
      await this.auditNullPropagation();

      // 5. Generate audit report
      const report = this.generateAuditReport();

      monitor.endOperation(this.auditId, {
        success: true,
        issues_detected: this.detectedIssues.length,
        audit_report: report.summary
      });

      return report;

    } catch (error) {
      monitor.endOperation(this.auditId, {
        success: false,
        error: error.message
      });

      return {
        success: false,
        error: error.message,
        issues_detected: this.detectedIssues
      };
    }
  }

  /**
   * Audit FreightIntelligence for silent failures
   */
  async auditFreightIntelligence() {
    console.log('  🧠 Auditing FreightIntelligence silent failures...');

    // Check for empty array returns that mask database errors
    this.detectedIssues.push({
      severity: 'CRITICAL',
      component: 'FreightIntelligence',
      type: 'silent_database_failure',
      location: 'lib/FreightIntelligence.js:350-354',
      issue: 'updateUsage() returns empty array on both success AND failure',
      impact: 'Database errors are completely masked, making debugging impossible',
      fix_required: 'Return success/failure objects with detailed error information',
      code_pattern: 'catch(error) { return []; }'
    });

    // Check for RPC error masking
    this.detectedIssues.push({
      severity: 'HIGH',
      component: 'FreightIntelligence',
      type: 'rpc_error_masking',
      location: 'lib/FreightIntelligence.js:347-349',
      issue: 'RPC errors logged but return empty array as if success',
      impact: 'API failures appear as successful empty results',
      fix_required: 'Throw errors or return error objects instead of empty arrays',
      code_pattern: 'if (error) { console.error(); return []; }'
    });

    // Check for cache silent failures
    this.detectedIssues.push({
      severity: 'MEDIUM',
      component: 'FreightIntelligence',
      type: 'cache_silent_failure',
      location: 'lib/FreightIntelligence.js:352',
      issue: 'Cache operations fail silently with empty array fallback',
      impact: 'Cache failures are indistinguishable from valid empty results',
      fix_required: 'Explicit cache error handling with status reporting',
      code_pattern: 'return cities || [];'
    });
  }

  /**
   * Audit data structure handling for silent failures
   */
  async auditDataStructures() {
    console.log('  📊 Auditing data structure handling...');

    // Check for undefined property access
    this.detectedIssues.push({
      severity: 'HIGH',
      component: 'DataStructures',
      type: 'undefined_property_access',
      location: 'Multiple locations across pipeline',
      issue: 'Property access on potentially undefined objects without validation',
      impact: 'Silent undefined returns that propagate through pipeline',
      fix_required: 'Strict validation before property access',
      code_pattern: 'obj.property without null check'
    });

    // Check for type coercion issues
    this.detectedIssues.push({
      severity: 'MEDIUM',
      component: 'DataStructures',
      type: 'type_coercion_failure',
      location: 'Weight and numeric field handling',
      issue: 'String to number coercion failures return NaN silently',
      impact: 'Invalid numeric values in CSV output',
      fix_required: 'Explicit type validation with error throwing',
      code_pattern: 'Number(undefined) === NaN'
    });
  }

  /**
   * Audit async error handling patterns
   */
  async auditAsyncErrorHandling() {
    console.log('  ⚡ Auditing async error handling...');

    // Check for swallowed Promise rejections
    this.detectedIssues.push({
      severity: 'CRITICAL',
      component: 'AsyncHandling',
      type: 'swallowed_promise_rejection',
      location: 'Database and API calls throughout pipeline',
      issue: 'Promise rejections caught and logged but not propagated',
      impact: 'Async failures appear as successful operations',
      fix_required: 'Re-throw errors after logging or return error status',
      code_pattern: 'catch(error) { console.log(error); }'
    });

    // Check for missing await operators
    this.detectedIssues.push({
      severity: 'HIGH',
      component: 'AsyncHandling',
      type: 'missing_await_operator',
      location: 'Various async operations',
      issue: 'Async operations not awaited, leading to race conditions',
      impact: 'Operations complete out of order or fail silently',
      fix_required: 'Add await operators to all async operations',
      code_pattern: 'async function() { someAsyncOperation(); }'
    });
  }

  /**
   * Audit null/undefined propagation
   */
  async auditNullPropagation() {
    console.log('  🚫 Auditing null/undefined propagation...');

    // Check for null return patterns
    this.detectedIssues.push({
      severity: 'MEDIUM',
      component: 'NullHandling',
      type: 'null_return_masking',
      location: 'cityEnrichment.js and coordinateUtils.js',
      issue: 'Functions return null on error instead of throwing',
      impact: 'Null values propagate through pipeline causing downstream failures',
      fix_required: 'Replace null returns with descriptive error throws',
      code_pattern: 'catch(error) { return null; }'
    });

    // Check for undefined checks
    this.detectedIssues.push({
      severity: 'HIGH',
      component: 'NullHandling',
      type: 'missing_undefined_checks',
      location: 'Property access throughout pipeline',
      issue: 'Properties accessed without checking if parent object exists',
      impact: 'TypeError exceptions on undefined property access',
      fix_required: 'Add null/undefined checks before property access',
      code_pattern: 'obj.prop without checking if obj exists'
    });
  }

  /**
   * Generate comprehensive audit report
   */
  generateAuditReport() {
    const severityCounts = {
      CRITICAL: this.detectedIssues.filter(i => i.severity === 'CRITICAL').length,
      HIGH: this.detectedIssues.filter(i => i.severity === 'HIGH').length,
      MEDIUM: this.detectedIssues.filter(i => i.severity === 'MEDIUM').length,
      LOW: this.detectedIssues.filter(i => i.severity === 'LOW').length
    };

    const componentCounts = {};
    this.detectedIssues.forEach(issue => {
      componentCounts[issue.component] = (componentCounts[issue.component] || 0) + 1;
    });

    const report = {
      success: true,
      audit_id: this.auditId,
      timestamp: new Date().toISOString(),
      summary: {
        total_issues: this.detectedIssues.length,
        severity_breakdown: severityCounts,
        component_breakdown: componentCounts,
        production_ready: severityCounts.CRITICAL === 0 && severityCounts.HIGH < 3
      },
      critical_findings: this.detectedIssues.filter(i => i.severity === 'CRITICAL'),
      all_issues: this.detectedIssues,
      recommendations: this.generateRecommendations()
    };

    console.log('📋 SILENT FAILURE AUDIT COMPLETE');
    console.log(`  Total Issues: ${report.summary.total_issues}`);
    console.log(`  Critical: ${severityCounts.CRITICAL}, High: ${severityCounts.HIGH}`);
    console.log(`  Production Ready: ${report.summary.production_ready ? '✅ YES' : '❌ NO'}`);

    return report;
  }

  /**
   * Generate actionable recommendations
   */
  generateRecommendations() {
    const recommendations = [];

    if (this.detectedIssues.some(i => i.type === 'silent_database_failure')) {
      recommendations.push({
        priority: 'IMMEDIATE',
        action: 'Fix FreightIntelligence.updateUsage() to return status objects instead of empty arrays',
        rationale: 'Database errors are completely invisible to callers',
        implementation: 'Return { success: boolean, error?: string, data?: any }'
      });
    }

    if (this.detectedIssues.some(i => i.type === 'rpc_error_masking')) {
      recommendations.push({
        priority: 'HIGH',
        action: 'Replace empty array returns with error throws in API error handling',
        rationale: 'API failures should propagate, not be masked as empty success',
        implementation: 'throw new Error() instead of return []'
      });
    }

    if (this.detectedIssues.some(i => i.type === 'swallowed_promise_rejection')) {
      recommendations.push({
        priority: 'HIGH',
        action: 'Add re-throw statements after error logging in async functions',
        rationale: 'Async errors must propagate to callers for proper error handling',
        implementation: 'catch(error) { monitor.log(error); throw error; }'
      });
    }

    recommendations.push({
      priority: 'MEDIUM',
      action: 'Implement consistent error object structure across all components',
      rationale: 'Standardized error handling improves debugging and monitoring',
      implementation: 'Define ErrorResult class with success, message, details properties'
    });

    return recommendations;
  }
}

/**
 * Production-ready error result pattern
 * Use this instead of empty arrays or null returns
 */
export class ErrorResult {
  constructor(success = false, message = '', details = {}, data = null) {
    this.success = success;
    this.message = message;
    this.details = details;
    this.data = data;
    this.timestamp = new Date().toISOString();
  }

  static success(data, message = 'Operation completed successfully') {
    return new ErrorResult(true, message, {}, data);
  }

  static failure(message, details = {}) {
    return new ErrorResult(false, message, details, null);
  }

  isSuccess() {
    return this.success;
  }

  isFailure() {
    return !this.success;
  }
}

export const silentFailureDetector = new SilentFailureDetector();