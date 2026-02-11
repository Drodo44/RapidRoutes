const GEMINI_ENDPOINT_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';
const DEFAULT_MODEL = 'gemini-1.5-flash';

function normalizeMessages(rawMessages) {
  if (!Array.isArray(rawMessages)) return [];

  return rawMessages
    .filter((msg) => msg && typeof msg === 'object')
    .map((msg) => ({
      role: msg.role === 'assistant' ? 'assistant' : 'user',
      content: typeof msg.content === 'string' ? msg.content.trim() : ''
    }))
    .filter((msg) => msg.content.length > 0);
}

function buildGeminiContents(messages) {
  return messages.slice(-12).map((msg) => ({
    role: msg.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: msg.content }]
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

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const messages = normalizeMessages(req.body?.messages);
    if (messages.length === 0) {
      return res.status(400).json({ error: 'messages must be a non-empty array.' });
    }

    const latestUserMessage = [...messages].reverse().find((msg) => msg.role === 'user');
    if (!latestUserMessage) {
      return res.status(400).json({ error: 'At least one user message is required.' });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'AI chat is not configured.' });
    }

    const model = process.env.GEMINI_MODEL || DEFAULT_MODEL;
    const url = `${GEMINI_ENDPOINT_BASE}/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: buildGeminiContents(messages),
        systemInstruction: {
          role: 'system',
          parts: [{
            text: 'You are the RapidRoutes Sales Copilot. Respond with concise, practical freight brokerage sales guidance.'
          }]
        },
        generationConfig: {
          temperature: 0.4,
          maxOutputTokens: 600
        }
      })
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      console.error('Gemini chat upstream error:', response.status, payload?.error?.message || 'Unknown upstream error');
      return res.status(502).json({ error: 'AI service is temporarily unavailable.' });
    }

    const assistantMessage = parseAssistantText(payload);
    if (!assistantMessage) {
      return res.status(502).json({ error: 'AI response was empty. Please try again.' });
    }

    return res.status(200).json({ message: assistantMessage });
  } catch (error) {
    console.error('AI chat proxy error:', error?.message || error);
    return res.status(500).json({ error: 'Failed to process AI chat request.' });
  }
}
