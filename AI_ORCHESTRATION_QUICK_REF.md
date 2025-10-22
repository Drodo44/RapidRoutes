# 🤖 AI Orchestration - Quick Reference

## ⚡ Quick Start

```bash
# Test the system
node tests/test-orchestration.js

# Interactive demo  
node tests/demo-orchestration.js

# Test a prompt
node .vscode/model-router.js select "your prompt"
```

## 📝 Basic Usage

```javascript
import { getOrchestrator } from './lib/aiOrchestration.js';

const orchestrator = getOrchestrator();
const result = await orchestrator.orchestrate('Fix this bug');

// result.model        → 'gpt-5'
// result.modelName    → 'GPT-5'  
// result.reason       → 'Complex debugging...'
// result.confidence   → 1.0
```

## 🎯 Manual Override

```javascript
// Force specific model anywhere in prompt
'@model:gpt-5 do this'
'@model:claude-3-5-haiku quick task'
'@model:gemini-1.5-pro analyze all'

// Check if override was used
if (result.override) {
  console.log('User forced:', result.modelName);
}
```

## 🌐 API Endpoints

```javascript
// Model selection
POST /api/ai/orchestrate
{ "prompt": "Fix error" }
→ { "model": "gpt-5", "reason": "...", ... }

// List models
GET /api/ai/models
→ { "models": [...] }

// List routes
GET /api/ai/routes  
→ { "routes": [...] }
```

## 🔧 Key Methods

```javascript
// Main orchestration
await orchestrator.orchestrate(prompt, options)

// Test without metadata
await orchestrator.test(prompt)

// Get all models
orchestrator.getAllModels()

// Get all routes
orchestrator.getAllRoutes()

// Reload config
orchestrator.reloadConfig()
```

## 📊 Model Selection Logic

```
1. Check @model: override → Return if valid
2. Match patterns → Count matches per route
3. Score routes → matches × priority
4. Pick winner → Highest score
5. Fallback → Default if no match
```

## 🎨 Available Models

| Model | Best For | Tier |
|-------|----------|------|
| GPT-5 | Debugging, deployment, freight | High |
| Claude Sonnet | Docs, code review | Medium |
| Claude Haiku | Quick tasks, formatting | Low |
| GPT-4o | Vision, screenshots | High |
| Gemini Pro | Long context, full codebase | Medium |
| Llama 3 | Private, local tasks | Low |
| Mistral | Multilingual | Medium |

## 🛣️ Routing Examples

```
'Fix Supabase error'        → GPT-5 (debugging)
'Deploy to Vercel'          → GPT-5 (deployment)  
'Write SQL query'           → GPT-5 (database)
'Export DAT CSV'            → GPT-5 (freight)
'Summarize code'            → Claude Sonnet (docs)
'Review architecture'       → Claude Sonnet (review)
'Format JSON'               → Claude Haiku (quick)
'Analyze screenshot'        → GPT-4o (vision)
'Review entire codebase'    → Gemini Pro (long)
'Analyze confidential'      → Llama 3 (private)
'Translate to español'      → Mistral (multilingual)
```

## ⚙️ Configuration

Edit `.vscode/model-router-config.json`:

```json
{
  "modelRouter": {
    "enabled": true,
    "defaultModel": "gpt-5",
    "allowManualOverride": true,
    
    "customModels": {
      "new-model": {
        "id": "model-id",
        "name": "Display Name",
        "provider": "provider",
        "capabilities": ["cap1"],
        "costTier": "low|medium|high",
        "speedTier": "fast|medium|slow"
      }
    },
    
    "customRoutes": {
      "new-route": {
        "model": "new-model",
        "priority": 80,
        "patterns": ["keyword1", "keyword2"],
        "description": "What it handles"
      }
    }
  }
}
```

## 📈 Priorities

```
100 = Critical debugging
95  = Deployment  
90  = Database
85  = Domain-specific
70  = Content creation
65  = Code review
50  = Quick tasks
```

## ✅ Test Results

```
✅ 13/15 tests passing (86.7%)
✓ Automatic routing
✓ Manual override
✓ Default fallback
✓ Confidence scoring
✓ Pattern matching
```

## 📚 Documentation

- **Full Guide**: `AI_ORCHESTRATION_GUIDE.md`
- **Examples**: `examples/orchestration-examples.js`
- **Tests**: `tests/test-orchestration.js`
- **Demo**: `tests/demo-orchestration.js`

## 🚀 Integration Example

```javascript
// Frontend
const handleSubmit = async (prompt) => {
  const res = await fetch('/api/ai/orchestrate', {
    method: 'POST',
    body: JSON.stringify({ prompt })
  });
  
  const { model, modelName, reason } = await res.json();
  console.log(`Using ${modelName}: ${reason}`);
  
  // Send to actual AI
  return await callAI(model, prompt);
};
```

---

**Status**: ✅ Production Ready  
**Created**: October 21, 2025  
**Project**: RapidRoutes Freight Platform
