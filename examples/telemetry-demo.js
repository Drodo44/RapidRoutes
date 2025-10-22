#!/usr/bin/env node

/**
 * AI Orchestration with Telemetry - Complete Example
 * Shows how to track performance, analyze usage, and optimize routing
 */

import AIOrchestrator from '../lib/aiOrchestration.js';

console.log('🔬 AI Orchestration Telemetry Demo\n');
console.log('═'.repeat(60));

// Create orchestrator with telemetry enabled
const orchestrator = new AIOrchestrator('.vscode/model-router-config.json', {
  telemetry: true,
  telemetryOptions: {
    logPath: '.orchestration-logs',
    bufferSize: 10 // Flush after 10 entries for demo
  }
});

/**
 * Example 1: Basic orchestration with telemetry
 */
async function example1() {
  console.log('\n📝 Example 1: Basic Orchestration with Telemetry\n');

  const prompts = [
    'Fix this Supabase error',
    'Write documentation for this API',
    'Quick format this JSON',
    'Analyze this screenshot',
    'Export DAT CSV for freight lane'
  ];

  for (const prompt of prompts) {
    const result = await orchestrator.orchestrate(prompt);
    console.log(`Prompt: "${prompt}"`);
    console.log(`  → Model: ${result.modelName}`);
    console.log(`  → Confidence: ${(result.confidence * 100).toFixed(1)}%`);
    console.log(`  → Logged to telemetry ✓\n`);
  }

  // Flush buffer to ensure data is written
  await orchestrator.flushTelemetry();
  console.log('✅ All decisions logged\n');
}

/**
 * Example 2: Simulating AI calls with performance tracking
 */
async function example2() {
  console.log('📊 Example 2: Tracking AI Performance\n');

  const prompt = 'Debug this production error';
  
  // Step 1: Get orchestration decision
  const result = await orchestrator.orchestrate(prompt);
  console.log(`Selected: ${result.modelName}\n`);

  // Step 2: Simulate AI call (replace with actual AI call)
  console.log('Calling AI service...');
  const startTime = Date.now();
  
  // Simulate AI call with random performance
  await new Promise(resolve => setTimeout(resolve, Math.random() * 500 + 100));
  
  const latencyMs = Date.now() - startTime;
  const tokensUsed = Math.floor(Math.random() * 500 + 100);
  const success = Math.random() > 0.1; // 90% success rate

  // Step 3: Update telemetry with performance data
  await orchestrator.updateTelemetry(result, {
    tokensUsed: tokensUsed,
    latencyMs: latencyMs,
    success: success,
    errorType: success ? null : 'timeout'
  });

  console.log(`  Latency: ${latencyMs}ms`);
  console.log(`  Tokens: ${tokensUsed}`);
  console.log(`  Success: ${success ? '✓' : '✗'}`);
  console.log(`  Performance logged ✓\n`);
}

/**
 * Example 3: Generate usage analytics
 */
async function example3() {
  console.log('📈 Example 3: Usage Analytics\n');

  // Generate some more test data
  await generateTestData();

  const analytics = await orchestrator.getAnalytics();

  console.log(`Total Decisions: ${analytics.totalDecisions}`);
  console.log(`Date Range: ${analytics.dateRange?.start || 'N/A'} to ${analytics.dateRange?.end || 'N/A'}\n`);

  console.log('Model Statistics:');
  for (const [model, stats] of Object.entries(analytics.modelStats)) {
    console.log(`  ${stats.modelName}:`);
    console.log(`    Usage: ${stats.count} times`);
    console.log(`    Avg Confidence: ${(stats.avgConfidence * 100).toFixed(1)}%`);
    console.log(`    Avg Tokens: ${stats.avgTokens.toFixed(0)}`);
    console.log(`    Avg Latency: ${stats.avgLatency.toFixed(0)}ms`);
    console.log(`    Success Rate: ${(stats.successRate * 100).toFixed(1)}%\n`);
  }
}

/**
 * Example 4: Get optimization recommendations
 */
async function example4() {
  console.log('💡 Example 4: Optimization Recommendations\n');

  const analytics = await orchestrator.getAnalytics();

  if (analytics.recommendations.length === 0) {
    console.log('✨ No recommendations - routing is optimal!\n');
    return;
  }

  console.log(`Found ${analytics.recommendations.length} recommendations:\n`);

  for (const rec of analytics.recommendations) {
    const icon = rec.severity === 'high' ? '🔴' : rec.severity === 'medium' ? '🟡' : '🟢';
    console.log(`${icon} [${rec.severity.toUpperCase()}] ${rec.type}`);
    console.log(`   ${rec.message}`);
    if (rec.model) console.log(`   Model: ${rec.model}`);
    if (rec.route) console.log(`   Route: ${rec.route}`);
    console.log('');
  }
}

