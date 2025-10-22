#!/usr/bin/env node

/**
 * Interactive AI Orchestration Demo
 * Demonstrates manual override syntax and automatic routing
 */

import AIOrchestrator from '../lib/aiOrchestration.js';
import readline from 'readline';

const orchestrator = new AIOrchestrator();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log('🤖 AI Orchestration Layer - Interactive Demo\n');
console.log('═'.repeat(60));
console.log('\n💡 How to use:');
console.log('   • Type a prompt and press Enter');
console.log('   • Use @model:<model-id> for manual override');
console.log('   • Type "help" for examples');
console.log('   • Type "models" to see available models');
console.log('   • Type "routes" to see routing rules');
console.log('   • Type "exit" to quit\n');
console.log('═'.repeat(60));

function showHelp() {
  console.log('\n📚 Example Prompts:\n');
  console.log('   Automatic routing:');
  console.log('   - "Fix this Supabase error"           → GPT-5 (debugging)');
  console.log('   - "Summarize this code"               → Claude Sonnet (docs)');
  console.log('   - "Quick format JSON"                 → Claude Haiku (fast)');
  console.log('   - "Export DAT CSV with KMA"           → GPT-5 (freight)\n');
  console.log('   Manual override:');
  console.log('   - "@model:gpt-5 do this"              → Force GPT-5');
  console.log('   - "@model:claude-3-5-haiku quick"     → Force Haiku');
  console.log('   - "@model:gemini-1.5-pro analyze"     → Force Gemini\n');
}

function showModels() {
  const models = orchestrator.getAllModels();
  console.log('\n📋 Available Models:\n');
  models.forEach(m => {
    console.log(`   ${m.name} (${m.id})`);
    console.log(`   └─ Provider: ${m.provider || 'unknown'} | Cost: ${m.costTier || 'n/a'} | Speed: ${m.speedTier || 'n/a'}`);
  });
  console.log('');
}

function showRoutes() {
  const routes = orchestrator.getAllRoutes();
  console.log('\n🛣️  Routing Rules:\n');
  routes.forEach(r => {
    console.log(`   [${r.priority}] ${r.name} → ${r.model}`);
    console.log(`   └─ ${r.description}`);
    console.log(`      Keywords: ${r.patterns?.slice(0, 5).join(', ')}...\n`);
  });
}

async function processPrompt(prompt) {
  if (!prompt.trim()) return;

  const lower = prompt.toLowerCase().trim();

  // Handle commands
  if (lower === 'exit' || lower === 'quit') {
    console.log('\n👋 Goodbye!\n');
    rl.close();
    process.exit(0);
  }

  if (lower === 'help') {
    showHelp();
    return;
  }

  if (lower === 'models') {
    showModels();
    return;
  }

  if (lower === 'routes') {
    showRoutes();
    return;
  }

  // Process with orchestrator
  try {
    console.log('\n🔍 Analyzing...');
    const result = await orchestrator.orchestrate(prompt);
    
    console.log('\n╭─ Result ' + '─'.repeat(52));
    console.log(`│ Model: ${result.modelName} (${result.model})`);
    if (result.provider) console.log(`│ Provider: ${result.provider}`);
    console.log(`│ Reason: ${result.reason}`);
    console.log(`│ Confidence: ${(result.confidence * 100).toFixed(1)}%`);
    if (result.override) console.log(`│ Override: Manual (@model directive)`);
    if (result.route) console.log(`│ Route: ${result.route}`);
    if (result.matchedPatterns?.length) {
      console.log(`│ Matched Patterns: ${result.matchedPatterns.join(', ')}`);
    }
    console.log(`│ Processing Time: ${result.metadata.processingTimeMs}ms`);
    console.log('╰' + '─'.repeat(60) + '\n');
    
  } catch (error) {
    console.log(`\n❌ Error: ${error.message}\n`);
  }
}

function prompt() {
  rl.question('\n💬 Enter prompt: ', async (input) => {
    await processPrompt(input);
    prompt();
  });
}

// Start interactive loop
prompt();
