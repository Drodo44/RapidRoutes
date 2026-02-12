const GEMINI_ENDPOINT_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';
const DEFAULT_MODEL = 'gemini-3-pro-preview';
const SERPER_ENDPOINT = 'https://google.serper.dev/search';
const JINA_READER_BASE = 'https://r.jina.ai';
const SERPER_TIMEOUT_MS = 10000;
const JINA_TIMEOUT_MS = 9000;
const GEMINI_TIMEOUT_MS = 30000;
const MAX_SERPER_RESULTS = 5;
const MAX_JINA_LINKS = 3;
const MAX_JINA_CHARS = 10000;

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

function extractLikelyCompanyName(prompt) {
  if (typeof prompt !== 'string' || !prompt) {
    return '';
  }

  const patterns = [
    /\babout\s+["“]?([^"\n.,;:!?]+)["”]?/i,
    /\bresearch\s+["“]?([^"\n.,;:!?]+)["”]?/i,
    /\bcompany\s+["“]?([^"\n.,;:!?]+)["”]?/i
  ];

  for (const pattern of patterns) {
    const match = pattern.exec(prompt);
    if (!match?.[1]) continue;
    const candidate = String(match[1]).replace(/^[\s"'“”]+|[\s"'“”]+$/g, '').trim();
    if (candidate) return candidate;
  }

  return '';
}

function buildSerperQuery(prompt) {
  const companyName = extractLikelyCompanyName(prompt);
  const baseQuery = companyName || prompt;
  return `${baseQuery} company overview recent news customers competitors`;
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

async function fetchSerperResults(query, serperApiKey) {
  if (!serperApiKey) {
    return {
      results: [],
      notes: ['Search disabled (SERPER_API_KEY missing).']
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
      notes: ['Jina Reader disabled (JINA_API_KEY missing).']
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
  const lines = ['RESEARCH_CONTEXT (use as factual reference; do not invent):', `SEARCH_QUERY: ${query}`];

  if (notes.length > 0) {
    lines.push('NOTES:');
    notes.forEach((note) => lines.push(`- ${note}`));
  }

  lines.push('SERPER_RESULTS:');
  if (serperResults.length === 0) {
    lines.push('- (none)');
  } else {
    serperResults.forEach((result, index) => {
      lines.push(`- [${index + 1}] Title: ${result.title || '(no title)'}`);
      lines.push(`  Link: ${result.link || '(no link)'}`);
      lines.push(`  Snippet: ${result.snippet || '(no snippet)'}`);
    });
  }

  lines.push('PAGE_EXTRACTS:');
  if (pageExtracts.length === 0) {
    lines.push('- (none)');
  } else {
    pageExtracts.forEach((extract, index) => {
      lines.push(`- [${index + 1}] Source: ${extract.link}`);
      lines.push(`  Extract: ${extract.extract}`);
    });
  }

  return lines.join('\n');
}

function buildGeminiUserInput(researchContext, userPrompt) {
  return `${researchContext}\n\nUSER_PROMPT:\n${userPrompt}`;
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

    const model = process.env.GEMINI_MODEL || DEFAULT_MODEL;
    const url = `${GEMINI_ENDPOINT_BASE}/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(geminiApiKey)}`;

    const response = await fetchWithTimeout(
      url,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          contents: [{
            role: 'user',
            parts: [{ text: buildGeminiUserInput(researchContext, userPrompt) }]
          }],
          systemInstruction: {
            role: 'system',
            parts: [{
              text: 'Use RESEARCH_CONTEXT for factual claims; if missing, say so. Do not invent facts.'
            }]
          },
          generationConfig: {
            temperature: 0.4,
            maxOutputTokens: 900
          }
        })
      },
      GEMINI_TIMEOUT_MS
    );

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      const upstreamError =
        typeof payload?.error?.message === 'string' && payload.error.message.trim()
          ? payload.error.message.trim()
          : 'AI service is temporarily unavailable.';
      console.error('[ai/chat] Gemini upstream error:', response.status, upstreamError);
      return res.status(502).json({ error: upstreamError });
    }

    const assistantMessage = parseAssistantText(payload);
    if (!assistantMessage) {
      return res.status(502).json({ error: 'AI response was empty. Please try again.' });
    }

    return res.status(200).json({ reply: assistantMessage });
  } catch (error) {
    console.error('[ai/chat] Proxy error:', error?.message || error);
    return res.status(500).json({ error: 'Failed to process AI chat request.' });
  }
}
