// lib/enterpriseMonitor.js
// Enterprise-grade monitoring and logging system
// Provides full auditability, error correlation, and performance tracking

import { monitor } from './monitor.js';

/**
 * Enterprise monitoring system with trace correlation
 */
export class EnterpriseMonitor {
  constructor() {
    this.activeOperations = new Map();
    this.errorGroups = new Map();
    this.performanceMetrics = new Map();
    this.auditLog = [];
  }

  /**
   * Start a trackable operation with full context
   */
  startOperation(operationId, context = {}) {
    const operation = {
      id: operationId,
      startTime: Date.now(),
      context: {
        ...context,
        trace_id: context.trace_id || `trace_${Date.now()}_${Math.random().toString(36).slice(2)}`,
        timestamp: new Date().toISOString(),
        pid: process.pid,
        memory_start: process.memoryUsage()
      },
      steps: [],
      errors: [],
      warnings: [],
      completed: false,
      success: null
    };

    this.activeOperations.set(operationId, operation);
    
    this.log('info', `🚀 Started operation: ${operationId}`, operation.context);
    return operation.context.trace_id;
  }

  /**
   * Log a step within an operation
   */
  logStep(operationId, stepName, data = {}) {
    const operation = this.activeOperations.get(operationId);
    if (!operation) {
      this.log('warn', `Step logged for unknown operation: ${operationId}`);
      return;
    }

    const step = {
      name: stepName,
      timestamp: new Date().toISOString(),
      elapsed: Date.now() - operation.startTime,
      data
    };

    operation.steps.push(step);
    this.log('debug', `📝 ${operationId} - ${stepName}`, { ...step, trace_id: operation.context.trace_id });
  }

  /**
   * Log an error with full correlation context
   */
  logError(operationId, error, context = {}) {
    const errorEntry = {
      timestamp: new Date().toISOString(),
      error: {
        message: error.message,
        stack: error.stack,
        name: error.name,
        code: error.code,
        details: error.details || {}
      },
      context: {
        ...context,
        operation_id: operationId
      }
    };

    // Add to operation if it exists
    const operation = this.activeOperations.get(operationId);
    if (operation) {
      operation.errors.push(errorEntry);
      errorEntry.context.trace_id = operation.context.trace_id;
    }

    // Group similar errors
    const errorKey = `${error.name}_${error.message.substring(0, 50)}`;
    if (!this.errorGroups.has(errorKey)) {
      this.errorGroups.set(errorKey, {
        key: errorKey,
        count: 0,
        first_seen: errorEntry.timestamp,
        last_seen: errorEntry.timestamp,
        sample_error: errorEntry
      });
    }

    const group = this.errorGroups.get(errorKey);
    group.count++;
    group.last_seen = errorEntry.timestamp;

    this.log('error', `❌ ${operationId} - ${error.message}`, errorEntry.context);
    return errorEntry;
  }

  /**
   * Log a warning with correlation
   */
  logWarning(operationId, message, context = {}) {
    const warningEntry = {
      timestamp: new Date().toISOString(),
      message,
      context: {
        ...context,
        operation_id: operationId
      }
    };

    const operation = this.activeOperations.get(operationId);
    if (operation) {
      operation.warnings.push(warningEntry);
      warningEntry.context.trace_id = operation.context.trace_id;
    }

    this.log('warn', `⚠️ ${operationId} - ${message}`, warningEntry.context);
    return warningEntry;
  }

  /**
   * Record performance metrics
   */
  recordMetric(operationId, metricName, value, unit = 'count') {
    const metric = {
      operation_id: operationId,
      name: metricName,
      value,
      unit,
      timestamp: new Date().toISOString()
    };

    const operation = this.activeOperations.get(operationId);
    if (operation) {
      metric.trace_id = operation.context.trace_id;
      metric.elapsed = Date.now() - operation.startTime;
    }

    // Store in performance metrics
    const metricKey = `${operationId}_${metricName}`;
    if (!this.performanceMetrics.has(metricKey)) {
      this.performanceMetrics.set(metricKey, []);
    }
    this.performanceMetrics.get(metricKey).push(metric);

    this.log('debug', `📊 ${operationId} - ${metricName}: ${value} ${unit}`, { 
      trace_id: metric.trace_id,
      metric_name: metricName,
      metric_value: value,
      metric_unit: unit
    });
  }

