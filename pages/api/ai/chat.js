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
const MAX_SERPER_QUERIES = 3;
const MAX_JINA_LINKS = 3;
const MAX_JINA_CHARS_PER_PAGE = 20000;
const MAX_TOTAL_JINA_CHARS = 60000;
const MAX_RESEARCH_CONTEXT_CHARS = 70000;
const MAX_CONTINUATIONS = 1;
const MAX_FORMAT_REPAIRS = 1;
const MAX_TAILORING_REGENERATIONS = 1;

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

const COMPANY_SUFFIXES = [
  'inc',
  'incorporated',
  'corp',
  'corporation',
  'co',
  'company',
  'llc',
  'ltd',
  'limited',
  'plc',
  'group',
  'holdings',
  'international'
];

const LOW_SIGNAL_HOST_PATTERNS = [
  'zoominfo',
  'dnb.com',
  'signalhire',
  'rocketreach',
  'contactout',
  'theorg',
  'opencorporates',
  'buzzfile'
];

const TRUSTED_HOST_PATTERNS = [
  'sec.gov',
  'wikipedia.org',
  'reuters.com',
  'bloomberg.com',
  'yahoo.com',
  'investor',
  'newsroom'
];

const INDUSTRY_OPERATION_TERMS = [
  'wood',
  'timber',
  'lumber',
  'plywood',
  'osb',
  'engineered wood',
  'mill',
  'sawmill',
  'facility',
  'manufacturing',
  'operations',
  'distribution',
  'supply chain',
  'panel',
  'forest',
  'fiber',
  'capacity',
  'production'
];

const OPERATIONAL_PAIN_TERMS = [
  'delay',
  'downtime',
  'backlog',
  'bottleneck',
  'inefficiency',
  'complexity',
  'drag',
  'uncertainty',
  'lead time',
  'capacity',
  'volatility',
  'margin',
  'cost',
  'inventory',
  'service levels',
  'on-time',
  'throughput',
  'utilization',
  'reliability',
  'disruption',
  'compliance',
  'tariff',
  'labor'
];

const BANNED_GENERIC_PHRASES = [
  'through tql',
  "north america's largest",
  'private fleet of 2,600+ trailers',
  'private fleet of 2600+ trailers',
  'i have an opening at',
  'north america largest freight brokerage'
];

const STATE_NAME_BY_ABBREV = {
  AL: 'alabama',
  AK: 'alaska',
  AZ: 'arizona',
  AR: 'arkansas',
  CA: 'california',
  CO: 'colorado',
  CT: 'connecticut',
  DE: 'delaware',
  FL: 'florida',
  GA: 'georgia',
  HI: 'hawaii',
  ID: 'idaho',
  IL: 'illinois',
  IN: 'indiana',
  IA: 'iowa',
  KS: 'kansas',
  KY: 'kentucky',
  LA: 'louisiana',
  ME: 'maine',
  MD: 'maryland',
  MA: 'massachusetts',
  MI: 'michigan',
  MN: 'minnesota',
  MS: 'mississippi',
  MO: 'missouri',
  MT: 'montana',
  NE: 'nebraska',
  NV: 'nevada',
  NH: 'new hampshire',
  NJ: 'new jersey',
  NM: 'new mexico',
  NY: 'new york',
  NC: 'north carolina',
  ND: 'north dakota',
  OH: 'ohio',
  OK: 'oklahoma',
  OR: 'oregon',
  PA: 'pennsylvania',
  RI: 'rhode island',
  SC: 'south carolina',
  SD: 'south dakota',
  TN: 'tennessee',
  TX: 'texas',
  UT: 'utah',
  VT: 'vermont',
  VA: 'virginia',
  WA: 'washington',
  WV: 'west virginia',
  WI: 'wisconsin',
  WY: 'wyoming',
  DC: 'district of columbia'
};

