/**
 * Advanced Logging and Monitoring System
 * Tracks system performance, data quality, and operations
 */

import { adminSupabase } from '../utils/supabaseClient.js';

// Performance tracking
const METRICS = {
  api_calls: new Map(),
  cache_hits: new Map(),
  timing: new Map(),
  errors: new Map()
};

/**
 * Track API call metrics
 */
export function trackAPICall(endpoint, success, duration) {
  const key = `api_${endpoint}`;
  if (!METRICS.api_calls.has(key)) {
    METRICS.api_calls.set(key, {
      total: 0,
      successful: 0,
      failed: 0,
      totalDuration: 0,
      avgDuration: 0
    });
  }
  
  const metric = METRICS.api_calls.get(key);
  metric.total++;
  if (success) metric.successful++;
  else metric.failed++;
  metric.totalDuration += duration;
  metric.avgDuration = metric.totalDuration / metric.total;
}

/**
 * Track cache performance
 */
export function trackCacheOperation(cacheType, hit) {
  const key = `cache_${cacheType}`;
  if (!METRICS.cache_hits.has(key)) {
    METRICS.cache_hits.set(key, {
      total: 0,
      hits: 0,
      misses: 0,
      hitRate: 0
    });
  }
  
  const metric = METRICS.cache_hits.get(key);
  metric.total++;
  if (hit) metric.hits++;
  else metric.misses++;
  metric.hitRate = metric.hits / metric.total;
}

/**
 * Track intelligence learning and discoveries
 */
export function trackIntelligence(type, details) {
  // Log to console for monitoring
  console.log(`🧠 Intelligence - ${type}:`, details);
  
  // Save to database for long-term learning
  adminSupabase.from('intelligence_log').insert({
    type,
    details,
    timestamp: new Date().toISOString()
  }).then(() => {
    console.log(`✓ Intelligence tracked: ${type}`);
  }).catch(err => {
    console.error('Failed to track intelligence:', err);
  });
}

/**
 * Track operation timing
 */
export function trackTiming(operation, duration) {
  if (!METRICS.timing.has(operation)) {
    METRICS.timing.set(operation, {
      count: 0,
      totalDuration: 0,
      avgDuration: 0,
      minDuration: Infinity,
      maxDuration: 0
    });
  }
  
  const metric = METRICS.timing.get(operation);
  metric.count++;
  metric.totalDuration += duration;
  metric.avgDuration = metric.totalDuration / metric.count;
  metric.minDuration = Math.min(metric.minDuration, duration);
  metric.maxDuration = Math.max(metric.maxDuration, duration);
}

/**
 * Track errors
 */
export function trackError(category, error) {
  const key = `error_${category}`;
  if (!METRICS.errors.has(key)) {
    METRICS.errors.set(key, {
      count: 0,
      types: new Map(),
      lastError: null,
      firstSeen: null
    });
  }
  
  const metric = METRICS.errors.get(key);
  metric.count++;
  metric.lastError = new Date();
  if (!metric.firstSeen) metric.firstSeen = new Date();
  
  const errorType = error.name || 'UnknownError';
  metric.types.set(errorType, (metric.types.get(errorType) || 0) + 1);
}

/**
 * Log operation to database
 */
export async function logOperation(type, details) {
  try {
    const { error } = await adminSupabase
      .from('operation_logs')
      .insert({
        operation_type: type,
        details,
        created_at: new Date().toISOString()
      });
      
    if (error) throw error;
    
  } catch (err) {
    console.error('Failed to log operation:', err);
    trackError('logging', err);
  }
}

/**
 * Get current metrics
 */
export function getMetrics() {
  return {
    api_calls: Object.fromEntries(METRICS.api_calls),
    cache_hits: Object.fromEntries(METRICS.cache_hits),
    timing: Object.fromEntries(METRICS.timing),
    errors: Object.fromEntries(METRICS.errors)
  };
}

/**
 * Monitor data quality
 */
export async function monitorDataQuality() {
  const results = {
    total_cities: 0,
    cities_with_kma: 0,
    cities_here_verified: 0,
    recent_updates: 0,
    potential_issues: []
  };
  
  try {
    // Get overall counts
    const { data: counts } = await adminSupabase
      .from('cities')
      .select('*', { count: 'exact' });
      
    results.total_cities = counts?.length || 0;
    
    // Count cities with KMA
    const { data: kmaCount } = await adminSupabase
      .from('cities')
      .select('*', { count: 'exact' })
      .not('kma_code', 'is', null);
      
    results.cities_with_kma = kmaCount?.length || 0;
    
    // Count HERE verified cities
    const { data: hereCount } = await adminSupabase
      .from('cities')
      .select('*', { count: 'exact' })
      .eq('here_verified', true);
      
    results.cities_here_verified = hereCount?.length || 0;
    
    // Recent updates
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const { data: recentCount } = await adminSupabase
      .from('cities')
      .select('*', { count: 'exact' })
      .gte('last_verification', thirtyDaysAgo.toISOString());
      
    results.recent_updates = recentCount?.length || 0;
    
    // Check for potential issues
    const checks = [
      {
        name: 'missing_coordinates',
        query: 'latitude.is.null,longitude.is.null'
      },
      {
        name: 'missing_kma',
        query: 'kma_code.is.null'
      },
      {
        name: 'stale_verification',
        query: `last_verification.lt.${thirtyDaysAgo.toISOString()}`
      }
    ];
    
    for (const check of checks) {
      const { data: issues } = await adminSupabase
        .from('cities')
        .select('city, state_or_province')
        .or(check.query)
        .limit(100);
        
      if (issues?.length) {
        results.potential_issues.push({
          type: check.name,
          count: issues.length,
          examples: issues.slice(0, 5)
        });
      }
    }
    
    return results;
    
  } catch (error) {
    console.error('Data quality monitoring error:', error);
    trackError('monitoring', error);
    throw error;
  }
}

/**
 * Generate system health report
 */
export async function generateHealthReport() {
  const report = {
    timestamp: new Date().toISOString(),
    metrics: getMetrics(),
    data_quality: await monitorDataQuality(),
    system_status: {
      api_health: true,
      cache_health: true,
      database_health: true
    }
  };
  
  // Check API health
  for (const [key, metric] of METRICS.api_calls) {
    if (metric.failed / metric.total > 0.1) { // Over 10% failure rate
      report.system_status.api_health = false;
      break;
    }
  }
  
  // Check cache health
  for (const [key, metric] of METRICS.cache_hits) {
    if (metric.hitRate < 0.5) { // Under 50% hit rate
      report.system_status.cache_health = false;
      break;
    }
  }
  
  // Check database health
  try {
    const { data, error } = await adminSupabase
      .from('cities')
      .select('count')
      .limit(1);
      
    if (error) {
      report.system_status.database_health = false;
    }
  } catch (error) {
    report.system_status.database_health = false;
  }
  
  return report;
}
