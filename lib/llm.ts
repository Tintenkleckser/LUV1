/**
 * Provider-agnostic LLM API helper.
 * Supports Abacus.AI (default on Abacus hosting) and any OpenAI-compatible API
 * like Mistral, OpenAI, etc. (for Vercel or self-hosting).
 *
 * Environment variables:
 *   LLM_API_URL   – Full endpoint URL (default: Abacus.AI)
 *   LLM_API_KEY   – API key (falls back to ABACUSAI_API_KEY)
 *   LLM_MODEL     – Model name (default: gpt-4.1-mini for Abacus, mistral-large-latest for Mistral)
 */

const DEFAULT_ABACUS_URL = 'https://apps.abacus.ai/v1/chat/completions';
const DEFAULT_MISTRAL_URL = 'https://api.mistral.ai/v1/chat/completions';

export function getLlmConfig() {
  const apiUrl = process.env.LLM_API_URL || DEFAULT_ABACUS_URL;
  const apiKey = process.env.LLM_API_KEY || process.env.ABACUSAI_API_KEY || '';

  // Auto-detect default model based on URL
  let defaultModel = 'gpt-4.1-mini';
  if (apiUrl.includes('mistral.ai')) {
    defaultModel = 'mistral-large-latest';
  } else if (apiUrl.includes('openai.com')) {
    defaultModel = 'gpt-4o-mini';
  }

  const model = process.env.LLM_MODEL || defaultModel;

  return { apiUrl, apiKey, model };
}

export async function callLlm(options: {
  messages: { role: string; content: string }[];
  stream?: boolean;
  max_tokens?: number;
}) {
  const { apiUrl, apiKey, model } = getLlmConfig();

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: options.messages,
      stream: options.stream ?? true,
      max_tokens: options.max_tokens ?? 4000,
    }),
  });

  return response;
}
