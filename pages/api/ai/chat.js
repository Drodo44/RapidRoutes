const GEMINI_MODELS_ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models';
const SERPER_ENDPOINT = 'https://google.serper.dev/search';
const JINA_READER_BASE = 'https://r.jina.ai';

const MODEL_CACHE_TTL_MS = 10 * 60 * 1000;
const LIST_MODELS_TIMEOUT_MS = 10000;
const SERPER_TIMEOUT_MS = 4500;
const JINA_TIMEOUT_MS = 3500;
const GEMINI_TIMEOUT_MS = 35000;
const RESEARCH_BUDGET_MS = 12000;

const MAX_SERPER_RESULTS = 5;
const MAX_JINA_LINKS = 3;
const MAX_JINA_CHARS_PER_PAGE = 20000;
const MAX_TOTAL_JINA_CHARS = 60000;
const MAX_RESEARCH_CONTEXT_CHARS = 70000;
const MAX_CONTINUATIONS = 1;
const MAX_FORMAT_REPAIRS = 1;

const modelCache = {
  expiresAt: 0,
  models: [],
  selectedModel: ''
};

const NUMBER_WORDS = {
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
  eleven: 11,
  twelve: 12
};

const BASE_SYSTEM_INSTRUCTION = [
  'Follow the user instructions exactly.',
  'When the user requests an exact count or strict output shape, comply exactly.',
  'Use REFERENCE MATERIAL silently for factual grounding.',
  'Do not mention research, sources, scraping, Serper, Jina, or reference material unless the user explicitly asks for sources or links.',
  'Do not add extra sections, labels, preambles, headings, bullets, numbering, separators, or commentary unless the user asks for them.',
  'Ask follow-up questions only if required inputs are truly missing to complete the exact request, then stop.'
].join(' ');

function createRequestId() {
  if (typeof globalThis.crypto?.randomUUID === 'function') {
    return globalThis.crypto.randomUUID();
  }

  return `req_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
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

function parseAssistantText(payload) {
  const parts = payload?.candidates?.[0]?.content?.parts;
  if (!Array.isArray(parts)) return '';

  return parts
    .map((part) => (typeof part?.text === 'string' ? part.text : ''))
    .join('\n')
    .trim();
}

function extractFinishReason(payload) {
  const reason = payload?.candidates?.[0]?.finishReason;
  return typeof reason === 'string' ? reason : '';
}

function extractUsage(payload) {
  const usage = payload?.usageMetadata || {};

  return {
    promptTokenCount: Number.isFinite(usage.promptTokenCount) ? usage.promptTokenCount : null,
    outputTokenCount: Number.isFinite(usage.candidatesTokenCount)
      ? usage.candidatesTokenCount
      : (Number.isFinite(usage.outputTokenCount) ? usage.outputTokenCount : null),
    totalTokenCount: Number.isFinite(usage.totalTokenCount) ? usage.totalTokenCount : null
  };
}

function mergeUsage(firstUsage, secondUsage) {
  const keys = ['promptTokenCount', 'outputTokenCount', 'totalTokenCount'];
  const merged = {};

  keys.forEach((key) => {
    const a = firstUsage?.[key];
    const b = secondUsage?.[key];

    if (Number.isFinite(a) && Number.isFinite(b)) {
      merged[key] = a + b;
      return;
    }

    if (Number.isFinite(a)) {
      merged[key] = a;
      return;
    }

    if (Number.isFinite(b)) {
      merged[key] = b;
      return;
    }

    merged[key] = null;
  });

  return merged;
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
    /\bfor\s+([A-Z][A-Za-z0-9&'.,\-\s]{2,80})\b/,
    /\babout\s+([A-Z][A-Za-z0-9&'.,\-\s]{2,80})\b/
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

function extractRequestedEmailBodyCount(message) {
  const input = String(message || '');
  if (!/email\s+bod(?:y|ies)/i.test(input)) {
    return null;
  }

  const directDigitMatch = input.match(/\b(\d{1,2})\b(?=[^\n]{0,60}email\s+bod(?:y|ies))/i)
    || input.match(/email\s+bod(?:y|ies)[^\n]{0,60}\b(\d{1,2})\b/i);

  if (directDigitMatch?.[1]) {
    const value = Number.parseInt(directDigitMatch[1], 10);
    return Number.isFinite(value) && value > 0 ? value : null;
  }

  const wordPattern = Object.keys(NUMBER_WORDS).join('|');
  const directWordMatch = input.match(new RegExp(`\\b(${wordPattern})\\b(?=[^\\n]{0,60}email\\s+bod(?:y|ies))`, 'i'))
    || input.match(new RegExp(`email\\s+bod(?:y|ies)[^\\n]{0,60}\\b(${wordPattern})\\b`, 'i'));

  if (directWordMatch?.[1]) {
    return NUMBER_WORDS[directWordMatch[1].toLowerCase()] || null;
  }

  if (/output\s+only\s+the\s+four\s+email\s+bodies/i.test(input)) {
    return 4;
  }

  return null;
}

function countBodies(output) {
  return String(output || '')
    .split(/\n\n+/)
    .map((segment) => segment.trim())
    .filter(Boolean)
    .length;
}

function splitEmailBodies(output) {
  return String(output || '')
    .replace(/\r\n/g, '\n')
    .trim()
    .split(/\n\s*\n/)
    .map((segment) => segment.trim())
    .filter(Boolean);
}

function hasDisallowedBodyFormatting(output) {
  const value = String(output || '');

  const disallowedPatterns = [
    /^subject\s*:/im,
    /^\s*(?:email|body)\s*\d+\s*[:\-]/im,
    /^\s*\*{3,}\s*$/m,
    /^\s*#{1,6}\s+/m,
    /^\s*\d+\s*[.)]\s+/m,
    /```/
  ];

  return disallowedPatterns.some((pattern) => pattern.test(value));
}