  /**
   * End an operation with results
   */
  endOperation(operationId, result = {}) {
    const operation = this.activeOperations.get(operationId);
    if (!operation) {
      this.log('warn', `Attempted to end unknown operation: ${operationId}`);
      return;
    }

    const endTime = Date.now();
    const duration = endTime - operation.startTime;
    const memoryEnd = process.memoryUsage();

    operation.completed = true;
    operation.success = result.success !== false && operation.errors.length === 0;
    operation.endTime = endTime;
    operation.duration = duration;
    operation.result = result;
    operation.context.memory_end = memoryEnd;
    operation.context.memory_delta = {
      rss: memoryEnd.rss - operation.context.memory_start.rss,
      heapUsed: memoryEnd.heapUsed - operation.context.memory_start.heapUsed,
      heapTotal: memoryEnd.heapTotal - operation.context.memory_start.heapTotal,
      external: memoryEnd.external - operation.context.memory_start.external
    };

    // Create audit entry
    const auditEntry = {
      operation_id: operationId,
      trace_id: operation.context.trace_id,
      start_time: operation.startTime,
      end_time: endTime,
      duration,
      success: operation.success,
      steps_count: operation.steps.length,
      errors_count: operation.errors.length,
      warnings_count: operation.warnings.length,
      result,
      context: operation.context
    };

    this.auditLog.push(auditEntry);

    // Log completion
    const status = operation.success ? '✅ COMPLETED' : '❌ FAILED';
    this.log('info', `${status}: ${operationId} (${duration}ms)`, {
      trace_id: operation.context.trace_id,
      duration,
      success: operation.success,
      errors: operation.errors.length,
      warnings: operation.warnings.length,
      steps: operation.steps.length,
      memory_delta: operation.context.memory_delta
    });

    // Record performance metrics
    this.recordMetric(operationId, 'duration', duration, 'ms');
    this.recordMetric(operationId, 'memory_delta_rss', operation.context.memory_delta.rss, 'bytes');
    this.recordMetric(operationId, 'steps_executed', operation.steps.length, 'count');

    // Clean up if successful (keep failed operations for debugging)
    if (operation.success) {
      this.activeOperations.delete(operationId);
    }

    return auditEntry;
  }

  /**
   * Get detailed operation status
   */
  getOperationStatus(operationId) {
    const operation = this.activeOperations.get(operationId);
    if (!operation) {
      return null;
    }

    return {
      id: operationId,
      trace_id: operation.context.trace_id,
      running_time: Date.now() - operation.startTime,
      steps_completed: operation.steps.length,
      errors: operation.errors.length,
      warnings: operation.warnings.length,
      last_step: operation.steps[operation.steps.length - 1],
      context: operation.context
    };
  }

