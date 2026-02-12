const GEMINI_MODELS_ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models';
const SERPER_ENDPOINT = 'https://google.serper.dev/search';
const JINA_READER_BASE = 'https://r.jina.ai';

const MODEL_CACHE_TTL_MS = 10 * 60 * 1000;
const LIST_MODELS_TIMEOUT_MS = 10000;
const SERPER_TIMEOUT_MS = 10000;
const JINA_TIMEOUT_MS = 10000;
const GEMINI_TIMEOUT_MS = 30000;
const MAX_SERPER_RESULTS = 5;
const MAX_JINA_LINKS = 3;
const MAX_JINA_CHARS = 10000;
const MAX_RESEARCH_CONTEXT_CHARS = 30000;

const modelCache = {
  expiresAt: 0,
  models: [],
  selectedModel: ''
};

function extractPromptFromRequest(body) {
  if (typeof body?.message === 'string') {
    return body.message;
  }

  if (!Array.isArray(body?.messages)) {
    return '';
  }

  for (let i = body.messages.length - 1; i >= 0; i -= 1) {
    const message = body.messages[i];
    if (message?.role === 'user' && typeof message?.content === 'string') {
      return message.content;
    }
  }

  return '';
}

function extractLikelyCompanyOrDomain(message) {
  if (typeof message !== 'string' || !message.trim()) {
    return '';
  }

  const domainMatch = message.match(/\b(?:https?:\/\/)?(?:www\.)?([a-z0-9-]+\.[a-z]{2,})(?:\/[^\s]*)?/i);
  if (domainMatch?.[1]) {
    return domainMatch[1].toLowerCase();
  }

  const patterns = [
    /\babout\s+["“]?([^"\n]+?)["”]?(?=(?:\s+(?:for|with|that|who|which|and|to|in|on|at)\b|[.,;:!?]|$))/i,
    /\bresearch\s+["“]?([^"\n]+?)["”]?(?=(?:\s+(?:for|with|that|who|which|and|to|in|on|at)\b|[.,;:!?]|$))/i,
    /\bcompany\s+["“]?([^"\n]+?)["”]?(?=(?:\s+(?:for|with|that|who|which|and|to|in|on|at)\b|[.,;:!?]|$))/i
  ];

  for (const pattern of patterns) {
    const match = pattern.exec(message);
    if (!match?.[1]) continue;
    const candidate = String(match[1]).replace(/^[\s"'“”]+|[\s"'“”]+$/g, '').trim();
    if (candidate) return candidate;
  }

  return '';
}

function takeFirstWords(text, count) {
  if (typeof text !== 'string') return '';
  return text.trim().split(/\s+/).slice(0, count).join(' ');
}

function buildSerperQuery(message) {
  const target = extractLikelyCompanyOrDomain(message) || takeFirstWords(message, 10);
  if (!target) return '';
  return `${target} company overview recent news customers competitors`;
}

function normalizeSerperResults(payload) {
  const organicResults = Array.isArray(payload?.organic) ? payload.organic : [];

  return organicResults.slice(0, MAX_SERPER_RESULTS).map((item) => ({
    title: typeof item?.title === 'string' ? item.title.trim() : '',
    link: typeof item?.link === 'string' ? item.link.trim() : '',
    snippet: typeof item?.snippet === 'string' ? item.snippet.trim() : ''
  }));
}

function parseAssistantText(payload) {
  const parts = payload?.candidates?.[0]?.content?.parts;
  if (!Array.isArray(parts)) return '';

  return parts
    .map((part) => (typeof part?.text === 'string' ? part.text : ''))
    .join('\n')
    .trim();
}

function normalizeModelName(modelName) {
  const trimmed = String(modelName || '').trim();
  if (!trimmed) return '';
  return trimmed.replace(/^models\//, '');
}

function normalizeHttpLink(link) {
  const trimmed = typeof link === 'string' ? link.trim() : '';
  if (!trimmed) return '';
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
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

async function fetchSerperResults(query, serperApiKey) {
  if (!serperApiKey) {
    return {
      results: [],
      notes: ['Search disabled: SERPER_API_KEY missing']
    };
  }

  try {
    const response = await fetchWithTimeout(
      SERPER_ENDPOINT,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-KEY': serperApiKey
        },
        body: JSON.stringify({ q: query, num: MAX_SERPER_RESULTS })
      },
      SERPER_TIMEOUT_MS
    );

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      const upstreamError =
        typeof payload?.message === 'string' && payload.message.trim()
          ? payload.message.trim()
          : `Serper request failed with status ${response.status}.`;
      console.error('[ai/chat] Serper upstream error:', response.status, upstreamError);
      return {
        results: [],
        notes: [upstreamError]
      };
    }

    return {
      results: normalizeSerperResults(payload),
      notes: []
    };
  } catch (error) {
    const message = error?.name === 'AbortError' ? 'Serper request timed out.' : 'Serper request failed.';
    console.error('[ai/chat] Serper request error:', error?.message || error);
    return {
      results: [],
      notes: [message]
    };
  }
}

async function fetchSingleJinaExtract(link, jinaApiKey) {
  const normalizedLink = normalizeHttpLink(link);
  if (!normalizedLink) return null;

  const response = await fetchWithTimeout(
    `${JINA_READER_BASE}/${normalizedLink}`,
    {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${jinaApiKey}`
      }
    },
    JINA_TIMEOUT_MS
  );

  if (!response.ok) {
    throw new Error(`Jina Reader request failed with status ${response.status}.`);
  }

  const rawText = await response.text();
  const text = String(rawText || '').trim().slice(0, MAX_JINA_CHARS);
  if (!text) return null;

  return {
    link: normalizedLink,
    extract: text
  };
}

async function fetchJinaExtracts(links, jinaApiKey) {
  if (!jinaApiKey) {
    return {
      extracts: [],
      notes: ['Jina Reader disabled: JINA_API_KEY missing']
    };
  }

  const normalizedLinks = links.map(normalizeHttpLink).filter(Boolean).slice(0, MAX_JINA_LINKS);
  if (normalizedLinks.length === 0) {
    return {
      extracts: [],
      notes: []
    };
  }

  const settled = await Promise.allSettled(
    normalizedLinks.map((link) => fetchSingleJinaExtract(link, jinaApiKey))
  );

  const extracts = [];
  const notes = [];

  settled.forEach((item, index) => {
    if (item.status === 'fulfilled') {
      if (item.value) extracts.push(item.value);
      return;
    }

    const reason = item.reason?.name === 'AbortError'
      ? 'timed out'
      : 'failed';
    notes.push(`Jina Reader ${reason} for ${normalizedLinks[index]}.`);
  });

  return { extracts, notes };
}

function buildResearchContext({ query, serperResults, pageExtracts, notes }) {
  const lines = ['RESEARCH_CONTEXT:', `Query: ${query || '(none)'}`, 'Search Results:'];
  if (serperResults.length === 0) {
    lines.push('- (none)');
  } else {
    serperResults.forEach((result, index) => {
      lines.push(`- [${index + 1}] ${result.title || '(no title)'}`);
      lines.push(`  Link: ${result.link || '(no link)'}`);
      lines.push(`  Snippet: ${result.snippet || '(no snippet)'}`);
    });
  }

  lines.push('Page Extracts:');
  if (pageExtracts.length === 0) {
    lines.push('- (none)');
  } else {
    pageExtracts.forEach((extract, index) => {
      lines.push(`- [${index + 1}] Source: ${extract.link}`);
      lines.push(`  Excerpt: ${extract.extract}`);
    });
  }

  if (notes.length > 0) {
    lines.push('Notes:');
    notes.forEach((note) => lines.push(`- ${note}`));
  }

  const context = lines.join('\n');
  if (context.length <= MAX_RESEARCH_CONTEXT_CHARS) {
    return context;
  }

  return `${context.slice(0, MAX_RESEARCH_CONTEXT_CHARS - 24)}\n[context truncated]`;
}

async function generateWithGeminiModel({ apiKey, model, researchContext, userPrompt }) {
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
            text: 'You are RapidRoutes AI. Use RESEARCH_CONTEXT for factual claims. If missing, say so. Do not invent facts.'
          }]
        },
        contents: [
          {
            role: 'user',
            parts: [{ text: researchContext }]
          },
          {
            role: 'user',
            parts: [{ text: userPrompt }]
          }
        ],
        generationConfig: {
          temperature: 0.4,
          maxOutputTokens: 900
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
    const userPrompt = extractPromptFromRequest(req.body);
    if (!userPrompt || !userPrompt.trim()) {
      return res.status(400).json({ error: 'message must be a non-empty string.' });
    }

    const query = buildSerperQuery(userPrompt);
    const { results: serperResults, notes: serperNotes } = await fetchSerperResults(
      query,
      process.env.SERPER_API_KEY
    );

    const links = serperResults.map((item) => item.link).filter(Boolean).slice(0, MAX_JINA_LINKS);
    const { extracts: pageExtracts, notes: jinaNotes } = await fetchJinaExtracts(
      links,
      process.env.JINA_API_KEY
    );

    const researchContext = buildResearchContext({
      query,
      serperResults,
      pageExtracts,
      notes: [...serperNotes, ...jinaNotes]
    });

    const overrideModel = normalizeModelName(process.env.GEMINI_MODEL);
    let geminiResult;
    let selectedModel = '';

    if (overrideModel) {
      geminiResult = await generateWithGeminiModel({
        apiKey: geminiApiKey,
        model: overrideModel,
        researchContext,
        userPrompt
      });
      selectedModel = overrideModel;

      if (!geminiResult.ok) {
        console.error('[ai/chat] GEMINI_MODEL override failed, falling back to auto-selected model:', geminiResult.status);
        const fallbackModel = await getAutoSelectedModel(geminiApiKey);
        if (fallbackModel !== overrideModel) {
          geminiResult = await generateWithGeminiModel({
            apiKey: geminiApiKey,
            model: fallbackModel,
            researchContext,
            userPrompt
          });
          selectedModel = fallbackModel;
        }
      }
    } else {
      selectedModel = await getAutoSelectedModel(geminiApiKey);
      geminiResult = await generateWithGeminiModel({
        apiKey: geminiApiKey,
        model: selectedModel,
        researchContext,
        userPrompt
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
