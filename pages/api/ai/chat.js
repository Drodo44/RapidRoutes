const GEMINI_MODELS_ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models';
const SERPER_ENDPOINT = 'https://google.serper.dev/search';
const JINA_READER_BASE = 'https://r.jina.ai';

const MODEL_CACHE_TTL_MS = 10 * 60 * 1000;
const LIST_MODELS_TIMEOUT_MS = 10000;
const SERPER_TIMEOUT_MS = 10000;
const JINA_TIMEOUT_MS = 15000;
const GEMINI_TIMEOUT_MS = 30000;

const MAX_SERPER_RESULTS = 5;
const MAX_JINA_LINKS = 3;
const MAX_JINA_CHARS_PER_PAGE = 20000;
const MAX_TOTAL_JINA_CHARS = 60000;
const MAX_RESEARCH_CONTEXT_CHARS = 70000;

const modelCache = {
  expiresAt: 0,
  models: [],
  selectedModel: ''
};

const BASE_SYSTEM_INSTRUCTION = [
  'Follow the user instructions exactly.',
  'Use REFERENCE MATERIAL silently for factual grounding.',
  'Do not mention research, sources, scraping, Serper, Jina, or reference material unless the user explicitly asks for sources or links.',
  'Do not add extra sections, labels, preambles, headings, or commentary unless the user asks for them.',
  'Ask follow-up questions only if required inputs are truly missing to complete the exact request, then stop.',
  'If the user asks for a constrained format (for example "output only four email bodies"), return exactly that format and nothing else.',
  'When the user specifies a count, return exactly that number of complete outputs.'
].join(' ');

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

function takeFirstWords(text, count) {
  if (typeof text !== 'string') return '';
  return text.trim().split(/\s+/).slice(0, count).join(' ');
}