const BASE_SYSTEM_INSTRUCTION = [
  'Follow the user instructions exactly.',
  'When the user requests an exact count or strict output shape, comply exactly.',
  'Use REFERENCE MATERIAL silently for factual grounding.',
  'Do not mention research, sources, scraping, Serper, Jina, or reference material unless the user explicitly asks for sources or links.',
  'If the user already provides company and location, do not ask for them again.',
  'Use provided company and location details directly in the copy when present.',
  'Avoid generic brokerage boilerplate or canned superlatives.',
  'Do not include scheduling lines unless the user explicitly asks for scheduling.',
  'Write in tight paragraph style with no headers; keep line breaks clean and intentional.',
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

function normalizeForMatch(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractCompanyFromMessage(message) {
  const input = String(message || '');
  if (!input.trim()) return '';

  const explicitMatch = input.match(/\bcompany\s*:\s*([^\n]+)/i);
  if (explicitMatch?.[1]) {
    return explicitMatch[1].replace(/[\r\t]/g, ' ').trim();
  }

  const fallback = extractLikelyCompanyOrDomain(input);
  if (!fallback) return '';
  if (fallback.includes('.')) return fallback;
  return fallback;
}

function extractLocationFromMessage(message) {
  const input = String(message || '');
  if (!input.trim()) return '';

  const explicitLocation = input.match(/\b(?:city|location)\s*:\s*([^\n]+)/i);
  if (explicitLocation?.[1]) {
    return explicitLocation[1].replace(/[\r\t]/g, ' ').trim();
  }

  const cityStateMatch = input.match(/\b([A-Za-z][A-Za-z.'\-\s]{1,50},\s*[A-Z]{2})\b/);
  if (cityStateMatch?.[1]) {
    return cityStateMatch[1].trim();
  }

  return '';
}

function parseCityState(locationText) {
  const location = String(locationText || '').trim();
  if (!location) {
    return { city: '', stateAbbrev: '', stateName: '' };
  }

  const match = location.match(/^([^,]+),\s*([A-Z]{2})$/i);
  if (match) {
    const stateAbbrev = match[2].toUpperCase();
    return {
      city: match[1].trim(),
      stateAbbrev,
      stateName: STATE_NAME_BY_ABBREV[stateAbbrev] || ''
    };
  }

  return { city: location, stateAbbrev: '', stateName: '' };
}

function extractPromptContext(messages) {
  const userMessages = messages
    .filter((message) => message.role === 'user')
    .map((message) => message.content)
    .filter(Boolean);

  const combined = userMessages.join('\n');
  const latest = userMessages[userMessages.length - 1] || '';

  const companyName = extractCompanyFromMessage(latest) || extractCompanyFromMessage(combined);
  const locationText = extractLocationFromMessage(latest) || extractLocationFromMessage(combined);
  const cityState = parseCityState(locationText);

  return {
    companyName: companyName.trim(),
    locationText: locationText.trim(),
    city: cityState.city,
    stateAbbrev: cityState.stateAbbrev,
    stateName: cityState.stateName,
    hasCompany: Boolean(companyName.trim()),
    hasLocation: Boolean(locationText.trim())
  };
}

function buildCompanyAliases(companyName) {
  const normalized = normalizeForMatch(companyName);
  if (!normalized) return [];

  const tokens = normalized
    .split(' ')
    .filter(Boolean)
    .filter((token) => !COMPANY_SUFFIXES.includes(token));

  if (tokens.length === 0) return [];

  const aliases = new Set();
  aliases.add(tokens.join(' '));
  aliases.add(tokens.slice(0, 2).join(' '));
  aliases.add(tokens[0]);

  return Array.from(aliases).filter((alias) => alias.length >= 3);
}

function extractIndustryHintFromPrompt(message) {
  const normalized = normalizeForMatch(message);
  const match = INDUSTRY_OPERATION_TERMS.find((term) => normalized.includes(term));
  return match || 'operations products';
}

function buildSerperQueries(messages, promptContext) {
  const userTurns = messages
    .filter((message) => message.role === 'user')
    .map((message) => message.content)
    .filter(Boolean);

  const lastUserRaw = userTurns[userTurns.length - 1] || '';
  const priorUserRaw = userTurns.slice(0, -1).slice(-2).join(' ');
  const company = promptContext.companyName;
  const location = promptContext.locationText;
  const industryHint = extractIndustryHintFromPrompt(`${lastUserRaw} ${priorUserRaw}`);

  const queries = [];

  if (company && location) {
    queries.push(`${company} ${location} business operations products`);
    queries.push(`${company} ${location} facility`);
    queries.push(`${company} ${industryHint} North America`);
  } else if (company) {
    queries.push(`${company} business operations products`);
    queries.push(`${company} facility locations`);
    queries.push(`${company} recent news`);
  } else {
    const cleanedLast = cleanForSearch(lastUserRaw);
    const cleanedPrior = cleanForSearch(priorUserRaw);
    const target = takeFirstWords(cleanedLast || lastUserRaw, 16);
    const supporting = takeFirstWords(cleanedPrior || priorUserRaw, 10);
    const fallback = [target, supporting].filter(Boolean).join(' ').trim();
    if (fallback) {
      queries.push(`${fallback} company overview products services location recent news`);
    }
  }

  return [...new Set(queries.map((query) => query.replace(/\s+/g, ' ').trim()).filter(Boolean))]
    .slice(0, MAX_SERPER_QUERIES);
}

function getHostname(link) {
  try {
    return new URL(normalizeHttpLink(link)).hostname.toLowerCase();
  } catch (_error) {
    return '';
  }
}

function scoreSerperResult(result, promptContext) {
  const hostname = getHostname(result.link);
  const text = normalizeForMatch(`${result.title} ${result.snippet}`);
  let score = 0;

  if (!hostname) {
    score -= 10;
  }

  if (LOW_SIGNAL_HOST_PATTERNS.some((pattern) => hostname.includes(pattern))) {
    score -= 6;
  }

  if (TRUSTED_HOST_PATTERNS.some((pattern) => hostname.includes(pattern))) {
    score += 4;
  }

  if (promptContext.companyName) {
    const companyToken = normalizeForMatch(promptContext.companyName).split(' ')[0] || '';
    if (companyToken && (hostname.includes(companyToken) || text.includes(companyToken))) {
      score += 6;
    }
  }

  if (promptContext.city && text.includes(normalizeForMatch(promptContext.city))) {
    score += 3;
  }

  if (promptContext.stateAbbrev && text.includes(promptContext.stateAbbrev.toLowerCase())) {
    score += 2;
  }

  if (INDUSTRY_OPERATION_TERMS.some((term) => text.includes(term))) {
    score += 2;
  }

  return score;
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
      .replace(/["\u201C\u201D]/g, '')
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

function userAskedForSubjects(latestUserMessage) {
  return /\bsubject\b/i.test(String(latestUserMessage || ''));
}

function userAskedForBullets(latestUserMessage) {
  return /\b(bullet|bulleted|list|numbered)\b/i.test(String(latestUserMessage || ''));
}

function userAskedForScheduling(latestUserMessage) {
  return /\b(schedule|scheduling|calendar|meeting|call|time to chat|availability)\b/i.test(
    String(latestUserMessage || '')
  );
}

function containsBulletFormatting(output) {
  return /^\s*(?:[-*]|\d+[.)])\s+/m.test(String(output || ''));
}

function containsSchedulingLine(output) {
  return /\b(i have an opening at|available (?:this|next)|book (?:a )?call|schedule (?:a )?call|calendar|15[-\s]?minute|30[-\s]?minute)\b/i
    .test(String(output || ''));
}

function containsMarkdownStyling(output) {
  const text = String(output || '');
  return /(^|\s)(\*\*|__)[^*_]+(\*\*|__)(\s|$)/.test(text)
    || /(^|\s)\*[^*\n]+\*(\s|$)/.test(text)
    || /(^|\s)_[^_\n]+_(\s|$)/.test(text)
    || /(^|\n)\s*#{1,6}\s+/.test(text)
    || /^(\s*\*{3,}\s*)$/m.test(text);
}

function buildSourceCorpus(serperResults, pageExtracts) {
  const snippets = serperResults.map((item) => `${item.title} ${item.snippet}`);
  const extracts = pageExtracts.map((item) => item.extract);
  return normalizeForMatch([...snippets, ...extracts].join(' '));
}

function isMinimalClarificationRequest(output) {
  const text = String(output || '').trim();
  if (!text || text.length > 260) return false;
  if ((text.match(/\?/g) || []).length !== 1) return false;
  if (text.split('\n').filter((line) => line.trim()).length > 2) return false;
  return /\b(please|could you|can you|share|confirm|provide|clarify|missing)\b/i.test(text);
}

function includesCompanyReference(output, companyName) {
  const normalizedOutput = normalizeForMatch(output);
  const aliases = buildCompanyAliases(companyName);
  return aliases.some((alias) => normalizedOutput.includes(alias));
}

function includesLocationReference(output, promptContext) {
  const normalizedOutput = normalizeForMatch(output);
  const locationTokens = [
    normalizeForMatch(promptContext.locationText),
    normalizeForMatch(promptContext.city),
    normalizeForMatch(promptContext.stateAbbrev),
    normalizeForMatch(promptContext.stateName)
  ].filter(Boolean);

  return locationTokens.some((token) => normalizedOutput.includes(token));
}

function hasValidParagraphShape(output, requestedBodyCount) {
  if (!requestedBodyCount) return true;

  const bodies = splitEmailBodies(output);
  if (bodies.length !== requestedBodyCount) return false;

  return bodies.every((body) => {
    const paragraphs = body.split(/\n\s*\n/).filter((segment) => segment.trim());
    if (paragraphs.length > 2) return false;

    const lines = body.split('\n').filter((line) => line.trim());
    if (lines.length > 8) return false;

    const wordCount = body.trim().split(/\s+/).filter(Boolean).length;
    return wordCount >= 30 && wordCount <= 130;
  });
}

function evaluateTailoringGate({
  latestUserMessage,
  assistantMessage,
  promptContext,
  serperResults,
  pageExtracts,
  requestedBodyCount
}) {
  const requiresTailoring = promptContext.hasCompany && promptContext.hasLocation;
  const reasons = [];
  const normalizedOutput = normalizeForMatch(assistantMessage);

  if (!requiresTailoring) {
    return {
      pass: true,
      reasons,
      requiresTailoring,
      matchedSourceSignalCount: 0,
      hasOperationalPainSignal: false
    };
  }

  if (!includesCompanyReference(assistantMessage, promptContext.companyName)) {
    reasons.push('missing_company_reference');
  }

  if (!includesLocationReference(assistantMessage, promptContext)) {
    reasons.push('missing_location_reference');
  }

  const sourceCorpus = buildSourceCorpus(serperResults, pageExtracts);
  const sourceBackedTerms = INDUSTRY_OPERATION_TERMS
    .filter((term) => sourceCorpus.includes(normalizeForMatch(term)));
  const matchedSourceTerms = sourceBackedTerms
    .filter((term) => normalizedOutput.includes(normalizeForMatch(term)));
  const hasOperationalPainSignal = OPERATIONAL_PAIN_TERMS
    .some((term) => normalizedOutput.includes(normalizeForMatch(term)));

  if (matchedSourceTerms.length === 0) {
    reasons.push('missing_source_backed_context_signal');
  }

  if (!hasOperationalPainSignal) {
    reasons.push('missing_operational_pain_signal');
  }

  if ((matchedSourceTerms.length + (hasOperationalPainSignal ? 1 : 0)) < 2) {
    reasons.push('insufficient_company_context_signals');
  }

  const bannedPhraseMatch = BANNED_GENERIC_PHRASES.find(
    (phrase) => normalizedOutput.includes(normalizeForMatch(phrase))
  );
  if (bannedPhraseMatch) {
    reasons.push(`banned_phrase:${bannedPhraseMatch}`);
  }

  if (!userAskedForSubjects(latestUserMessage) && /^subject\s*:/im.test(assistantMessage)) {
    reasons.push('subject_not_allowed');
  }

  if (!userAskedForBullets(latestUserMessage) && containsBulletFormatting(assistantMessage)) {
    reasons.push('bullets_not_allowed');
  }

  if (!userAskedForScheduling(latestUserMessage) && containsSchedulingLine(assistantMessage)) {
    reasons.push('scheduling_line_not_allowed');
  }

  if (containsMarkdownStyling(assistantMessage)) {
    reasons.push('markdown_not_allowed');
  }

  if (!hasValidParagraphShape(assistantMessage, requestedBodyCount)) {
    reasons.push('invalid_paragraph_shape');
  }

  const hasResearchSignals = sourceBackedTerms.length > 0 || pageExtracts.length > 0 || serperResults.length > 0;
  if (!hasResearchSignals && isMinimalClarificationRequest(assistantMessage)) {
    return {
      pass: true,
      reasons: [],
      requiresTailoring,
      matchedSourceSignalCount: matchedSourceTerms.length,
      hasOperationalPainSignal
    };
  }

  return {
    pass: reasons.length === 0,
    reasons,
    requiresTailoring,
    matchedSourceSignalCount: matchedSourceTerms.length,
    hasOperationalPainSignal
  };
}

function normalizeSerperResults(payload, query) {
  const organicResults = Array.isArray(payload?.organic) ? payload.organic : [];

  return organicResults.slice(0, MAX_SERPER_RESULTS).map((item) => ({
    title: typeof item?.title === 'string' ? item.title.trim() : '',
    link: normalizeHttpLink(item?.link || ''),
    snippet: typeof item?.snippet === 'string' ? item.snippet.trim() : '',
    hostname: getHostname(item?.link || ''),
    query
  })).filter((item) => item.link && item.hostname);
}

function chooseSerperResults(candidates, promptContext) {
  const dedupedByHostname = new Map();

  candidates.forEach((candidate) => {
    const score = scoreSerperResult(candidate, promptContext);
    const existing = dedupedByHostname.get(candidate.hostname);

    if (!existing || score > existing.score) {
      dedupedByHostname.set(candidate.hostname, { ...candidate, score });
    }
  });

  return Array.from(dedupedByHostname.values())
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_SERPER_RESULTS)
    .map((item) => ({
      title: item.title,
      link: item.link,
      snippet: item.snippet,
      hostname: item.hostname,
      score: item.score,
      query: item.query
    }));
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

async function fetchSerperResults(queries, serperApiKey, deadlineMs, promptContext) {
  if (!Array.isArray(queries) || queries.length === 0) {
    return { results: [], notes: ['Serper query was empty.'] };
  }

  if (!serperApiKey) {
    return { results: [], notes: ['SERPER_API_KEY missing; search was skipped.'] };
  }

  const notes = [];
  const allCandidates = [];

  for (const query of queries.slice(0, MAX_SERPER_QUERIES)) {
    const timeoutMs = Math.min(SERPER_TIMEOUT_MS, remainingBudgetMs(deadlineMs));
    if (timeoutMs <= 0) {
      notes.push('Research time budget exhausted before Serper search.');
      break;
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
        notes.push(`Serper failed for "${query}": ${upstreamError}`);
        continue;
      }

      allCandidates.push(...normalizeSerperResults(payload, query));
    } catch (error) {
      const message = error?.name === 'AbortError'
        ? `Serper request timed out for "${query}".`
        : `Serper request failed for "${query}".`;
      console.error('[ai/chat] Serper request error:', error?.message || error);
      notes.push(message);
    }
  }

  const results = chooseSerperResults(allCandidates, promptContext);
  if (results.length === 0 && notes.length === 0) {
    notes.push('Serper returned no results.');
  }

  return { results, notes };
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

function buildResearchContext({ queries, serperResults, pageExtracts, notes }) {
  const sourceByUrl = new Map(
    serperResults.map((item) => [item.link, item])
  );

  const lines = [
    'REFERENCE MATERIAL (DO NOT MENTION):',
    `Research Queries: ${(Array.isArray(queries) && queries.length > 0) ? queries.join(' | ') : '(none)'}`,
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
      if (result.query) {
        lines.push(`Matched Query: ${result.query}`);
      }
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
  const company = extractCompanyFromMessage(latestUserMessage);
  const location = extractLocationFromMessage(latestUserMessage);
  const constraints = [];

  if (company && location) {
    constraints.push(
      `The user already provided company and location: Company="${company}", Location="${location}".`,
      'Do not ask for company or location.',
      `You must explicitly reference ${company} and ${location} in the response.`
    );
  }

  if (!requestedBodies) {
    return constraints.join(' ');
  }

  return [
    ...constraints,
    `This request requires exactly ${requestedBodies} email bodies.`,
    'Output only the email body text, with no subject lines.',
    'Return plain text only.',
    'Do not include labels, numbering, bullets, markdown, or separators like ***.',
    'Each body must be one concise paragraph.',
    'Keep each body laser sharp: 2-5 sentences and roughly 70-110 words.',
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
    'Each body must be one concise paragraph with 2-5 sentences (about 70-110 words).',
    `Separate each body with exactly one blank line. Return exactly ${requestedBodyCount} bodies.`
  ].join(' ');
}

function buildTailoringRegenerationInstruction(promptContext) {
  return [
    'You failed to tailor to the provided company/location. Regenerate from scratch.',
    'You MUST (a) reference company and location, (b) use at least two factual signals from reference material, (c) avoid generic brokerage claims, (d) obey format rules.',
    'If you cannot find facts, ask only one minimal clarification question and stop.',
    `Company: ${promptContext.companyName || '(not provided)'}`,
    `Location: ${promptContext.locationText || '(not provided)'}`,
    'No subject lines unless requested. No markdown. No scheduling lines unless requested. Use clean, concise paragraph formatting with 2-5 sentences per body.'
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
  let tailoringGatePass = true;
  let tailoringGateReasons = [];
  let regenerationAttempted = false;
  let regenerationFinishReason = '';
  let matchedSourceSignalCount = 0;
  let hasOperationalPainSignal = false;
  let query = '';
  let serperQueries = [];
  let serperResultsCount = 0;
  let jinaExtractsCount = 0;
  let requestedBodyCount = null;
  let finalBodyCount = 0;
  let hasCompany = false;
  let hasLocation = false;
  let researchUsedChars = 0;

  try {
    const normalizedMessages = normalizeIncomingMessages(req.body);
    if (!ensureLastMessageIsUser(normalizedMessages)) {
      return res.status(400).json({ error: 'messages must end with a non-empty user message.' });
    }

    const latestUserMessage = normalizedMessages[normalizedMessages.length - 1]?.content || '';
    const promptContext = extractPromptContext(normalizedMessages);
    hasCompany = promptContext.hasCompany;
    hasLocation = promptContext.hasLocation;

    const researchDeadline = Date.now() + RESEARCH_BUDGET_MS;

    serperQueries = buildSerperQueries(normalizedMessages, promptContext);
    query = serperQueries.join(' | ');
    const { results: serperResults, notes: serperNotes } = await fetchSerperResults(
      serperQueries,
      process.env.SERPER_API_KEY,
      researchDeadline,
      promptContext
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
      queries: serperQueries,
      serperResults,
      pageExtracts,
      notes: [...serperNotes, ...jinaNotes]
    });
    researchUsedChars = researchContext.length;

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

    let tailoringResult = evaluateTailoringGate({
      latestUserMessage,
      assistantMessage,
      promptContext,
      serperResults,
      pageExtracts,
      requestedBodyCount
    });

    tailoringGatePass = tailoringResult.pass;
    tailoringGateReasons = tailoringResult.reasons;
    matchedSourceSignalCount = tailoringResult.matchedSourceSignalCount;
    hasOperationalPainSignal = tailoringResult.hasOperationalPainSignal;

    if (!tailoringResult.pass && tailoringResult.requiresTailoring) {
      for (let attempt = 0; attempt < MAX_TAILORING_REGENERATIONS; attempt += 1) {
        regenerationAttempted = true;
        const regenerationInstruction = buildTailoringRegenerationInstruction(promptContext);

        const regenerationResult = await generateWithGeminiModel({
          apiKey: geminiApiKey,
          model: selectedModel,
          contents,
          researchContext,
          latestUserMessage,
          extraSystemInstruction: regenerationInstruction
        });

        if (!regenerationResult.ok) {
          break;
        }

        regenerationFinishReason = extractFinishReason(regenerationResult.payload);
        finishReason = regenerationFinishReason || finishReason;
        usageSummary = mergeUsage(usageSummary, extractUsage(regenerationResult.payload));

        const regeneratedMessage = parseAssistantText(regenerationResult.payload);
        if (!regeneratedMessage) {
          break;
        }

        assistantMessage = regeneratedMessage;

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
              latestUserMessage: continuationPrompt,
              extraSystemInstruction: regenerationInstruction
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

            for (let repairAttempt = 0; repairAttempt < MAX_FORMAT_REPAIRS; repairAttempt += 1) {
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
                extraSystemInstruction: `${regenerationInstruction} ${formatRepairInstruction}`
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

        tailoringResult = evaluateTailoringGate({
          latestUserMessage,
          assistantMessage,
          promptContext,
          serperResults,
          pageExtracts,
          requestedBodyCount
        });

        tailoringGatePass = tailoringResult.pass;
        tailoringGateReasons = tailoringResult.reasons;
        matchedSourceSignalCount = tailoringResult.matchedSourceSignalCount;
        hasOperationalPainSignal = tailoringResult.hasOperationalPainSignal;

        if (tailoringResult.pass) {
          break;
        }
      }

      if (!tailoringGatePass) {
        const tailoringError = new Error(
          `AI response failed tailoring gate: ${tailoringGateReasons.join(', ') || 'unspecified_failure'}`
        );
        tailoringError.status = 502;
        throw tailoringError;
      }
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
      tailoringGatePass,
      tailoringGateReasons,
      regenerationAttempted,
      regenerationFinishReason: regenerationFinishReason || null,
      hasCompany,
      hasLocation,
      researchUsedChars,
      matchedSourceSignalCount,
      hasOperationalPainSignal,
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
      tailoringGatePass,
      tailoringGateReasons,
      regenerationAttempted,
      regenerationFinishReason: regenerationFinishReason || null,
      hasCompany,
      hasLocation,
      researchUsedChars,
      matchedSourceSignalCount,
      hasOperationalPainSignal,
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
