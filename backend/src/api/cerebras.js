// Cerebras API client — uses key rotation
// Docs: https://inference-docs.cerebras.ai/api-reference/chat-completions
// gpt-oss-120b: reasoning tokens count toward max_completion_tokens
import { getNextKey, getKeyCount } from './rotator.js';
import { flowTrace } from '../debug/flowTrace.js';

const CEREBRAS_URL = 'https://api.cerebras.ai/v1/chat/completions';
const TIMEOUT_MS = 20000;
const RETRYABLE = new Set([401, 402, 429]);

/**
 * Call Cerebras chat completions API with rotating keys.
 */
export async function callCerebras(systemPrompt, userMessage, signal) {
  const attempts = Math.max(1, getKeyCount());
  let lastError = new Error('No API keys configured');

  for (let i = 0; i < attempts; i++) {
    try {
      return await requestOnce(getNextKey(), systemPrompt, userMessage, signal);
    } catch (err) {
      lastError = err;
      if (signal?.aborted) throw err;
      if (!RETRYABLE.has(err.status)) throw err;
    }
  }

  throw lastError;
}

async function requestOnce(apiKey, systemPrompt, userMessage, signal) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

  if (signal) signal.addEventListener('abort', () => controller.abort());

  try {
    const response = await fetch(CEREBRAS_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-oss-120b',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage },
        ],
        temperature: 0.6,
        // Includes reasoning tokens (docs). Cap 300 ate all reasoning, content=null.
        max_completion_tokens: 2048,
        reasoning_effort: 'low',
        reasoning_format: 'hidden',
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => '');
      flowTrace({
        src: 'cerebras',
        ok: false,
        status: response.status,
        error: String(errText).slice(0, 160),
      });
      const err = new Error(`Cerebras ${response.status}: ${errText}`);
      err.status = response.status;
      throw err;
    }

    const data = await response.json();
    const message = data?.choices?.[0]?.message;
    const content = message?.content?.trim?.() ? message.content.trim() : '';
    if (!content) {
      flowTrace({
        src: 'cerebras',
        ok: false,
        status: response.status,
        error: 'empty content',
      });
      throw new Error('Empty response');
    }

    flowTrace({
      src: 'cerebras',
      ok: true,
      status: response.status,
      chars: content.length,
      preview: content.replace(/\s+/g, ' ').slice(0, 80),
    });
    return content;
  } finally {
    clearTimeout(timeoutId);
  }
}