/**
 * Example 5: Export analytics to file
 */
async function example5() {
  console.log('💾 Example 5: Export Analytics\n');

  const outputPath = './orchestration-analytics.json';
  await orchestrator.exportAnalytics(outputPath);

  console.log(`✅ Analytics exported to: ${outputPath}\n`);
}

/**
 * Example 6: Filtered analytics
 */
async function example6() {
  console.log('🔍 Example 6: Filtered Analytics\n');

  // Get analytics for specific model
  const analytics = await orchestrator.getAnalytics({
    model: 'gpt-5',
    limit: 100
  });

  console.log('GPT-5 Statistics:');
  const gpt5Stats = analytics.modelStats['gpt-5'];
  if (gpt5Stats) {
    console.log(`  Total usage: ${gpt5Stats.count}`);
    console.log(`  Avg confidence: ${(gpt5Stats.avgConfidence * 100).toFixed(1)}%`);
    console.log(`  Override count: ${gpt5Stats.overrideCount}\n`);
  } else {
    console.log('  No data available\n');
  }
}

/**
 * Helper: Generate test data
 */
async function generateTestData() {
  const testPrompts = [
    'Fix bug in production',
    'Deploy to Vercel',
    'Write Supabase query',
    'Summarize code changes',
    'Review architecture',
    'Format JSON output',
    'Translate to Spanish',
    'Analyze UI screenshot'
  ];

  for (const prompt of testPrompts) {
    const result = await orchestrator.orchestrate(prompt);
    
    // Simulate AI call
    await new Promise(resolve => setTimeout(resolve, 50));
    
    await orchestrator.updateTelemetry(result, {
      tokensUsed: Math.floor(Math.random() * 500 + 100),
      latencyMs: Math.floor(Math.random() * 500 + 100),
      success: Math.random() > 0.15, // 85% success
      errorType: null
    });
  }

  await orchestrator.flushTelemetry();
}

/**
 * Example 7: Real-time usage monitoring
 */
async function example7() {
  console.log('⏱️  Example 7: Performance Metrics\n');

  const analytics = await orchestrator.getAnalytics();
  const perf = analytics.performanceMetrics;

  console.log('Overall Performance:');
  console.log(`  Avg Processing Time: ${perf.avgProcessingTimeMs.toFixed(2)}ms`);
  console.log(`  Avg AI Latency: ${perf.avgLatencyMs.toFixed(0)}ms`);
  console.log(`  Avg Tokens/Request: ${perf.avgTokensPerRequest.toFixed(0)}`);
  console.log(`  Total Tokens Used: ${perf.totalTokensUsed}\n`);

  console.log('Confidence Distribution:');
  for (const [range, count] of Object.entries(analytics.confidenceDistribution)) {
    const bar = '█'.repeat(Math.floor(count / 2));
    console.log(`  ${range}: ${bar} ${count}`);
  }
  console.log('');

  const overrideRate = analytics.overrideRate;
  console.log(`Manual Override Rate: ${(overrideRate.rate * 100).toFixed(1)}%`);
  console.log(`  (${overrideRate.overrides} of ${overrideRate.total} decisions)\n`);
}

// Run all examples
async function main() {
  try {
    await example1();
    await example2();
    await example3();
    await example4();
    await example5();
    await example6();
    await example7();

    console.log('═'.repeat(60));
    console.log('\n✅ Telemetry demo complete!');
    console.log('\n📚 Key Features Demonstrated:');
    console.log('  • Automatic decision logging');
    console.log('  • Performance tracking (latency, tokens, success)');
    console.log('  • Usage analytics per model and route');
    console.log('  • Optimization recommendations');
    console.log('  • Analytics export');
    console.log('  • Filtered queries');
    console.log('  • Performance metrics\n');

    console.log('💡 Next Steps:');
    console.log('  • View logs: cat .orchestration-logs/decisions-*.jsonl');
    console.log('  • Check analytics: cat orchestration-analytics.json');
    console.log('  • API endpoint: GET /api/ai/analytics');
    console.log('  • Review recommendations and adjust routing\n');

  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

main();