  /**
   * Generate comprehensive CSV generation report
   */
  generateCsvReport(operationIds = []) {
    const operations = operationIds.length > 0 
      ? operationIds.map(id => this.activeOperations.get(id) || this.auditLog.find(a => a.operation_id === id))
      : [...this.activeOperations.values(), ...this.auditLog];

    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        total_operations: operations.length,
        successful: 0,
        failed: 0,
        total_duration: 0,
        total_steps: 0,
        total_errors: 0,
        total_warnings: 0
      },
      operations: [],
      error_analysis: {
        by_type: {},
        most_common: [],
        recent: []
      },
      performance: {
        avg_duration: 0,
        slowest: null,
        fastest: null,
        memory_usage: {}
      }
    };

    // Analyze operations
    for (const op of operations) {
      if (!op) continue;

      const isCompleted = op.completed !== undefined ? op.completed : true;
      const isSuccess = op.success !== undefined ? op.success : op.result?.success !== false;
      
      if (isSuccess) report.summary.successful++;
      else report.summary.failed++;

      const duration = op.duration || (op.end_time - op.start_time) || 0;
      report.summary.total_duration += duration;
      report.summary.total_steps += op.steps?.length || 0;
      report.summary.total_errors += op.errors?.length || 0;
      report.summary.total_warnings += op.warnings?.length || 0;

      // Track performance extremes
      if (!report.performance.slowest || duration > report.performance.slowest.duration) {
        report.performance.slowest = { operation_id: op.id || op.operation_id, duration };
      }
      if (!report.performance.fastest || duration < report.performance.fastest.duration) {
        report.performance.fastest = { operation_id: op.id || op.operation_id, duration };
      }

      // Add to operations list
      report.operations.push({
        operation_id: op.id || op.operation_id,
        trace_id: op.context?.trace_id || op.trace_id,
        duration,
        success: isSuccess,
        steps: op.steps?.length || 0,
        errors: op.errors?.length || 0,
        warnings: op.warnings?.length || 0
      });
    }

    // Calculate averages
    if (report.summary.total_operations > 0) {
      report.performance.avg_duration = Math.round(report.summary.total_duration / report.summary.total_operations);
    }

    // Error analysis
    const errorTypes = {};
    for (const [errorKey, group] of this.errorGroups) {
      errorTypes[group.sample_error.error.name] = (errorTypes[group.sample_error.error.name] || 0) + group.count;
    }
    report.error_analysis.by_type = errorTypes;

    // Most common errors
    report.error_analysis.most_common = Array.from(this.errorGroups.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)
      .map(group => ({
        error_type: group.sample_error.error.name,
        message: group.sample_error.error.message.substring(0, 100),
        count: group.count,
        first_seen: group.first_seen,
        last_seen: group.last_seen
      }));

    return report;
  }

  /**
   * Export audit trail for compliance
   */
  exportAuditTrail(options = {}) {
    const {
      startDate = null,
      endDate = null,
      operationTypes = [],
      includeContext = true
    } = options;

    let filteredLog = [...this.auditLog];

    // Date filtering
    if (startDate) {
      filteredLog = filteredLog.filter(entry => new Date(entry.context?.timestamp || 0) >= startDate);
    }
    if (endDate) {
      filteredLog = filteredLog.filter(entry => new Date(entry.context?.timestamp || 0) <= endDate);
    }

    // Operation type filtering
    if (operationTypes.length > 0) {
      filteredLog = filteredLog.filter(entry => 
        operationTypes.includes(entry.context?.operation_type)
      );
    }

    // Format for export
    return filteredLog.map(entry => ({
      timestamp: entry.context?.timestamp || new Date(entry.start_time).toISOString(),
      operation_id: entry.operation_id,
      trace_id: entry.trace_id,
      operation_type: entry.context?.operation_type,
      duration_ms: entry.duration,
      success: entry.success,
      errors_count: entry.errors_count,
      warnings_count: entry.warnings_count,
      steps_count: entry.steps_count,
      result: entry.result,
      context: includeContext ? entry.context : undefined
    }));
  }

  /**
   * Internal logging with correlation
   */
  log(level, message, context = {}) {
    // Use existing monitor system but enhance with correlation
    monitor.log(level, message, {
      ...context,
      enterprise_monitor: true
    });
  }

  /**
   * Get system health metrics
   */
  getSystemHealth() {
    const now = Date.now();
    const oneHourAgo = now - (60 * 60 * 1000);

    const recentOperations = this.auditLog.filter(entry => entry.end_time > oneHourAgo);
    const activeCount = this.activeOperations.size;
    const recentErrors = Array.from(this.errorGroups.values())
      .filter(group => new Date(group.last_seen).getTime() > oneHourAgo);

    return {
      timestamp: new Date().toISOString(),
      system: {
        memory: process.memoryUsage(),
        uptime: process.uptime(),
        pid: process.pid
      },
      operations: {
        active: activeCount,
        recent_completed: recentOperations.length,
        recent_success_rate: recentOperations.length > 0 
          ? Math.round((recentOperations.filter(op => op.success).length / recentOperations.length) * 100)
          : 100
      },
      errors: {
        recent_count: recentErrors.reduce((sum, group) => sum + group.count, 0),
        unique_types: recentErrors.length,
        most_recent: recentErrors.length > 0 
          ? recentErrors.sort((a, b) => new Date(b.last_seen) - new Date(a.last_seen))[0]
          : null
      },
      performance: {
        avg_duration_recent: recentOperations.length > 0
          ? Math.round(recentOperations.reduce((sum, op) => sum + op.duration, 0) / recentOperations.length)
          : 0
      }
    };
  }
}

