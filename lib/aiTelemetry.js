/**
 * AI Orchestration Telemetry System
 * Tracks every orchestration decision for analytics and optimization
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class OrchestrationTelemetry {
  constructor(options = {}) {
    this.logPath = options.logPath || path.join(process.cwd(), '.orchestration-logs');
    this.maxLogSize = options.maxLogSize || 10000; // Max entries before rotation
    this.inMemoryBuffer = [];
    this.bufferSize = options.bufferSize || 100; // Buffer before writing to disk
    
    this.ensureLogDirectory();
  }

  /**
   * Ensure log directory exists
   */
  ensureLogDirectory() {
    if (!fs.existsSync(this.logPath)) {
      fs.mkdirSync(this.logPath, { recursive: true });
    }
  }

  /**
   * Log an orchestration decision
   * @param {Object} data - Orchestration result and metadata
   */
  async logDecision(data) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      model: data.model,
      modelName: data.modelName,
      provider: data.provider,
      route: data.route,
      confidence: data.confidence,
      override: data.override || false,
      promptLength: data.prompt?.length || 0,
      matchedPatterns: data.matchedPatterns || [],
      allMatches: data.allMatches || [],
      processingTimeMs: data.metadata?.processingTimeMs || 0,
      userId: data.metadata?.userId,
      conversationId: data.metadata?.conversationId,
      
      // Performance metrics (to be filled by caller)
      tokensUsed: data.tokensUsed || null,
      latencyMs: data.latencyMs || null,
      success: data.success !== undefined ? data.success : null,
      errorType: data.errorType || null
    };

    // Add to in-memory buffer
    this.inMemoryBuffer.push(logEntry);

    // Write to disk when buffer is full
    if (this.inMemoryBuffer.length >= this.bufferSize) {
      await this.flush();
    }

    return logEntry;
  }

  /**
   * Flush buffer to disk
   */
  async flush() {
    if (this.inMemoryBuffer.length === 0) return;

    const logFile = path.join(this.logPath, `decisions-${this.getCurrentDateString()}.jsonl`);
    const entries = this.inMemoryBuffer.map(e => JSON.stringify(e)).join('\n') + '\n';

    try {
      fs.appendFileSync(logFile, entries, 'utf-8');
      this.inMemoryBuffer = [];
    } catch (error) {
      console.error('[Telemetry] Failed to write logs:', error.message);
    }
  }

  /**
   * Get current date string for log file naming
   */
  getCurrentDateString() {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  }

  /**
   * Read all log entries from disk
   * @param {Object} options - Filter options
   */
  async readLogs(options = {}) {
    const { startDate, endDate, model, route, limit } = options;
    const entries = [];

    try {
      const files = fs.readdirSync(this.logPath)
        .filter(f => f.startsWith('decisions-') && f.endsWith('.jsonl'))
        .sort()
        .reverse(); // Most recent first

      for (const file of files) {
        const filePath = path.join(this.logPath, file);
        const content = fs.readFileSync(filePath, 'utf-8');
        const lines = content.trim().split('\n').filter(l => l);

        for (const line of lines) {
          try {
            const entry = JSON.parse(line);
            
            // Apply filters
            if (startDate && new Date(entry.timestamp) < new Date(startDate)) continue;
            if (endDate && new Date(entry.timestamp) > new Date(endDate)) continue;
            if (model && entry.model !== model) continue;
            if (route && entry.route !== route) continue;

            entries.push(entry);

            if (limit && entries.length >= limit) {
              return entries;
            }
          } catch {
            // Skip malformed lines
          }
        }
      }
    } catch (error) {
      console.error('[Telemetry] Failed to read logs:', error.message);
    }

    return entries;
  }

  /**
   * Generate analytics from logs
   */
  async generateAnalytics(options = {}) {
    await this.flush(); // Ensure all buffered data is written
    
    const entries = await this.readLogs(options);
    
    if (entries.length === 0) {
      return {
        totalDecisions: 0,
        dateRange: null,
        modelStats: {},
        routeStats: {},
        performanceMetrics: {},
        recommendations: []
      };
    }

    const analytics = {
      totalDecisions: entries.length,
      dateRange: {
        start: entries[entries.length - 1].timestamp,
        end: entries[0].timestamp
      },
      modelStats: this.calculateModelStats(entries),
      routeStats: this.calculateRouteStats(entries),
      performanceMetrics: this.calculatePerformanceMetrics(entries),
      confidenceDistribution: this.calculateConfidenceDistribution(entries),
      overrideRate: this.calculateOverrideRate(entries),
      recommendations: this.generateRecommendations(entries)
    };

    return analytics;
  }

  /**
   * Calculate per-model statistics
   */
  calculateModelStats(entries) {
    const stats = {};

    for (const entry of entries) {
      if (!stats[entry.model]) {
        stats[entry.model] = {
          modelName: entry.modelName,
          provider: entry.provider,
          count: 0,
          overrideCount: 0,
          totalConfidence: 0,
          avgConfidence: 0,
          totalTokens: 0,
          totalLatency: 0,
          successCount: 0,
          failureCount: 0,
          successRate: 0,
          avgLatency: 0,
          avgTokens: 0
        };
      }

      const stat = stats[entry.model];
      stat.count++;
      if (entry.override) stat.overrideCount++;
      stat.totalConfidence += entry.confidence || 0;
      
      if (entry.tokensUsed) stat.totalTokens += entry.tokensUsed;
      if (entry.latencyMs) stat.totalLatency += entry.latencyMs;
      
      if (entry.success === true) stat.successCount++;
      if (entry.success === false) stat.failureCount++;
    }

    // Calculate averages
    for (const model in stats) {
      const stat = stats[model];
      stat.avgConfidence = stat.totalConfidence / stat.count;
      
      const completedRequests = stat.successCount + stat.failureCount;
      if (completedRequests > 0) {
        stat.successRate = stat.successCount / completedRequests;
        stat.avgLatency = stat.totalLatency / completedRequests;
        stat.avgTokens = stat.totalTokens / completedRequests;
      }
    }

    return stats;
  }

  /**
   * Calculate per-route statistics
   */
  calculateRouteStats(entries) {
    const stats = {};

    for (const entry of entries) {
      if (!entry.route) continue;

      if (!stats[entry.route]) {
        stats[entry.route] = {
          count: 0,
          models: {},
          avgConfidence: 0,
          totalConfidence: 0,
          successRate: 0,
          successCount: 0,
          failureCount: 0
        };
      }

      const stat = stats[entry.route];
      stat.count++;
      stat.totalConfidence += entry.confidence || 0;

      // Track which models are used for this route
      if (!stat.models[entry.model]) {
        stat.models[entry.model] = 0;
      }
      stat.models[entry.model]++;

      if (entry.success === true) stat.successCount++;
      if (entry.success === false) stat.failureCount++;
    }

    // Calculate averages
    for (const route in stats) {
      const stat = stats[route];
      stat.avgConfidence = stat.totalConfidence / stat.count;
      
      const completedRequests = stat.successCount + stat.failureCount;
      if (completedRequests > 0) {
        stat.successRate = stat.successCount / completedRequests;
      }
    }

    return stats;
  }

  /**
   * Calculate overall performance metrics
   */
  calculatePerformanceMetrics(entries) {
    let totalProcessingTime = 0;
    let totalLatency = 0;
    let totalTokens = 0;
    let latencyCount = 0;
    let tokenCount = 0;

    for (const entry of entries) {
      totalProcessingTime += entry.processingTimeMs || 0;
      
      if (entry.latencyMs) {
        totalLatency += entry.latencyMs;
        latencyCount++;
      }
      
      if (entry.tokensUsed) {
        totalTokens += entry.tokensUsed;
        tokenCount++;
      }
    }

    return {
      avgProcessingTimeMs: totalProcessingTime / entries.length,
      avgLatencyMs: latencyCount > 0 ? totalLatency / latencyCount : 0,
      avgTokensPerRequest: tokenCount > 0 ? totalTokens / tokenCount : 0,
      totalTokensUsed: totalTokens
    };
  }

  /**
   * Calculate confidence score distribution
   */
  calculateConfidenceDistribution(entries) {
    const buckets = {
      '0.0-0.5': 0,
      '0.5-0.7': 0,
      '0.7-0.9': 0,
      '0.9-1.0': 0
    };

    for (const entry of entries) {
      const conf = entry.confidence || 0;
      if (conf < 0.5) buckets['0.0-0.5']++;
      else if (conf < 0.7) buckets['0.5-0.7']++;
      else if (conf < 0.9) buckets['0.7-0.9']++;
      else buckets['0.9-1.0']++;
    }

    return buckets;
  }

  /**
   * Calculate manual override rate
   */
  calculateOverrideRate(entries) {
    const overrides = entries.filter(e => e.override).length;
    return {
      total: entries.length,
      overrides: overrides,
      rate: overrides / entries.length
    };
  }

  /**
   * Generate optimization recommendations
   */
  generateRecommendations(entries) {
    const recommendations = [];
    const modelStats = this.calculateModelStats(entries);
    const routeStats = this.calculateRouteStats(entries);

    // Recommendation 1: Models with low success rates
    for (const [model, stats] of Object.entries(modelStats)) {
      if (stats.successRate < 0.8 && stats.successCount + stats.failureCount >= 10) {
        recommendations.push({
          type: 'low-success-rate',
          severity: 'high',
          model: model,
          message: `${stats.modelName} has low success rate (${(stats.successRate * 100).toFixed(1)}%). Consider reviewing routing rules.`,
          data: { successRate: stats.successRate, count: stats.count }
        });
      }
    }

    // Recommendation 2: Routes with low confidence
    for (const [route, stats] of Object.entries(routeStats)) {
      if (stats.avgConfidence < 0.6 && stats.count >= 10) {
        recommendations.push({
          type: 'low-confidence',
          severity: 'medium',
          route: route,
          message: `Route "${route}" has low avg confidence (${(stats.avgConfidence * 100).toFixed(1)}%). Consider adding more specific patterns.`,
          data: { avgConfidence: stats.avgConfidence, count: stats.count }
        });
      }
    }

    // Recommendation 3: High override rate
    const overrideRate = this.calculateOverrideRate(entries);
    if (overrideRate.rate > 0.2 && entries.length >= 20) {
      recommendations.push({
        type: 'high-override-rate',
        severity: 'medium',
        message: `High manual override rate (${(overrideRate.rate * 100).toFixed(1)}%). Users frequently override automatic selection.`,
        data: { overrideRate: overrideRate.rate, overrides: overrideRate.overrides }
      });
    }

    // Recommendation 4: Underused models
    for (const [model, stats] of Object.entries(modelStats)) {
      const usageRate = stats.count / entries.length;
      if (usageRate < 0.02 && entries.length >= 50 && !model.includes('example')) {
        recommendations.push({
          type: 'underused-model',
          severity: 'low',
          model: model,
          message: `${stats.modelName} is rarely used (${(usageRate * 100).toFixed(1)}%). Consider adjusting routing priorities.`,
          data: { usageRate: usageRate, count: stats.count }
        });
      }
    }

    return recommendations.sort((a, b) => {
      const severityOrder = { high: 0, medium: 1, low: 2 };
      return severityOrder[a.severity] - severityOrder[b.severity];
    });
  }

  /**
   * Export analytics to JSON file
   */
  async exportAnalytics(outputPath) {
    const analytics = await this.generateAnalytics();
    const json = JSON.stringify(analytics, null, 2);
    
    try {
      fs.writeFileSync(outputPath, json, 'utf-8');
      return outputPath;
    } catch (error) {
      console.error('[Telemetry] Failed to export analytics:', error.message);
      throw error;
    }
  }

  /**
   * Clear old logs (older than X days)
   */
  async clearOldLogs(daysToKeep = 30) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    try {
      const files = fs.readdirSync(this.logPath)
        .filter(f => f.startsWith('decisions-') && f.endsWith('.jsonl'));

      let deletedCount = 0;
      for (const file of files) {
        const filePath = path.join(this.logPath, file);
        const stats = fs.statSync(filePath);
        
        if (stats.mtime < cutoffDate) {
          fs.unlinkSync(filePath);
          deletedCount++;
        }
      }

      return { deletedCount, cutoffDate: cutoffDate.toISOString() };
    } catch (error) {
      console.error('[Telemetry] Failed to clear old logs:', error.message);
      throw error;
    }
  }
}

// Singleton instance
let telemetryInstance = null;

export function getTelemetry(options) {
  if (!telemetryInstance) {
    telemetryInstance = new OrchestrationTelemetry(options);
  }
  return telemetryInstance;
}

export default OrchestrationTelemetry;
