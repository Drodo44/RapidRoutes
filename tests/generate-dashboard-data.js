#!/usr/bin/env node

/**
 * Quick Dashboard Test - Generate Sample Telemetry Data
 * This script generates realistic telemetry data for testing the dashboard
 */

import { getOrchestrator } from '../lib/aiOrchestration.js';

const testPrompts = [
  // High priority debugging (GPT-5)
  'Error in authentication flow - stack trace shows undefined',
  'Debug deployment issue with Vercel build failing',
  'Fix broken database query returning null',
  'Troubleshoot crash in lane export functionality',
  'Exception thrown when parsing DAT CSV headers',
  
  // Database operations (GPT-5)
  'Update Supabase RLS policy for lanes table',
  'Write SQL migration to add new column',
  'Query PostgreSQL database for city records',
  
  // Freight domain (GPT-5)
  'Generate DAT CSV with proper KMA codes',
  'Calculate weight randomization for freight lanes',
  'Validate equipment codes for load board posting',
  
  // Content creation (Claude Sonnet)
  'Write documentation for the model router system',
  'Summarize the changes in latest deployment',
  'Draft email template for broker communication',
  'Compose user guide for lane management',
  
  // Code review (Claude Sonnet)
  'Review this React component for best practices',
  'Analyze database schema design',
  'Refactor authentication logic for clarity',
  
  // Quick tasks (Claude Haiku)
  'Parse this JSON log output',
  'Format CSV data for import',
  'Convert timestamp to readable date',
  'Quick prettify this config file',
  
  // Vision tasks (GPT-4o)
  'Analyze this screenshot of the error',
  'Review diagram of system architecture',
  
  // Long context (Gemini Pro)
  'Review entire codebase for security issues',
  'Analyze all files in the repository',
  
  // Multilingual (Mistral Large)
  'Translate user interface to Spanish',
];

async function generateSampleData() {
  console.log('🎯 Generating sample telemetry data for dashboard...\n');
  
  const orchestrator = getOrchestrator();
  
  for (let i = 0; i < testPrompts.length; i++) {
    const prompt = testPrompts[i];
    
    try {
      // Orchestrate
      const result = await orchestrator.orchestrate(prompt, {
        userId: 'test-user',
        conversationId: 'dashboard-demo'
      });
      
      console.log(`✓ ${i + 1}/${testPrompts.length}: ${result.model} (${result.confidence.toFixed(2)})`);
      
      // Simulate AI call with realistic performance data
      const tokensUsed = Math.floor(Math.random() * 500) + 100; // 100-600 tokens
      const latencyMs = Math.floor(Math.random() * 800) + 200;  // 200-1000ms
      const success = Math.random() > 0.15; // 85% success rate
      
      // Update telemetry with simulated performance
      await orchestrator.updateTelemetry(result, {
        tokensUsed,
        latencyMs,
        success,
        errorType: success ? null : (Math.random() > 0.5 ? 'timeout' : 'api_error')
      });
      
      // Small delay to simulate real usage
      await new Promise(resolve => setTimeout(resolve, 50));
      
    } catch (error) {
      console.error(`✗ ${i + 1}/${testPrompts.length}: Error - ${error.message}`);
    }
  }
  
  // Flush any remaining logs
  await orchestrator.flushTelemetry();
  
  console.log('\n✅ Sample data generation complete!');
  console.log('\n📊 View the dashboard at: http://localhost:3000/ai/analytics');
  console.log('   Or start dev server: npm run dev\n');
  
  // Show quick stats
  const analytics = await orchestrator.getAnalytics();
  console.log('Quick Stats:');
  console.log(`  Total Decisions: ${analytics.totalDecisions}`);
  console.log(`  Models Used: ${Object.keys(analytics.modelStats).length}`);
  console.log(`  Routes Used: ${Object.keys(analytics.routeStats).length}`);
  console.log(`  Recommendations: ${analytics.recommendations.length}`);
  
  if (analytics.recommendations.length > 0) {
    console.log('\nRecommendations:');
    analytics.recommendations.forEach(rec => {
      const icon = rec.severity === 'high' ? '🔴' : rec.severity === 'medium' ? '⚠️' : '✅';
      console.log(`  ${icon} [${rec.severity.toUpperCase()}] ${rec.message}`);
    });
  }
}

// Run
generateSampleData().catch(console.error);
