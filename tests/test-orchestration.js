#!/usr/bin/env node

/**
 * AI Orchestration Layer - Comprehensive Test Suite
 * Tests automatic model selection, manual override, and edge cases
 */

import AIOrchestrator from '../lib/aiOrchestration.js';

const orchestrator = new AIOrchestrator();

console.log('🧪 AI Orchestration Layer - Test Suite\n');
console.log('═'.repeat(60));

// Test cases with expected outcomes
const testCases = [
  {
    name: 'Debugging Error',
    prompt: 'Fix this Supabase production error with stack trace',
    expectedModel: 'gpt-5',
    expectedRoute: 'debugging'
  },
  {
    name: 'Deployment Issue',
    prompt: 'Deploy to Vercel failed with build errors',
    expectedModel: 'gpt-5',
    expectedRoute: 'deployment'
  },
  {
    name: 'Database Query',
    prompt: 'Write a Supabase SQL query with RLS',
    expectedModel: 'gpt-5',
    expectedRoute: 'database'
  },
  {
    name: 'Freight Domain',
    prompt: 'Generate DAT CSV export for lane with KMA codes',
    expectedModel: 'gpt-5',
    expectedRoute: 'freight-domain'
  },
  {
    name: 'Documentation',
    prompt: 'Summarize this code and write documentation',
    expectedModel: 'claude-3-5-sonnet',
    expectedRoute: 'content-creation'
  },
  {
    name: 'Code Review',
    prompt: 'Review this code and suggest improvements',
    expectedModel: 'claude-3-5-sonnet',
    expectedRoute: 'code-review'
  },
  {
    name: 'Quick Format',
    prompt: 'Quick format this JSON log',
    expectedModel: 'claude-3-5-haiku',
    expectedRoute: 'quick-tasks'
  },
  {
    name: 'Vision Task',
    prompt: 'Analyze this screenshot for UI issues',
    expectedModel: 'gpt-4o',
    expectedRoute: 'vision-analysis'
  },
  {
    name: 'Long Context',
    prompt: 'Review the entire codebase for patterns',
    expectedModel: 'gemini-1.5-pro',
    expectedRoute: 'long-context'
  },
  {
    name: 'Private Task',
    prompt: 'Analyze this confidential data locally',
    expectedModel: 'llama-3-70b',
    expectedRoute: 'private-tasks'
  },
  {
    name: 'Translation',
    prompt: 'Translate this to español',
    expectedModel: 'mistral-large-2',
    expectedRoute: 'multilingual'
  },
  {
    name: 'Manual Override - GPT-5',
    prompt: '@model:gpt-5 This should use GPT-5',
    expectedModel: 'gpt-5',
    expectedOverride: true
  },
  {
    name: 'Manual Override - Claude Haiku',
    prompt: 'Do this task @model:claude-3-5-haiku quickly',
    expectedModel: 'claude-3-5-haiku',
    expectedOverride: true
  },
  {
    name: 'Manual Override - Gemini',
    prompt: '@model:gemini-1.5-pro analyze everything',
    expectedModel: 'gemini-1.5-pro',
    expectedOverride: true
  },
  {
    name: 'No Match - Default',
    prompt: 'Tell me a joke',
    expectedModel: 'gpt-5',
    expectedRoute: null
  }
];

let passed = 0;
let failed = 0;

// Run tests
for (const test of testCases) {
  console.log(`\n📝 Test: ${test.name}`);
  console.log(`   Prompt: "${test.prompt.substring(0, 60)}${test.prompt.length > 60 ? '...' : ''}"`);
  
  try {
    const result = await orchestrator.orchestrate(test.prompt);
    
    // Check model
    const modelMatch = result.model === test.expectedModel;
    
    // Check route (if expected)
    const routeMatch = test.expectedRoute 
      ? result.route === test.expectedRoute 
      : true;
    
    // Check override (if expected)
    const overrideMatch = test.expectedOverride !== undefined
      ? result.override === test.expectedOverride
      : true;

    const testPassed = modelMatch && routeMatch && overrideMatch;

    if (testPassed) {
      console.log(`   ✅ PASS`);
      console.log(`   → Model: ${result.modelName}`);
      console.log(`   → Reason: ${result.reason}`);
      console.log(`   → Confidence: ${(result.confidence * 100).toFixed(1)}%`);
      if (result.override) console.log(`   → Override: Yes`);
      passed++;
    } else {
      console.log(`   ❌ FAIL`);
      console.log(`   → Expected: ${test.expectedModel} ${test.expectedRoute ? `(${test.expectedRoute})` : ''}`);
      console.log(`   → Got: ${result.model} ${result.route ? `(${result.route})` : ''}`);
      if (result.matchedPatterns?.length) {
        console.log(`   → Matched: ${result.matchedPatterns.join(', ')}`);
      }
      failed++;
    }
    
  } catch (error) {
    console.log(`   ❌ ERROR: ${error.message}`);
    failed++;
  }
}

// Summary
console.log('\n' + '═'.repeat(60));
console.log('\n📊 Test Results:\n');
console.log(`   Total: ${testCases.length}`);
console.log(`   ✅ Passed: ${passed}`);
console.log(`   ❌ Failed: ${failed}`);
console.log(`   📈 Success Rate: ${((passed / testCases.length) * 100).toFixed(1)}%`);

if (failed === 0) {
  console.log('\n🎉 All tests passed!\n');
} else {
  console.log('\n⚠️  Some tests failed. Review output above.\n');
}

// Additional information
console.log('═'.repeat(60));
console.log('\n📚 Available Commands:\n');
console.log('   node tests/test-orchestration.js           - Run this test suite');
console.log('   node .vscode/model-router.js select "..."  - Test single prompt');
console.log('   node .vscode/model-router.js models        - List all models');
console.log('   node .vscode/model-router.js routes        - List all routes\n');

process.exit(failed > 0 ? 1 : 0);
