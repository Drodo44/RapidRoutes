const GEMINI_MODELS_ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models';

const MODEL_CACHE_TTL_MS = 10 * 60 * 1000;
const LIST_MODELS_TIMEOUT_MS = 10000;
const GEMINI_TIMEOUT_MS = 30000;

const modelCache = {
  expiresAt: 0,
  models: [],
  selectedModel: ''
};

function normalizeModelName(modelName) {
  const trimmed = String(modelName || '').trim();
  if (!trimmed) return '';
  return trimmed.replace(/^models\//, '');
}

function parseAssistantText(payload) {
  const parts = payload?.candidates?.[0]?.content?.parts;
  if (!Array.isArray(parts)) return '';

  return parts
    .map((part) => (typeof part?.text === 'string' ? part.text : ''))
    .join('\n')
    .trim();
}

function normalizeIncomingMessages(body) {
  const normalized = [];
  const sourceMessages = Array.isArray(body?.messages) ? body.messages : [];

  sourceMessages.forEach((message) => {
    if (!message || typeof message !== 'object') return;

    const role = message.role === 'assistant' ? 'assistant' : message.role === 'user' ? 'user' : '';
    const content = typeof message.content === 'string' ? message.content : '';

    if (!role || !content.trim()) return;
    normalized.push({ role, content });
  });

  if (normalized.length === 0 && typeof body?.message === 'string' && body.message.trim()) {
    normalized.push({ role: 'user', content: body.message });
  }

  return normalized;
}

function ensureLastMessageIsUser(messages) {
  if (!Array.isArray(messages) || messages.length === 0) {
    return false;
  }

  return messages[messages.length - 1]?.role === 'user';
}

function toGeminiContents(messages) {
  return messages.map((message) => ({
    role: message.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: message.content }]
  }));
}

async function fetchWithTimeout(url, options, timeoutMs) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal
    });
  } finally {
    clearTimeout(timeout);
  }
}

function supportsGenerateContent(model) {
  return Array.isArray(model?.supportedGenerationMethods)
    && model.supportedGenerationMethods.includes('generateContent');
}

function pickPreferredGeminiModel(models) {
  const supported = models
    .filter((model) => model && typeof model === 'object' && supportsGenerateContent(model))
    .map((model) => normalizeModelName(model.name))
    .filter(Boolean);

  const gemini3 = supported.find((name) => name.toLowerCase().includes('gemini-3'));
  if (gemini3) return gemini3;

  const pro = supported.find((name) => name.toLowerCase().includes('pro'));
  if (pro) return pro;

  const flash = supported.find((name) => name.toLowerCase().includes('flash'));
  if (flash) return flash;

  return '';
}

async function listGeminiModels(apiKey) {
  const now = Date.now();
  if (modelCache.expiresAt > now && modelCache.models.length > 0) {
    return modelCache.models;
  }

  const listUrl = `${GEMINI_MODELS_ENDPOINT}?key=${encodeURIComponent(apiKey)}`;
  const response = await fetchWithTimeout(
    listUrl,
    { method: 'GET' },
    LIST_MODELS_TIMEOUT_MS
  );

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const upstreamError =
      typeof payload?.error?.message === 'string' && payload.error.message.trim()
        ? payload.error.message.trim()
        : `ListModels request failed with status ${response.status}.`;
    const error = new Error(upstreamError);
    error.status = response.status;
    error.endpoint = GEMINI_MODELS_ENDPOINT;
    throw error;
  }

  const models = Array.isArray(payload?.models) ? payload.models : [];
  modelCache.models = models;
  modelCache.selectedModel = '';
  modelCache.expiresAt = now + MODEL_CACHE_TTL_MS;

  return models;
}

async function getAutoSelectedModel(apiKey) {
  const now = Date.now();
  if (modelCache.expiresAt > now && modelCache.selectedModel) {
    return modelCache.selectedModel;
  }

  const models = await listGeminiModels(apiKey);
  const selectedModel = pickPreferredGeminiModel(models);
  if (!selectedModel) {
    const error = new Error('No Gemini model supporting generateContent was returned by ListModels.');
    error.endpoint = GEMINI_MODELS_ENDPOINT;
    throw error;
  }

  modelCache.selectedModel = selectedModel;
  modelCache.expiresAt = now + MODEL_CACHE_TTL_MS;

  return selectedModel;
}