// Export singleton instance
export const enterpriseMonitor = new EnterpriseMonitor();

/**
 * High-level CSV generation monitoring wrapper
 */
export class CsvGenerationMonitor {
  constructor(lanes, options = {}) {
    this.lanes = lanes;
    this.options = options;
    this.operationId = `csv_gen_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    this.traceId = enterpriseMonitor.startOperation(this.operationId, {
      operation_type: 'csv_generation',
      lanes_count: lanes.length,
      options
    });
    
    this.metrics = {
      lanes_processed: 0,
      lanes_successful: 0,
      lanes_failed: 0,
      rows_generated: 0,
      errors_by_lane: {},
      processing_times: []
    };
  }

  /**
   * Log lane processing start
   */
  startLaneProcessing(laneId) {
    enterpriseMonitor.logStep(this.operationId, `start_lane_${laneId}`, { lane_id: laneId });
    return Date.now();
  }

  /**
   * Log lane processing completion
   */
  completeLaneProcessing(laneId, startTime, rowsGenerated = 0, error = null) {
    const duration = Date.now() - startTime;
    this.metrics.processing_times.push(duration);
    this.metrics.lanes_processed++;

    if (error) {
      this.metrics.lanes_failed++;
      this.metrics.errors_by_lane[laneId] = error.message;
      enterpriseMonitor.logError(this.operationId, error, { 
        lane_id: laneId,
        duration,
        step: 'lane_processing'
      });
    } else {
      this.metrics.lanes_successful++;
      this.metrics.rows_generated += rowsGenerated;
      enterpriseMonitor.recordMetric(this.operationId, 'rows_per_lane', rowsGenerated, 'count');
    }

    enterpriseMonitor.logStep(this.operationId, `complete_lane_${laneId}`, {
      lane_id: laneId,
      duration,
      rows_generated: rowsGenerated,
      success: !error
    });

    enterpriseMonitor.recordMetric(this.operationId, 'lane_processing_time', duration, 'ms');
  }

  /**
   * Log CSV generation completion
   */
  completeCsvGeneration(csvString, success = true, error = null) {
    const finalMetrics = {
      ...this.metrics,
      csv_size_bytes: csvString?.length || 0,
      avg_processing_time: this.metrics.processing_times.length > 0
        ? Math.round(this.metrics.processing_times.reduce((a, b) => a + b, 0) / this.metrics.processing_times.length)
        : 0,
      success_rate: this.metrics.lanes_processed > 0
        ? Math.round((this.metrics.lanes_successful / this.metrics.lanes_processed) * 100)
        : 0
    };

    if (error) {
      enterpriseMonitor.logError(this.operationId, error, { 
        step: 'csv_generation_completion',
        metrics: finalMetrics
      });
    }

    // Record final metrics
    enterpriseMonitor.recordMetric(this.operationId, 'total_rows_generated', finalMetrics.rows_generated, 'count');
    enterpriseMonitor.recordMetric(this.operationId, 'csv_size', finalMetrics.csv_size_bytes, 'bytes');
    enterpriseMonitor.recordMetric(this.operationId, 'success_rate', finalMetrics.success_rate, 'percentage');

    const auditEntry = enterpriseMonitor.endOperation(this.operationId, {
      success,
      metrics: finalMetrics,
      csv_generated: !!csvString,
      error: error?.message
    });

    return {
      operation_id: this.operationId,
      trace_id: this.traceId,
      metrics: finalMetrics,
      audit_entry: auditEntry
    };
  }

  /**
   * Get current processing status
   */
  getStatus() {
    return {
      operation_id: this.operationId,
      trace_id: this.traceId,
      progress: {
        lanes_processed: this.metrics.lanes_processed,
        lanes_total: this.lanes.length,
        percentage: Math.round((this.metrics.lanes_processed / this.lanes.length) * 100)
      },
      metrics: this.metrics,
      system_status: enterpriseMonitor.getOperationStatus(this.operationId)
    };
  }
}