function validateEmailBodyOutput(output, requestedBodyCount) {
  if (!requestedBodyCount) {
    return { ok: true, reason: '', bodyCount: countBodies(output) };
  }

  const trimmed = String(output || '').trim();
  if (!trimmed) {
    return { ok: false, reason: 'empty_response', bodyCount: 0 };
  }

  const bodies = splitEmailBodies(trimmed);
  if (bodies.length !== requestedBodyCount) {
    return {
      ok: false,
      reason: `expected_${requestedBodyCount}_bodies_got_${bodies.length}`,
      bodyCount: bodies.length
    };
  }

  if (hasDisallowedBodyFormatting(trimmed)) {
    return { ok: false, reason: 'contains_disallowed_formatting', bodyCount: bodies.length };
  }

  const hasMultiParagraphBody = bodies.some((body) => body.includes('\n'));
  if (hasMultiParagraphBody) {
    return { ok: false, reason: 'body_not_single_paragraph', bodyCount: bodies.length };
  }

  return { ok: true, reason: '', bodyCount: bodies.length };
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

function remainingBudgetMs(deadlineMs) {
  return Math.max(0, deadlineMs - Date.now());
}

async function fetchWithTimeout(url, options, timeoutMs) {
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) {
    throw new Error('Timeout budget exhausted before fetch call.');
  }

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

async function fetchSerperResults(query, serperApiKey, deadlineMs) {
  if (!query) {
    return { results: [], notes: ['Serper query was empty.'] };
  }

  if (!serperApiKey) {
    return { results: [], notes: ['SERPER_API_KEY missing; search was skipped.'] };
  }

  const timeoutMs = Math.min(SERPER_TIMEOUT_MS, remainingBudgetMs(deadlineMs));
  if (timeoutMs <= 0) {
    return { results: [], notes: ['Research time budget exhausted before Serper search.'] };
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
      timeoutMs
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

async function fetchSingleJinaExtract(link, jinaApiKey, maxChars, timeoutMs) {
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
    timeoutMs
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

async function fetchJinaExtracts(links, jinaApiKey, deadlineMs) {
  const normalizedLinks = links.map(normalizeHttpLink).filter(Boolean).slice(0, MAX_JINA_LINKS);
  if (normalizedLinks.length === 0) {
    return { extracts: [], notes: [] };
  }

  const extracts = [];
  const notes = [];
  let remainingChars = MAX_TOTAL_JINA_CHARS;

  for (const link of normalizedLinks) {
    if (remainingChars <= 0) break;

    const budgetLeft = remainingBudgetMs(deadlineMs);
    if (budgetLeft <= 0) {
      notes.push('Research time budget exhausted before finishing Jina fetches.');
      break;
    }

    const timeoutMs = Math.min(JINA_TIMEOUT_MS, budgetLeft);
    const perPageLimit = Math.min(MAX_JINA_CHARS_PER_PAGE, remainingChars);

    try {
      const extract = await fetchSingleJinaExtract(link, jinaApiKey, perPageLimit, timeoutMs);
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

function buildRequestSpecificInstruction(latestUserMessage) {
  const requestedBodies = extractRequestedEmailBodyCount(latestUserMessage);
  if (!requestedBodies) return '';

  return [
    `This request requires exactly ${requestedBodies} email bodies.`,
    'Output only the email body text, with no subject lines.',
    'Return plain text only.',
    'Do not include labels, numbering, bullets, markdown, or separators like ***.',
    'Each body must be one concise paragraph.',
    'Separate each body with exactly one blank line.',
    `The total number of bodies must be exactly ${requestedBodies}; no more and no fewer.`
  ].join(' ');
}

async function generateWithGeminiModel({
  apiKey,
  model,
  contents,
  researchContext,
  latestUserMessage,
  extraSystemInstruction = ''
}) {
  const normalizedModel = normalizeModelName(model);
  if (!normalizedModel) {
    throw new Error('Gemini model name is empty.');
  }

  const requestSpecificInstruction = buildRequestSpecificInstruction(latestUserMessage);

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
            requestSpecificInstruction ? { text: requestSpecificInstruction } : null,
            extraSystemInstruction ? { text: extraSystemInstruction } : null,
            { text: researchContext }
          ].filter(Boolean)
        },
        contents,
        generationConfig: {
          temperature: 0.1,
          topP: 0.8,
          maxOutputTokens: 4000
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

function shouldContinueForTruncation({ requestedBodyCount, assistantMessage, finishReason, attempt }) {
  if (!requestedBodyCount) return false;
  if (attempt >= MAX_CONTINUATIONS) return false;
  if (!assistantMessage.trim()) return false;

  const normalizedReason = String(finishReason || '').toUpperCase();
  const truncated = normalizedReason.includes('MAX_TOKENS') || normalizedReason.includes('LENGTH');
  if (!truncated) return false;

  const producedBodies = countBodies(assistantMessage);
  return producedBodies < requestedBodyCount;
}

function buildContinuationPrompt(remainingBodies) {
  return [
    'Continue exactly where you left off.',
    `Output only the remaining ${remainingBodies} email bodies.`,
    'No subject lines, no labels, no numbering, no separators.',
    'Each body must be one concise paragraph.',
    'Separate bodies by exactly one blank line.'
  ].join(' ');
}

function buildFormatRepairInstruction(requestedBodyCount, reason) {
  return [
    `The previous candidate did not satisfy strict format validation (${reason}).`,
    `Regenerate the full answer from scratch with exactly ${requestedBodyCount} email bodies.`,
    'Output plain text only.',
    'No subject lines, no headers, no numbering, no bullets, no markdown, and no separators.',
    'Each body must be one concise paragraph.',
    `Separate each body with exactly one blank line. Return exactly ${requestedBodyCount} bodies.`
  ].join(' ');
}

function logTelemetry(telemetry) {
  console.log('[ai/chat][telemetry]', JSON.stringify(telemetry));
}

export default async function handler(req, res) {
  const startedAt = Date.now();
  const requestId = createRequestId();
  const streamingEnabled = false;

  let clientAborted = false;
  let clientClosedBeforeResponse = false;

  req.on?.('aborted', () => {
    clientAborted = true;
    console.warn(`[ai/chat][${requestId}] client aborted request`);
  });

  req.on?.('close', () => {
    if (!res.writableEnded) {
      clientClosedBeforeResponse = true;
      console.warn(`[ai/chat][${requestId}] request closed before response completed`);
    }
  });

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const geminiApiKey = process.env.GEMINI_API_KEY;
  if (!geminiApiKey) {
    console.error('[ai/chat] GEMINI_API_KEY missing');
    return res.status(500).json({ error: 'GEMINI_API_KEY missing' });
  }

  let selectedModel = '';
  let finishReason = '';
  let continuationFinishReason = '';
  let usageSummary = { promptTokenCount: null, outputTokenCount: null, totalTokenCount: null };
  let responseByteLength = 0;
  let continuationUsed = false;
  let formatRepairUsed = false;
  let formatRepairReason = '';
  let formatRepairFinishReason = '';
  let query = '';
  let serperResultsCount = 0;
  let jinaExtractsCount = 0;
  let requestedBodyCount = null;
  let finalBodyCount = 0;

  try {
    const normalizedMessages = normalizeIncomingMessages(req.body);
    if (!ensureLastMessageIsUser(normalizedMessages)) {
      return res.status(400).json({ error: 'messages must end with a non-empty user message.' });
    }

    const latestUserMessage = normalizedMessages[normalizedMessages.length - 1]?.content || '';

    const researchDeadline = Date.now() + RESEARCH_BUDGET_MS;

    query = buildSerperQuery(normalizedMessages);
    const { results: serperResults, notes: serperNotes } = await fetchSerperResults(
      query,
      process.env.SERPER_API_KEY,
      researchDeadline
    );
    serperResultsCount = serperResults.length;

    const links = serperResults.map((item) => item.link).filter(Boolean).slice(0, MAX_JINA_LINKS);
    const { extracts: pageExtracts, notes: jinaNotes } = await fetchJinaExtracts(
      links,
      process.env.JINA_API_KEY,
      researchDeadline
    );
    jinaExtractsCount = pageExtracts.length;

    const researchContext = buildResearchContext({
      query,
      serperResults,
      pageExtracts,
      notes: [...serperNotes, ...jinaNotes]
    });

    const contents = toGeminiContents(normalizedMessages);
    const overrideModel = normalizeModelName(process.env.GEMINI_MODEL);
    let geminiResult;

    if (overrideModel) {
      geminiResult = await generateWithGeminiModel({
        apiKey: geminiApiKey,
        model: overrideModel,
        contents,
        researchContext,
        latestUserMessage
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
            researchContext,
            latestUserMessage
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
        researchContext,
        latestUserMessage
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

    finishReason = extractFinishReason(payload);
    usageSummary = extractUsage(payload);

    let assistantMessage = parseAssistantText(payload);
    if (!assistantMessage) {
      return res.status(502).json({ error: 'AI response was empty. Please try again.' });
    }

    requestedBodyCount = extractRequestedEmailBodyCount(latestUserMessage);

    if (shouldContinueForTruncation({
      requestedBodyCount,
      assistantMessage,
      finishReason,
      attempt: 0
    })) {
      const producedBodies = countBodies(assistantMessage);
      const remainingBodies = Math.max(0, requestedBodyCount - producedBodies);

      if (remainingBodies > 0) {
        continuationUsed = true;

        const continuationPrompt = buildContinuationPrompt(remainingBodies);
        const continuationContents = [
          ...contents,
          { role: 'model', parts: [{ text: assistantMessage }] },
          { role: 'user', parts: [{ text: continuationPrompt }] }
        ];

        const continuationResult = await generateWithGeminiModel({
          apiKey: geminiApiKey,
          model: selectedModel,
          contents: continuationContents,
          researchContext,
          latestUserMessage: continuationPrompt
        });

        if (continuationResult.ok) {
          continuationFinishReason = extractFinishReason(continuationResult.payload);
          usageSummary = mergeUsage(usageSummary, extractUsage(continuationResult.payload));

          const continuationText = parseAssistantText(continuationResult.payload);
          if (continuationText) {
            assistantMessage = `${assistantMessage.trim()}\n\n${continuationText.trim()}`;
          }
        }
      }
    }

    if (requestedBodyCount) {
      let validation = validateEmailBodyOutput(assistantMessage, requestedBodyCount);
      finalBodyCount = validation.bodyCount;

      if (!validation.ok) {
        formatRepairReason = validation.reason;

        for (let attempt = 0; attempt < MAX_FORMAT_REPAIRS; attempt += 1) {
          formatRepairUsed = true;
          const formatRepairInstruction = buildFormatRepairInstruction(
            requestedBodyCount,
            validation.reason
          );

          const repairResult = await generateWithGeminiModel({
            apiKey: geminiApiKey,
            model: selectedModel,
            contents,
            researchContext,
            latestUserMessage,
            extraSystemInstruction: formatRepairInstruction
          });

          if (!repairResult.ok) {
            break;
          }

          formatRepairFinishReason = extractFinishReason(repairResult.payload);
          usageSummary = mergeUsage(usageSummary, extractUsage(repairResult.payload));

          const repairedMessage = parseAssistantText(repairResult.payload);
          if (!repairedMessage) {
            break;
          }

          const repairedValidation = validateEmailBodyOutput(repairedMessage, requestedBodyCount);
          validation = repairedValidation;
          finalBodyCount = repairedValidation.bodyCount;

          if (repairedValidation.ok) {
            assistantMessage = repairedMessage;
            formatRepairReason = '';
            break;
          }

          formatRepairReason = repairedValidation.reason;
        }

        if (!validation.ok) {
          const formatError = new Error(
            `AI response failed strict email-body formatting: ${validation.reason}`
          );
          formatError.status = 502;
          throw formatError;
        }
      }
    } else {
      finalBodyCount = countBodies(assistantMessage);
    }

    responseByteLength = Buffer.byteLength(assistantMessage, 'utf8');

    const endedAt = Date.now();
    logTelemetry({
      requestId,
      startedAt: new Date(startedAt).toISOString(),
      endedAt: new Date(endedAt).toISOString(),
      durationMs: endedAt - startedAt,
      streamingEnabled,
      model: selectedModel,
      finishReason,
      continuationUsed,
      continuationFinishReason: continuationFinishReason || null,
      formatRepairUsed,
      formatRepairReason: formatRepairReason || null,
      formatRepairFinishReason: formatRepairFinishReason || null,
      promptTokenCount: usageSummary.promptTokenCount,
      outputTokenCount: usageSummary.outputTokenCount,
      totalTokenCount: usageSummary.totalTokenCount,
      responseByteLength,
      clientAborted,
      clientClosedBeforeResponse,
      researchQuery: query,
      serperResultsCount,
      jinaExtractsCount,
      requestedBodyCount,
      finalBodyCount
    });

    return res.status(200).json({ reply: assistantMessage });
  } catch (error) {
    const endedAt = Date.now();

    logTelemetry({
      requestId,
      startedAt: new Date(startedAt).toISOString(),
      endedAt: new Date(endedAt).toISOString(),
      durationMs: endedAt - startedAt,
      streamingEnabled,
      model: selectedModel || null,
      finishReason: finishReason || null,
      continuationUsed,
      continuationFinishReason: continuationFinishReason || null,
      formatRepairUsed,
      formatRepairReason: formatRepairReason || null,
      formatRepairFinishReason: formatRepairFinishReason || null,
      promptTokenCount: usageSummary.promptTokenCount,
      outputTokenCount: usageSummary.outputTokenCount,
      totalTokenCount: usageSummary.totalTokenCount,
      responseByteLength,
      clientAborted,
      clientClosedBeforeResponse,
      researchQuery: query,
      serperResultsCount,
      jinaExtractsCount,
      requestedBodyCount,
      finalBodyCount,
      errorMessage: error?.message || String(error)
    });

    if (error?.endpoint === GEMINI_MODELS_ENDPOINT) {
      const message = error?.message || 'Unable to auto-discover Gemini models.';
      return res.status(502).json({
        error: `Gemini ListModels failed at ${GEMINI_MODELS_ENDPOINT}: ${message}`
      });
    }

    console.error('[ai/chat] Proxy error:', error?.message || error);
    const status = Number.isInteger(error?.status) ? error.status : 500;
    const message = status === 502
      ? error?.message || 'AI service returned an invalid response format.'
      : 'Failed to process AI chat request.';
    return res.status(status).json({ error: message });
  }
}
