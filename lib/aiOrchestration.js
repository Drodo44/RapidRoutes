/**
 * AI Orchestration Layer
 * Dynamically routes prompts to the optimal AI model based on content analysis
 * Supports manual override via @model:<model-id> syntax
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getTelemetry } from './aiTelemetry.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class AIOrchestrator {
  constructor(configPath = '.vscode/model-router-config.json', options = {}) {
    this.configPath = path.join(process.cwd(), configPath);
    this.config = this.loadConfig();
    this.telemetry = options.telemetry !== false ? getTelemetry(options.telemetryOptions) : null;
    this.logger = {
      info: (msg, data) => console.log(`[AI Orchestrator] ${msg}`, data || ''),
      warn: (msg, data) => console.warn(`[AI Orchestrator] ⚠️  ${msg}`, data || ''),
      error: (msg, data) => console.error(`[AI Orchestrator] ❌ ${msg}`, data || '')
    };
  }

  /**
   * Load model router configuration
   */
  loadConfig() {
    try {
      const configData = fs.readFileSync(this.configPath, 'utf-8');
      // Remove comments from JSONC
      const jsonString = configData.replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');
      const config = JSON.parse(jsonString);
      return config.modelRouter;
    } catch (error) {
      this.logger?.error('Failed to load config, using defaults:', error.message);
      return this.getDefaultConfig();
    }
  }

  /**
   * Reload configuration (useful for hot-reloading)
   */
  reloadConfig() {
    this.config = this.loadConfig();
    this.logger.info('Configuration reloaded');
    return this.config;
  }

  /**
   * Default configuration fallback
   */
  getDefaultConfig() {
    return {
      enabled: true,
      defaultModel: 'gpt-5',
      allowManualOverride: true,
      models: {
        'gpt-5': { id: 'gpt-5', name: 'GPT-5' }
      },
      routes: []
    };
  }

  /**
   * Main orchestration method - selects best model for given prompt
   * @param {string} prompt - User's input prompt
   * @param {Object} options - Additional options (userId, conversationId, etc.)
   * @returns {Object} - Selected model, reason, and metadata
   */
  async orchestrate(prompt, options = {}) {
    const startTime = Date.now();
    
    // Check for manual override first
    const manualOverride = this.extractManualOverride(prompt);
    if (manualOverride) {
      const cleanPrompt = manualOverride.cleanPrompt;
      const model = this.getModelById(manualOverride.modelId);
      
      if (model) {
        const result = {
          model: model.id,
          modelName: model.name,
          provider: model.provider,
          reason: 'Manual override via @model directive',
          confidence: 1.0,
          override: true,
          prompt: cleanPrompt,
          originalPrompt: prompt,
          metadata: {
            processingTimeMs: Date.now() - startTime,
            timestamp: new Date().toISOString(),
            ...options
          }
        };
        
        this.logger.info('Manual override:', {
          model: result.modelName,
          requestedId: manualOverride.modelId
        });
        
        return result;
      } else {
        this.logger.warn('Invalid model override, falling back to automatic:', manualOverride.modelId);
      }
    }

    // Automatic model selection based on content
    const selection = this.selectModelByContent(prompt);
    
    const result = {
      ...selection,
      prompt: prompt,
      override: false,
      metadata: {
        processingTimeMs: Date.now() - startTime,
        timestamp: new Date().toISOString(),
        ...options
      }
    };

    this.logger.info('Model selected:', {
      model: result.modelName,
      route: result.route || 'default',
      confidence: `${(result.confidence * 100).toFixed(1)}%`,
      reason: result.reason
    });

    // Log to telemetry
    if (this.telemetry) {
      await this.telemetry.logDecision(result);
    }

    return result;
  }

  /**
   * Extract manual override from prompt (@model:model-id)
   * @param {string} prompt
   * @returns {Object|null} - { modelId, cleanPrompt } or null
   */
  extractManualOverride(prompt) {
    if (!this.config.allowManualOverride) {
      return null;
    }

    // Match @model:model-id or @model:<model-id>
    const overridePattern = /@model:<?([a-zA-Z0-9\-_.]+)>?/i;
    const match = prompt.match(overridePattern);

    if (match) {
      const modelId = match[1];
      const cleanPrompt = prompt.replace(overridePattern, '').trim();
      return { modelId, cleanPrompt };
    }

    return null;
  }

  /**
   * Get model by ID from config
   * @param {string} modelId
   * @returns {Object|null}
   */
  getModelById(modelId) {
    // Check built-in models
    for (const [key, model] of Object.entries(this.config.models || {})) {
      if (model.id === modelId || key === modelId) {
        return model;
      }
    }

    // Check custom models
    for (const [key, model] of Object.entries(this.config.customModels || {})) {
      if (key.startsWith('_')) continue; // Skip comments/examples
      if (model.id === modelId || key === modelId) {
        return model;
      }
    }

    return null;
  }

  /**
   * Select model based on prompt content analysis
   * @param {string} prompt
   * @returns {Object} - Selection result with model, reason, confidence
   */
  selectModelByContent(prompt) {
    if (!this.config.enabled) {
      return this.getDefaultSelection('Router disabled - using default');
    }

    const normalizedPrompt = prompt.toLowerCase();
    let bestMatch = null;
    let highestScore = 0;
    let matchDetails = [];

    // Combine built-in routes with custom routes
    const allRoutes = [
      ...(this.config.routes || []),
      ...Object.values(this.config.customRoutes || {}).filter(r => r.id && r.model && !r.id.startsWith('_'))
    ];

    // Sort by priority (highest first)
    allRoutes.sort((a, b) => (b.priority || 0) - (a.priority || 0));

    // Evaluate each route
    for (const route of allRoutes) {
      const patterns = route.patterns || [];
      let matchCount = 0;
      const matchedPatterns = [];

      for (const pattern of patterns) {
        // Match whole words, case-insensitive
        const regex = new RegExp(`\\b${this.escapeRegex(pattern.toLowerCase())}\\b`, 'i');
        if (regex.test(normalizedPrompt)) {
          matchCount++;
          matchedPatterns.push(pattern);
        }
      }

      if (matchCount > 0) {
        // Calculate score: matches × priority
        const score = matchCount * (route.priority || 50);
        
        matchDetails.push({
          route: route.id,
          matches: matchCount,
          patterns: matchedPatterns,
          priority: route.priority,
          score: score
        });

        if (score > highestScore) {
          highestScore = score;
          bestMatch = route;
        }
      }
    }

    // Return best match or default
    if (bestMatch) {
      const model = this.getModelById(bestMatch.model);
      return {
        model: model?.id || bestMatch.model,
        modelName: model?.name || bestMatch.model,
        provider: model?.provider,
        reason: bestMatch.description || bestMatch.name,
        route: bestMatch.id,
        confidence: this.calculateConfidence(highestScore, matchDetails),
        matchedPatterns: matchDetails.find(d => d.route === bestMatch.id)?.patterns || [],
        allMatches: matchDetails
      };
    }

    return this.getDefaultSelection('No pattern match - using default');
  }

  /**
   * Calculate confidence score based on match strength
   * @param {number} topScore
   * @param {Array} allMatches
   * @returns {number} - Confidence between 0 and 1
   */
  calculateConfidence(topScore, allMatches) {
    if (allMatches.length === 0) return 0.5;
    if (allMatches.length === 1) return 1.0;

    // Sort by score
    const sorted = [...allMatches].sort((a, b) => b.score - a.score);
    const top = sorted[0].score;
    const second = sorted[1]?.score || 0;

    // High confidence if top score is much higher than second
    if (second === 0) return 1.0;
    const ratio = top / second;
    
    // Convert ratio to confidence (1.0-2.0 range)
    if (ratio >= 2.0) return 1.0;
    if (ratio >= 1.5) return 0.9;
    if (ratio >= 1.2) return 0.8;
    return 0.7;
  }

  /**
   * Get default model selection
   * @param {string} reason
   * @returns {Object}
   */
  getDefaultSelection(reason) {
    const defaultModel = this.getModelById(this.config.defaultModel);
    return {
      model: defaultModel?.id || this.config.defaultModel,
      modelName: defaultModel?.name || this.config.defaultModel,
      provider: defaultModel?.provider,
      reason: reason,
      confidence: 0.5,
      matchedPatterns: [],
      allMatches: []
    };
  }

  /**
   * Escape special regex characters
   * @param {string} str
   * @returns {string}
   */
  escapeRegex(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  /**
   * Get all available models
   * @returns {Array}
   */
  getAllModels() {
    const models = [];

    // Built-in models
    for (const [key, model] of Object.entries(this.config.models || {})) {
      models.push({
        id: model.id || key,
        name: model.name || key,
        provider: model.provider,
        capabilities: model.capabilities,
        costTier: model.costTier,
        speedTier: model.speedTier,
        type: 'built-in'
      });
    }

    // Custom models
    for (const [key, model] of Object.entries(this.config.customModels || {})) {
      if (key.startsWith('_')) continue; // Skip comments/examples
      models.push({
        id: model.id || key,
        name: model.name || key,
        provider: model.provider,
        capabilities: model.capabilities,
        costTier: model.costTier,
        speedTier: model.speedTier,
        type: 'custom'
      });
    }

    return models;
  }

  /**
   * Get all routes
   * @returns {Array}
   */
  getAllRoutes() {
    const routes = [
      ...(this.config.routes || []).map(r => ({ ...r, type: 'built-in' })),
      ...Object.values(this.config.customRoutes || {})
        .filter(r => r.id && r.model && !r.id.startsWith('_'))
        .map(r => ({ ...r, type: 'custom' }))
    ];

    return routes.sort((a, b) => (b.priority || 0) - (a.priority || 0));
  }

  /**
   * Test a prompt without actually sending to AI
   * @param {string} prompt
   * @returns {Object}
   */
  async test(prompt) {
    return this.orchestrate(prompt, { testMode: true });
  }

  /**
   * Update telemetry with performance data after AI call completes
   * @param {Object} result - Original orchestration result
   * @param {Object} performanceData - Performance metrics
   */
  async updateTelemetry(result, performanceData) {
    if (!this.telemetry) return;

    const updateData = {
      ...result,
      tokensUsed: performanceData.tokensUsed,
      latencyMs: performanceData.latencyMs,
      success: performanceData.success,
      errorType: performanceData.errorType
    };

    await this.telemetry.logDecision(updateData);
  }

  /**
   * Get analytics from telemetry
   * @param {Object} options - Filter options
   */
  async getAnalytics(options = {}) {
    if (!this.telemetry) {
      throw new Error('Telemetry is not enabled');
    }

    return this.telemetry.generateAnalytics(options);
  }

  /**
   * Export analytics to file
   * @param {string} outputPath
   */
  async exportAnalytics(outputPath) {
    if (!this.telemetry) {
      throw new Error('Telemetry is not enabled');
    }

    return this.telemetry.exportAnalytics(outputPath);
  }

  /**
   * Flush telemetry buffer
   */
  async flushTelemetry() {
    if (this.telemetry) {
      await this.telemetry.flush();
    }
  }
}

// Singleton instance for easy import
let orchestratorInstance = null;

export function getOrchestrator(configPath) {
  if (!orchestratorInstance) {
    orchestratorInstance = new AIOrchestrator(configPath);
  }
  return orchestratorInstance;
}

export default AIOrchestrator;
