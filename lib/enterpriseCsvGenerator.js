// lib/enterpriseCsvGenerator.js
// Enterprise-grade CSV generation system
// Integrates all validation, monitoring, transactions, and verification

import { validateLane, validateDataset, ValidationError } from './enterpriseValidation.js';
import { verifyCsvStructure, verifyCompleteCSV, CsvVerificationError } from './csvVerification.js';
import { CsvGenerationTransaction, generateCsvAtomically } from './transactionManager.js';
import { CsvGenerationMonitor, enterpriseMonitor } from './enterpriseMonitor.js';
import { generateDatCsvRows, DAT_HEADERS } from './datCsvBuilder.js';
import { toCsv, chunkRows } from '../utils/datExport.js';
import { monitor } from './monitor.js';

/**
 * Enterprise CSV generation error with full context
 */
export class EnterpriseCsvError extends Error {
  constructor(message, details = {}) {
    super(message);
    this.name = 'EnterpriseCsvError';
    this.details = details;
    this.isEnterpriseCsvError = true;
  }
}

/**
 * Enterprise-grade CSV generation configuration
 */
export const ENTERPRISE_CSV_CONFIG = {
  validation: {
    strictSchemaValidation: true,
    requireAllFields: true,
    validateBusinessRules: true,
    failOnFirstError: false // Collect all errors before failing
  },
  generation: {
    minPairsPerLane: 6,
    maxConcurrentLanes: 10,
    enableTransactions: true,
    enableCaching: true
  },
  verification: {
    postGenerationVerification: true,
    structureValidation: true,
    businessValidation: true,
    maxRowsToVerify: 10000
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

/**
 * Enterprise CSV Generation Pipeline
 * Provides guaranteed reliability, auditability, and performance
 */
export class EnterpriseCsvGenerator {
  constructor(config = {}) {
    this.config = { ...ENTERPRISE_CSV_CONFIG, ...config };
    this.operationId = null;
    this.monitor = null;
    this.transaction = null;
  }

  /**
   * Generate CSV with full enterprise guarantees
   * @param {Array} lanes - Array of lane objects
   * @param {Object} options - Generation options
   * @returns {Promise<Object>} Generation result with CSV data and metadata
   */
  async generate(lanes, options = {}) {
    this.operationId = `enterprise_csv_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    
    try {
      // Phase 1: Pre-generation validation
      await this._preGenerationValidation(lanes, options);

      // Phase 2: Initialize monitoring and transaction
      this.monitor = new CsvGenerationMonitor(lanes, { ...this.config, ...options });
      this.transaction = new CsvGenerationTransaction(lanes, this.operationId);

      // Phase 3: Generate CSV rows with full monitoring
      const generationResult = await this._generateCsvRows(lanes);

      // Phase 4: Post-generation verification
      const verificationResult = await this._postGenerationVerification(generationResult);

      // Phase 5: Finalize transaction and create output
      const finalResult = await this._finalizeGeneration(generationResult, verificationResult);

      return finalResult;

    } catch (error) {
      return await this._handleGenerationFailure(error);
    }
  }

  /**
   * Phase 1: Pre-generation validation
   */
  async _preGenerationValidation(lanes, options) {
    const phaseId = `${this.operationId}_validation`;
    const traceId = enterpriseMonitor.startOperation(phaseId, {
      operation_type: 'pre_generation_validation',
      lanes_count: lanes.length,
      validation_config: this.config.validation
    });

    try {
      enterpriseMonitor.logStep(phaseId, 'validate_input_parameters');

      // Validate input parameters
      if (!Array.isArray(lanes)) {
        throw new ValidationError('Lanes must be an array', { 
          received_type: typeof lanes,
          trace_id: traceId 
        });
      }

      if (lanes.length === 0) {
        throw new ValidationError('Cannot generate CSV from empty lanes array', { 
          trace_id: traceId 
        });
      }

      if (lanes.length > 1000) {
        enterpriseMonitor.logWarning(phaseId, `Large dataset detected: ${lanes.length} lanes`, {
          lanes_count: lanes.length,
          recommended_max: 1000
        });
      }

      enterpriseMonitor.logStep(phaseId, 'validate_dataset_schema');

      // Validate dataset schema
      if (this.config.validation.strictSchemaValidation) {
        const datasetValidation = validateDataset(lanes);
        enterpriseMonitor.logStep(phaseId, 'dataset_validation_complete', datasetValidation);
      }

      enterpriseMonitor.logStep(phaseId, 'validate_individual_lanes');

      // Validate individual lanes with error collection
      const validationErrors = [];
      const validationWarnings = [];

      for (let i = 0; i < lanes.length; i++) {
        const lane = lanes[i];
        
        try {
          validateLane(lane);
          enterpriseMonitor.recordMetric(phaseId, 'lanes_validated', 1, 'count');
        } catch (error) {
          if (error.isValidationError) {
            validationErrors.push({
              lane_index: i,
              lane_id: lane?.id,
              error: error.message,
              details: error.details
            });

            if (this.config.validation.failOnFirstError) {
              throw new EnterpriseCsvError(
                `Lane validation failed at index ${i}: ${error.message}`,
                { 
                  lane_index: i,
                  lane_id: lane?.id,
                  validation_errors: [error.details],
                  trace_id: traceId
                }
              );
            }
          } else {
            throw error; // Re-throw non-validation errors
          }
        }
      }

      // Handle validation errors
      if (validationErrors.length > 0) {
        const errorSummary = {
          total_errors: validationErrors.length,
          error_rate: Math.round((validationErrors.length / lanes.length) * 100),
          sample_errors: validationErrors.slice(0, 5)
        };

        enterpriseMonitor.logError(phaseId, new EnterpriseCsvError(
          `Dataset validation failed: ${validationErrors.length} of ${lanes.length} lanes are invalid`,
          errorSummary
        ));

        throw new EnterpriseCsvError(
          `Pre-generation validation failed: ${validationErrors.length} lanes have validation errors`,
          {
            validation_errors: validationErrors,
            error_summary: errorSummary,
            trace_id: traceId
          }
        );
      }

      enterpriseMonitor.endOperation(phaseId, {
        success: true,
        lanes_validated: lanes.length,
        validation_errors: validationErrors.length,
        validation_warnings: validationWarnings.length
      });

      monitor.log('info', `✅ Pre-generation validation passed: ${lanes.length} lanes validated`);

    } catch (error) {
      enterpriseMonitor.endOperation(phaseId, { 
        success: false, 
        error: error.message 
      });
      throw error;
    }
  }

  /**
   * Phase 2: Generate CSV rows with monitoring
   */
  async _generateCsvRows(lanes) {
    const phaseId = `${this.operationId}_generation`;
    const traceId = enterpriseMonitor.startOperation(phaseId, {
      operation_type: 'csv_row_generation',
      lanes_count: lanes.length,
      generation_config: this.config.generation
    });

    try {
      const allRows = [];
      const laneResults = [];
      const generationErrors = [];

      enterpriseMonitor.logStep(phaseId, 'start_lane_processing');

      // Process lanes with concurrency control
      const concurrentBatches = [];
      for (let i = 0; i < lanes.length; i += this.config.generation.maxConcurrentLanes) {
        const batch = lanes.slice(i, i + this.config.generation.maxConcurrentLanes);
        concurrentBatches.push(batch);
      }

      for (const [batchIndex, batch] of concurrentBatches.entries()) {
        enterpriseMonitor.logStep(phaseId, `process_batch_${batchIndex}`, {
          batch_index: batchIndex,
          batch_size: batch.length
        });

        // Process batch lanes concurrently
        const batchPromises = batch.map(async (lane, laneIndex) => {
          const globalLaneIndex = (batchIndex * this.config.generation.maxConcurrentLanes) + laneIndex;
          const laneStartTime = this.monitor.startLaneProcessing(lane.id);

          try {
            const rows = await generateDatCsvRows(lane);
            
            if (!rows || !Array.isArray(rows) || rows.length === 0) {
              throw new EnterpriseCsvError(`No rows generated for lane ${lane.id}`, {
                lane_id: lane.id,
                lane_index: globalLaneIndex
              });
            }

            // Validate minimum row requirements
            const minRowsRequired = this.config.generation.minPairsPerLane * 2; // 2 contact methods per pair
            if (rows.length < minRowsRequired) {
              throw new EnterpriseCsvError(
                `Insufficient rows generated for lane ${lane.id}: got ${rows.length}, need ${minRowsRequired}`,
                {
                  lane_id: lane.id,
                  rows_generated: rows.length,
                  rows_required: minRowsRequired
                }
              );
            }

            // Add to transaction
            this.transaction.addGeneratedRows(lane.id, rows);
            
            this.monitor.completeLaneProcessing(lane.id, laneStartTime, rows.length);
            
            return {
              lane_id: lane.id,
              lane_index: globalLaneIndex,
              rows,
              success: true
            };

          } catch (error) {
            this.monitor.completeLaneProcessing(lane.id, laneStartTime, 0, error);
            
            generationErrors.push({
              lane_id: lane.id,
              lane_index: globalLaneIndex,
              error: error.message,
              details: error.details || {}
            });

            return {
              lane_id: lane.id,
              lane_index: globalLaneIndex,
              error: error.message,
              success: false
            };
          }
        });

        // PHASE 3 FIX: Use Promise.allSettled to prevent single lane failure from breaking entire batch
        const batchResults = await Promise.allSettled(batchPromises);
        
        // Process results with proper error handling
        for (let i = 0; i < batchResults.length; i++) {
          const result = batchResults[i];
          if (result.status === 'fulfilled') {
            laneResults.push(result.value);
            // Collect successful rows
            if (result.value.success && result.value.rows) {
              allRows.push(...result.value.rows);
            }
          } else {
            // Handle rejected promises
            const failedLane = batch[i];
            const errorResult = {
              lane_id: failedLane.id,
              lane_index: globalLaneIndex + i,
              error: result.reason?.message || 'Unknown batch processing error',
              success: false
            };
            laneResults.push(errorResult);
            enterpriseMonitor.recordMetric(phaseId, 'lane_batch_failure', 1, 'count');
          }
        }

        enterpriseMonitor.recordMetric(phaseId, 'batch_processed', 1, 'count');
      }

      // Validate generation results
      const successfulLanes = laneResults.filter(r => r.success).length;
      const failedLanes = laneResults.filter(r => !r.success).length;

      if (successfulLanes === 0) {
        throw new EnterpriseCsvError(
          'CSV generation completely failed: no lanes produced valid rows',
          {
            total_lanes: lanes.length,
            failed_lanes: failedLanes,
            generation_errors: generationErrors,
            trace_id: traceId
          }
        );
      }

      if (failedLanes > 0) {
        const failureRate = Math.round((failedLanes / lanes.length) * 100);
        enterpriseMonitor.logWarning(phaseId, 
          `Partial generation failure: ${failedLanes} of ${lanes.length} lanes failed (${failureRate}%)`,
          {
            successful_lanes: successfulLanes,
            failed_lanes: failedLanes,
            failure_rate: failureRate,
            sample_errors: generationErrors.slice(0, 3)
          }
        );
      }

      enterpriseMonitor.endOperation(phaseId, {
        success: true,
        total_rows: allRows.length,
        successful_lanes: successfulLanes,
        failed_lanes: failedLanes,
        generation_errors: generationErrors.length
      });

      return {
        rows: allRows,
        lane_results: laneResults,
        generation_errors: generationErrors,
        statistics: {
          total_lanes: lanes.length,
          successful_lanes: successfulLanes,
          failed_lanes: failedLanes,
          total_rows: allRows.length,
          avg_rows_per_lane: successfulLanes > 0 ? Math.round(allRows.length / successfulLanes) : 0
        }
      };

    } catch (error) {
      enterpriseMonitor.endOperation(phaseId, { 
        success: false, 
        error: error.message 
      });
      throw error;
    }
  }

  /**
   * Phase 3: Post-generation verification
   */
  async _postGenerationVerification(generationResult) {
    if (!this.config.verification.postGenerationVerification) {
      return { 
        skipped: true, 
        reason: 'post-generation verification disabled' 
      };
    }

    const phaseId = `${this.operationId}_verification`;
    const traceId = enterpriseMonitor.startOperation(phaseId, {
      operation_type: 'post_generation_verification',
      rows_count: generationResult.rows.length,
      verification_config: this.config.verification
    });

    try {
      enterpriseMonitor.logStep(phaseId, 'generate_csv_string');

      // Generate CSV string for verification
      const csvString = toCsv(DAT_HEADERS, generationResult.rows);
      
      enterpriseMonitor.logStep(phaseId, 'verify_csv_structure');

      // Verify CSV structure
      const verificationResult = verifyCompleteCSV(
        csvString,
        generationResult.lane_results.filter(r => r.success).map(r => ({ id: r.lane_id })),
        {
          strictHeaderValidation: this.config.verification.structureValidation,
          requireAllFields: this.config.verification.businessValidation,
          validateBusinessRules: this.config.verification.businessValidation,
          maxRowsToCheck: this.config.verification.maxRowsToVerify
        }
      );

      if (!verificationResult.valid) {
        const verificationError = new CsvVerificationError(
          `Post-generation verification failed: ${verificationResult.summary.totalErrors} errors found`,
          {
            verification_result: verificationResult,
            trace_id: traceId
          }
        );

        enterpriseMonitor.logError(phaseId, verificationError);
        
        if (this.config.validation.failOnFirstError) {
          throw verificationError;
        }
      }

      enterpriseMonitor.endOperation(phaseId, {
        success: verificationResult.valid,
        verification_errors: verificationResult.summary.totalErrors,
        verification_warnings: verificationResult.summary.totalWarnings,
        csv_size: csvString.length
      });

      return {
        csv_string: csvString,
        verification_result: verificationResult,
        valid: verificationResult.valid
      };

    } catch (error) {
      enterpriseMonitor.endOperation(phaseId, { 
        success: false, 
        error: error.message 
      });
      throw error;
    }
  }

  /**
   * Phase 4: Finalize generation
   */
  async _finalizeGeneration(generationResult, verificationResult) {
    const phaseId = `${this.operationId}_finalization`;
    const traceId = enterpriseMonitor.startOperation(phaseId, {
      operation_type: 'generation_finalization',
      rows_count: generationResult.rows.length
    });

    try {
      enterpriseMonitor.logStep(phaseId, 'commit_transaction');

      // Commit transaction if enabled
      let transactionResult = null;
      if (this.config.generation.enableTransactions) {
        transactionResult = await this.transaction.commit();
      }

      enterpriseMonitor.logStep(phaseId, 'prepare_output');

      // Prepare final output
      const csvString = verificationResult.csv_string || toCsv(DAT_HEADERS, generationResult.rows);
      
      // Chunk if required
      const chunks = this.config.output.enableChunking 
        ? chunkRows(generationResult.rows, this.config.output.maxRowsPerFile)
        : [generationResult.rows];

      const result = {
        success: true,
        operation_id: this.operationId,
        csv: {
          string: csvString,
          size_bytes: csvString.length,
          rows_count: generationResult.rows.length,
          headers: DAT_HEADERS,
          chunks_count: chunks.length
        },
        chunks: chunks.map((chunk, index) => ({
          index: index + 1,
          rows: chunk,
          csv_string: toCsv(DAT_HEADERS, chunk),
          filename: chunks.length > 1 ? `DAT_Export_part${index + 1}-of-${chunks.length}.csv` : 'DAT_Export.csv'
        })),
        statistics: generationResult.statistics,
        generation_errors: generationResult.generation_errors,
        verification: verificationResult.valid ? 'passed' : 'failed',
        verification_details: verificationResult.verification_result,
        transaction: transactionResult,
        monitoring: this.monitor.completeCsvGeneration(csvString, true)
      };

      enterpriseMonitor.endOperation(phaseId, {
        success: true,
        csv_size: csvString.length,
        chunks_count: chunks.length,
        verification_passed: verificationResult.valid
      });

      monitor.log('info', `🎯 Enterprise CSV generation completed successfully`, {
        operation_id: this.operationId,
        rows: generationResult.rows.length,
        chunks: chunks.length,
        verification: verificationResult.valid ? 'PASSED' : 'FAILED'
      });

      return result;

    } catch (error) {
      enterpriseMonitor.endOperation(phaseId, { 
        success: false, 
        error: error.message 
      });
      throw error;
    }
  }

  /**
   * Handle generation failure
   */
  async _handleGenerationFailure(error) {
    const failureResult = {
      success: false,
      operation_id: this.operationId,
      error: {
        message: error.message,
        type: error.name,
        details: error.details || {},
        stack: error.stack
      },
      monitoring: this.monitor ? this.monitor.completeCsvGeneration(null, false, error) : null
    };

    // Log enterprise-level failure
    enterpriseMonitor.logError(this.operationId || 'unknown', error, {
      operation_type: 'enterprise_csv_generation',
      failure_point: error.details?.phase || 'unknown'
    });

    monitor.log('error', `❌ Enterprise CSV generation failed: ${error.message}`, {
      operation_id: this.operationId,
      error_type: error.name,
      error_details: error.details
    });

    return failureResult;
  }

  /**
   * Get generation status
   */
  getStatus() {
    return {
      operation_id: this.operationId,
      config: this.config,
      monitor_status: this.monitor ? this.monitor.getStatus() : null,
      transaction_status: this.transaction ? this.transaction.getStatus() : null,
      system_health: enterpriseMonitor.getSystemHealth()
    };
  }
}

/**
 * High-level enterprise CSV generation function
 * @param {Array} lanes - Lanes to process
 * @param {Object} options - Generation options
 * @returns {Promise<Object>} Generation result
 */
export async function generateEnterpriseCsv(lanes, options = {}) {
  const generator = new EnterpriseCsvGenerator(options.config);
  return await generator.generate(lanes, options);
}

/**
 * Quick validation-only function for testing
 * @param {Array} lanes - Lanes to validate
 * @returns {Promise<Object>} Validation result
 */
export async function validateEnterpriseCsv(lanes) {  
  const generator = new EnterpriseCsvGenerator({
    validation: { strictSchemaValidation: true },
    generation: { enableTransactions: false },
    verification: { postGenerationVerification: false },
    monitoring: { enableDetailedLogging: false }
  });

  try {
    await generator._preGenerationValidation(lanes, {});
    return { valid: true, lanes_validated: lanes.length };
  } catch (error) {
    return { 
      valid: false, 
      error: error.message, 
      details: error.details 
    };
  }
}