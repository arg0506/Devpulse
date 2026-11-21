import { GoogleGenAI } from '@google/genai';

export const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-3.5-flash';

const apiKey = process.env.GEMINI_API_KEY;
let client: GoogleGenAI | null = null;

if (apiKey && apiKey !== 'MY_GEMINI_API_KEY') {
  try {
    client = new GoogleGenAI({ apiKey });
    console.log(`[gemini] Ready (${GEMINI_MODEL}).`);
  } catch (err) {
    console.error('[gemini] Failed to initialise the SDK:', err);
  }
} else {
  console.log('[gemini] GEMINI_API_KEY not set. AI features answer with an offline notice.');
}

export function isGeminiReady(): boolean {
  return client !== null;
}

export const OFFLINE_NOTICE =
  'Gemini is not connected. Add `GEMINI_API_KEY` to your `.env` file and restart the server to get live answers.';

export async function generateText(prompt: string, opts: { systemInstruction?: string; temperature?: number } = {}): Promise<string> {
  if (!client) return OFFLINE_NOTICE;
  const result = await client.models.generateContent({
    model: GEMINI_MODEL,
    contents: prompt,
    config: {
      ...(opts.systemInstruction ? { systemInstruction: opts.systemInstruction } : {}),
      ...(typeof opts.temperature === 'number' ? { temperature: opts.temperature } : {}),
    },
  });
  return result.text || '';
}

export interface SearchSource {
  title: string;
  url: string;
}

/** Answers a query using Gemini grounded on Google Search, returning the cited pages. */
export async function groundedSearch(query: string): Promise<{ text: string; sources: SearchSource[] }> {
  if (!client) return { text: OFFLINE_NOTICE, sources: [] };
  const result = await client.models.generateContent({
    model: GEMINI_MODEL,
    contents: `Search the web and give a concise, factual summary for: ${query}`,
    config: { tools: [{ googleSearch: {} }] },
  });
  const chunks = result.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
  const sources: SearchSource[] = [];
  for (const chunk of chunks) {
    const web = (chunk as any).web;
    if (web?.uri && !sources.some((s) => s.url === web.uri)) {
      sources.push({ title: web.title || web.uri, url: web.uri });
    }
  }
  return { text: result.text || '', sources };
}
