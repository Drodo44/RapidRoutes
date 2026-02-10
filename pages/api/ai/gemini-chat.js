// pages/api/ai/gemini-chat.js
import { GoogleGenerativeAI } from "@google/generative-ai";

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { message, history } = req.body;

  if (!message) {
    return res.status(400).json({ error: 'Message is required' });
  }

  const API_KEY = process.env.GEMINI_API_KEY;
  if (!API_KEY) {
    return res.status(500).json({ error: 'Gemini API key not configured' });
  }

  const genAI = new GoogleGenerativeAI(API_KEY);

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const chat = model.startChat({
      history: history?.map(m => ({
        role: m.role === 'user' ? 'user' : 'model',
        parts: [{ text: m.content }],
      })) || [],
      generationConfig: {
        maxOutputTokens: 1000,
      },
    });

    const prompt = `
      You are a senior logistics and freight brokerage assistant.
      Your goals are:
      1. Research companies mentioned to provide logistics insights for prospecting.
      2. Generate professional, persuasive emails for carriers or customers based on provided prompts.
      3. Be concise and enterprise-focused.

      User message: ${message}
    `;

    const result = await chat.sendMessage(prompt);
    const response = await result.response;
    const text = response.text();

    return res.status(200).json({ reply: text });
  } catch (error) {
    console.error('Gemini API Error:', error);
    return res.status(500).json({ error: 'Failed to communicate with Gemini AI', details: error.message });
  }
}