async function generateWithGeminiModel({ apiKey, model, contents }) {
  const normalizedModel = normalizeModelName(model);
  if (!normalizedModel) {
    throw new Error('Gemini model name is empty.');
  }

  const endpointWithoutKey = `${GEMINI_MODELS_ENDPOINT}/${encodeURIComponent(normalizedModel)}:generateContent`;
  const url = `${endpointWithoutKey}?key=${encodeURIComponent(apiKey)}`;

  const response = await fetchWithTimeout(
    url,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        systemInstruction: {
          role: 'system',
          parts: [{
            text: 'Follow the user instructions exactly. Use provided context silently. Do not mention research or hidden context. Do not inject default assumptions (for example company names, cities, or extra sections). If required inputs are missing, ask only for the missing required inputs and stop. If the user asks for only a specific output format, return exactly that and nothing else.'
          }]
        },
        contents,
        generationConfig: {
          temperature: 0.2,
          topP: 0.9,
          maxOutputTokens: 1600
        }
      })
    },
    GEMINI_TIMEOUT_MS
  );

  const payload = await response.json().catch(() => ({}));
  return {
    ok: response.ok,
    status: response.status,
    payload,
    endpointWithoutKey,
    model: normalizedModel
  };
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const geminiApiKey = process.env.GEMINI_API_KEY;
  if (!geminiApiKey) {
    console.error('[ai/chat] GEMINI_API_KEY missing');
    return res.status(500).json({ error: 'GEMINI_API_KEY missing' });
  }

  try {
    const normalizedMessages = normalizeIncomingMessages(req.body);
    if (!ensureLastMessageIsUser(normalizedMessages)) {
      return res.status(400).json({ error: 'messages must end with a non-empty user message.' });
    }

    const contents = toGeminiContents(normalizedMessages);
    const overrideModel = normalizeModelName(process.env.GEMINI_MODEL);
    let geminiResult;
    let selectedModel = '';

    if (overrideModel) {
      geminiResult = await generateWithGeminiModel({
        apiKey: geminiApiKey,
        model: overrideModel,
        contents
      });
      selectedModel = overrideModel;

      if (!geminiResult.ok) {
        console.error('[ai/chat] GEMINI_MODEL override failed, falling back to auto-selected model:', geminiResult.status);
        const fallbackModel = await getAutoSelectedModel(geminiApiKey);
        if (fallbackModel !== overrideModel) {
          geminiResult = await generateWithGeminiModel({
            apiKey: geminiApiKey,
            model: fallbackModel,
            contents
          });
          selectedModel = fallbackModel;
        }
      }
    } else {
      selectedModel = await getAutoSelectedModel(geminiApiKey);
      geminiResult = await generateWithGeminiModel({
        apiKey: geminiApiKey,
        model: selectedModel,
        contents
      });
    }

    const payload = geminiResult.payload;
    if (!geminiResult.ok) {
      const upstreamError =
        typeof payload?.error?.message === 'string' && payload.error.message.trim()
          ? payload.error.message.trim()
          : 'AI service is temporarily unavailable.';
      console.error('[ai/chat] Gemini upstream error:', geminiResult.status, selectedModel, upstreamError);
      return res.status(502).json({ error: upstreamError });
    }

    const assistantMessage = parseAssistantText(payload);
    if (!assistantMessage) {
      return res.status(502).json({ error: 'AI response was empty. Please try again.' });
    }

    return res.status(200).json({ reply: assistantMessage });
  } catch (error) {
    if (error?.endpoint === GEMINI_MODELS_ENDPOINT) {
      const message = error?.message || 'Unable to auto-discover Gemini models.';
      return res.status(502).json({
        error: `Gemini ListModels failed at ${GEMINI_MODELS_ENDPOINT}: ${message}`
      });
    }

    console.error('[ai/chat] Proxy error:', error?.message || error);
    return res.status(500).json({ error: 'Failed to process AI chat request.' });
  }
}