function cleanForSearch(text) {
  return String(text || '')
    .replace(/\b(output|respond|return)\b[^\n]{0,120}?\b(only|exactly)\b/gi, ' ')
    .replace(/\b(do not|don't)\b[^\n]{0,160}/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
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
    /\bcompany\s*:\s*([^\n]+)/i,
    /\bfor\s+([A-Z][A-Za-z0-9&'.,\-\s]{2,70})\b/,
    /\babout\s+([A-Z][A-Za-z0-9&'.,\-\s]{2,70})\b/
  ];

  for (const pattern of patterns) {
    const match = pattern.exec(message);
    if (!match?.[1]) continue;

    const candidate = String(match[1])
      .replace(/["“”]/g, '')
      .replace(/\s+/g, ' ')
      .trim();

    if (candidate) return candidate;
  }

  return '';
}

function buildSerperQuery(messages) {
  const userTurns = messages
    .filter((message) => message.role === 'user')
    .map((message) => message.content)
    .filter(Boolean);

  const lastUserRaw = userTurns[userTurns.length - 1] || '';
  const priorUserRaw = userTurns.slice(0, -1).slice(-2).join(' ');

  const lastUser = cleanForSearch(lastUserRaw);
  const priorUser = cleanForSearch(priorUserRaw);

  const target = extractLikelyCompanyOrDomain(lastUser)
    || extractLikelyCompanyOrDomain(priorUser)
    || takeFirstWords(lastUser || lastUserRaw, 16);

  const supportingContext = takeFirstWords(priorUser || priorUserRaw, 10);

  const baseQuery = [target, supportingContext].filter(Boolean).join(' ').trim();
  if (!baseQuery) return '';

  return `${baseQuery} company overview products services location recent news`;
}

function normalizeSerperResults(payload) {
  const organicResults = Array.isArray(payload?.organic) ? payload.organic : [];

  return organicResults.slice(0, MAX_SERPER_RESULTS).map((item) => ({
    title: typeof item?.title === 'string' ? item.title.trim() : '',
    link: normalizeHttpLink(item?.link || ''),
    snippet: typeof item?.snippet === 'string' ? item.snippet.trim() : ''
  })).filter((item) => item.link);
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

async function fetchSerperResults(query, serperApiKey) {
  if (!query) {
    return { results: [], notes: ['Serper query was empty.'] };
  }

  if (!serperApiKey) {
    return { results: [], notes: ['SERPER_API_KEY missing; search was skipped.'] };
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
      return { results: [], notes: [upstreamError] };
    }

    return { results: normalizeSerperResults(payload), notes: [] };
  } catch (error) {
    const message = error?.name === 'AbortError'
      ? 'Serper request timed out.'
      : 'Serper request failed.';
    console.error('[ai/chat] Serper request error:', error?.message || error);
    return { results: [], notes: [message] };
  }
}

async function fetchSingleJinaExtract(link, jinaApiKey, maxChars) {
  const normalizedLink = normalizeHttpLink(link);
  if (!normalizedLink) return null;

  const headers = {};
  if (jinaApiKey) {
    headers.Authorization = `Bearer ${jinaApiKey}`;
  }

  const response = await fetchWithTimeout(
    `${JINA_READER_BASE}/${normalizedLink}`,
    {
      method: 'GET',
      headers
    },
    JINA_TIMEOUT_MS
  );

  if (!response.ok) {
    throw new Error(`Jina Reader request failed with status ${response.status}.`);
  }

  const rawText = await response.text();
  const trimmed = String(rawText || '').trim();
  if (!trimmed) return null;

  return {
    link: normalizedLink,
    extract: trimmed.slice(0, maxChars)
  };
}

async function fetchJinaExtracts(links, jinaApiKey) {
  const normalizedLinks = links.map(normalizeHttpLink).filter(Boolean).slice(0, MAX_JINA_LINKS);
  if (normalizedLinks.length === 0) {
    return { extracts: [], notes: [] };
  }

  const extracts = [];
  const notes = [];
  let remainingChars = MAX_TOTAL_JINA_CHARS;

  for (const link of normalizedLinks) {
    if (remainingChars <= 0) break;

    const perPageLimit = Math.min(MAX_JINA_CHARS_PER_PAGE, remainingChars);

    try {
      const extract = await fetchSingleJinaExtract(link, jinaApiKey, perPageLimit);
      if (!extract) {
        notes.push(`Jina Reader returned empty content for ${link}.`);
        continue;
      }

      extracts.push(extract);
      remainingChars -= extract.extract.length;
    } catch (error) {
      const reason = error?.name === 'AbortError' ? 'timed out' : 'failed';
      notes.push(`Jina Reader ${reason} for ${link}.`);
    }
  }

  return { extracts, notes };
}

function buildResearchContext({ query, serperResults, pageExtracts, notes }) {
  const sourceByUrl = new Map(
    serperResults.map((item) => [item.link, item])
  );

  const lines = [
    'REFERENCE MATERIAL (DO NOT MENTION):',
    `Research Query: ${query || '(none)'}`,
    '',
    'Source List (Top Search Results):'
  ];

  if (serperResults.length === 0) {
    lines.push('- (none)');
  } else {
    serperResults.forEach((result, index) => {
      lines.push(`[${index + 1}] ${result.title || '(no title)'}`);
      lines.push(`URL: ${result.link || '(no link)'}`);
      lines.push(`Snippet: ${result.snippet || '(no snippet)'}`);
      lines.push('');
    });
  }

  lines.push('Scraped Page Extracts (Top 3):');

  if (pageExtracts.length === 0) {
    lines.push('- (none)');
  } else {
    pageExtracts.forEach((extract, index) => {
      const source = sourceByUrl.get(extract.link);
      lines.push(`----- SOURCE ${index + 1} -----`);
      lines.push(`Title: ${source?.title || '(unknown)'}`);
      lines.push(`URL: ${extract.link}`);
      lines.push(extract.extract);
      lines.push('----- END SOURCE -----');
      lines.push('');
    });
  }

  if (notes.length > 0) {
    lines.push('Research Notes:');
    notes.forEach((note) => lines.push(`- ${note}`));
  }

  const context = lines.join('\n').trim();
  if (context.length <= MAX_RESEARCH_CONTEXT_CHARS) {
    return context;
  }

  return `${context.slice(0, MAX_RESEARCH_CONTEXT_CHARS - 24)}\n[context truncated]`;
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

async function generateWithGeminiModel({ apiKey, model, contents, researchContext }) {
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
          parts: [
            { text: BASE_SYSTEM_INSTRUCTION },
            { text: researchContext }
          ]
        },
        contents,
        generationConfig: {
          temperature: 0.2,
          topP: 0.9,
          maxOutputTokens: 2200
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

    const query = buildSerperQuery(normalizedMessages);
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

    const contents = toGeminiContents(normalizedMessages);
    const overrideModel = normalizeModelName(process.env.GEMINI_MODEL);
    let geminiResult;
    let selectedModel = '';

    if (overrideModel) {
      geminiResult = await generateWithGeminiModel({
        apiKey: geminiApiKey,
        model: overrideModel,
        contents,
        researchContext
      });
      selectedModel = overrideModel;

      if (!geminiResult.ok) {
        console.error('[ai/chat] GEMINI_MODEL override failed, falling back to auto-selected model:', geminiResult.status);
        const fallbackModel = await getAutoSelectedModel(geminiApiKey);
        if (fallbackModel !== overrideModel) {
          geminiResult = await generateWithGeminiModel({
            apiKey: geminiApiKey,
            model: fallbackModel,
            contents,
            researchContext
          });
          selectedModel = fallbackModel;
        }
      }
    } else {
      selectedModel = await getAutoSelectedModel(geminiApiKey);
      geminiResult = await generateWithGeminiModel({
        apiKey: geminiApiKey,
        model: selectedModel,
        contents,
        researchContext
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
