/**
 * AI Orchestration - Usage Examples
 * Shows how to integrate the orchestration layer into your app
 */

import { getOrchestrator } from './lib/aiOrchestration.js';

// Example 1: Basic usage
async function basicExample() {
  const orchestrator = getOrchestrator();
  
  const result = await orchestrator.orchestrate(
    'Fix this production Supabase error'
  );
  
  console.log('Selected Model:', result.modelName);
  console.log('Reason:', result.reason);
  console.log('Confidence:', result.confidence);
  
  // Use result.model to send to actual AI service
  // await callAI(result.model, result.prompt);
}

// Example 2: With manual override
async function manualOverrideExample() {
  const orchestrator = getOrchestrator();
  
  // User forces specific model
  const result = await orchestrator.orchestrate(
    '@model:claude-3-5-haiku Quick format this data'
  );
  
  if (result.override) {
    console.log('User requested specific model:', result.modelName);
  }
}

// Example 3: Frontend integration
async function frontendExample() {
  // In your React/Next.js component:
  
  const handleSubmit = async (userPrompt) => {
    // Call API endpoint
    const response = await fetch('/api/ai/orchestrate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        prompt: userPrompt,
        options: {
          userId: 'user-123',
          conversationId: 'conv-456'
        }
      })
    });
    
    const result = await response.json();
    
    // Log selection
    console.log(`Using ${result.modelName}: ${result.reason}`);
    
    // Send to actual AI service based on result.model
    return result;
  };
}

// Example 4: Batch processing
async function batchExample() {
  const orchestrator = getOrchestrator();
  
  const prompts = [
    'Debug this error',
    'Write documentation',
    'Format this JSON',
    'Analyze screenshot'
  ];
  
  const results = await Promise.all(
    prompts.map(p => orchestrator.orchestrate(p))
  );
  
  // Group by model for efficient batch processing
  const byModel = {};
  for (const result of results) {
    if (!byModel[result.model]) byModel[result.model] = [];
    byModel[result.model].push(result);
  }
  
  console.log('Grouped by model:', Object.keys(byModel));
}

// Example 5: Testing without AI call
async function testExample() {
  const orchestrator = getOrchestrator();
  
  // Test what model would be selected without making API call
  const result = await orchestrator.test(
    'Generate DAT CSV export for freight lane'
  );
  
  console.log('Would use:', result.modelName);
  console.log('Because:', result.reason);
  console.log('Matched patterns:', result.matchedPatterns);
}

// Example 6: Get available models dynamically
async function listModelsExample() {
  const orchestrator = getOrchestrator();
  const models = orchestrator.getAllModels();
  
  // Show in UI dropdown
  const dropdown = models.map(m => ({
    value: m.id,
    label: `${m.name} (${m.costTier})`,
    provider: m.provider
  }));
  
  console.log('Dropdown options:', dropdown);
}

// Example 7: Hot reload configuration
async function hotReloadExample() {
  const orchestrator = getOrchestrator();
  
  // After user edits model-router-config.json
  orchestrator.reloadConfig();
  
  console.log('Configuration reloaded!');
}

// Example 8: API route handler (Next.js)
export async function apiRouteExample(req, res) {
  const { prompt } = req.body;
  
  const orchestrator = getOrchestrator();
  const selection = await orchestrator.orchestrate(prompt, {
    userId: req.session?.user?.id,
    ip: req.ip
  });
  
  // Log for analytics
  console.log('Model selected:', {
    model: selection.model,
    route: selection.route,
    confidence: selection.confidence,
    override: selection.override,
    timestamp: selection.metadata.timestamp
  });
  
  res.json({ success: true, ...selection });
}

// Example 9: Middleware integration
export function orchestrationMiddleware(req, res, next) {
  // Add orchestrator to request object
  req.aiOrchestrator = getOrchestrator();
  next();
}

// Example 10: Error handling
async function errorHandlingExample() {
  const orchestrator = getOrchestrator();
  
  try {
    const result = await orchestrator.orchestrate(
      '@model:invalid-model do something'
    );
    
    // If invalid override, it falls back to automatic
    console.log('Fallback to:', result.modelName);
    
  } catch (error) {
    console.error('Orchestration failed:', error);
    // Fallback to default model
  }
}

// Run examples
if (import.meta.url === `file://${process.argv[1]}`) {
  console.log('🎓 AI Orchestration - Usage Examples\n');
  
  console.log('Example 1: Basic usage');
  await basicExample();
  
  console.log('\nExample 2: Manual override');
  await manualOverrideExample();
  
  console.log('\nExample 5: Testing');
  await testExample();
  
  console.log('\nExample 6: List models');
  await listModelsExample();
}

export {
  basicExample,
  manualOverrideExample,
  frontendExample,
  batchExample,
  testExample,
  listModelsExample,
  hotReloadExample,
  apiRouteExample,
  orchestrationMiddleware,
  errorHandlingExample
};
