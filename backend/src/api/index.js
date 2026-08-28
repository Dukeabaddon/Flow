import { callCerebras } from './cerebras.js';
import { flowTrace } from '../debug/flowTrace.js';
import {
  getSystemPrompt,
  buildShortenPrompt,
} from '../prompts/system.js';
import {
  validateStrudelCode,
  softCapLines,
} from '../validation/validator.js';
import { MAX_CODE_LINES } from '../attach/gates.js';

/**
 * Generate a short Strudel experiment from a text prompt.
 */
export async function generatePattern(prompt, currentCode, signal) {
  const systemPrompt = getSystemPrompt();

  let userMessage = prompt;
  if (
    currentCode &&
    (prompt.toLowerCase().startsWith('add') ||
      prompt.toLowerCase().startsWith('more'))
  ) {
    userMessage = `Current:\n${currentCode}\n\nModify (keep under ${MAX_CODE_LINES} lines): ${prompt}`;
  }

  const rawCode = await callCerebras(systemPrompt, userMessage, signal);

  try {
    const code = validateStrudelCode(rawCode);
    flowTrace({ src: 'validate', ok: true, chars: code.length });
    return code;
  } catch (err) {
    flowTrace({
      src: 'validate',
      ok: false,
      error: String(err?.message || err).slice(0, 120),
    });
    if (err.code !== 'TOO_LONG' || !err.strudelCode) throw err;

    // One shorten retry
    const shortened = await callCerebras(
      systemPrompt,
      buildShortenPrompt(err.strudelCode),
      signal,
    );
    const cleaned = validateStrudelCode(shortened, { enforceLines: false });
    return softCapLines(cleaned, MAX_CODE_LINES);
  }
}
