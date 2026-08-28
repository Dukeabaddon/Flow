// Strudel code validator
// ponytail: security + short-loop line cap

import { MAX_CODE_LINES, countCodeLines } from '../attach/gates.js';

const DANGEROUS_PATTERNS = [
  /import\s/,
  /require\s*\(/,
  /eval\s*\(/,
  /Function\s*\(/,
  /document\./,
  /window\./,
  /fetch\s*\(/,
  /XMLHttpRequest/,
  /localStorage/,
  /sessionStorage/,
  /cookie/i,
  /<script/i,
  /process\./,
  /globalThis/,
  /__proto__/,
];

// Tone.js / WebAudio / fake APIs — not Strudel (strudel.cc)
const FAKE_STRUDEL_PATTERNS = [
  /\bplay\s*\(/,
  /\.synth\s*\(/,
  /\.out\s*\(\s*\)/,
  /\.toDestination\s*\(/,
  /\bTone\s*\./,
  /\bnew\s+AudioContext\b/,
  /\.triggerAttack/,
  /\.filter\s*\(\s*['"]lowpass['"]/,
];

const HAS_STRUDEL_PRIMITIVE =
  /\b(?:note|s|sound|stack|n|setcps|setcpm|cat|seq)\s*\(/;

/**
 * Validate and clean Strudel code from AI output.
 * @param {string} rawCode
 * @param {{ maxLines?: number, enforceLines?: boolean }} [opts]
 * @returns {string}
 */
export function validateStrudelCode(rawCode, opts = {}) {
  const maxLines = opts.maxLines ?? MAX_CODE_LINES;
  const enforceLines = opts.enforceLines !== false;

  if (!rawCode || typeof rawCode !== 'string') {
    throw new Error('Empty or invalid code response');
  }

  let code = rawCode.trim();
  code = code.replace(/^```(?:javascript|js|strudel)?\n?/i, '');
  code = code.replace(/\n?```$/i, '');
  code = code.trim();

  const lines = code.split('\n');
  const codeLines = lines.filter((line) => {
    const trimmed = line.trim();
    if (!trimmed) return true;
    if (trimmed.startsWith('//')) return false;
    if (/^[A-Z][a-z]{2,}.*[.:]$/.test(trimmed)) return false;
    return true;
  });
  code = codeLines.join('\n').trim();

  for (const pattern of DANGEROUS_PATTERNS) {
    if (pattern.test(code)) {
      throw new Error('Blocked: code contains disallowed pattern');
    }
  }

  for (const pattern of FAKE_STRUDEL_PATTERNS) {
    if (pattern.test(code)) {
      throw new Error('Not Strudel: use note()/s()/stack() from strudel.cc, not play()/synth()');
    }
  }

  if (!HAS_STRUDEL_PRIMITIVE.test(code)) {
    throw new Error('Not Strudel: missing note(), s(), sound(), or stack()');
  }

  if (code.length < 5) {
    throw new Error('Response too short to be valid Strudel code');
  }

  if (enforceLines && countCodeLines(code) > maxLines) {
    const err = new Error(`Code too long (max ${maxLines} lines)`);
    err.code = 'TOO_LONG';
    err.strudelCode = code;
    throw err;
  }

  return code;
}

/**
 * Soft-cap non-empty lines after a failed shorten retry.
 * @param {string} code
 * @param {number} [maxLines]
 */
export function softCapLines(code, maxLines = MAX_CODE_LINES) {
  const out = [];
  let kept = 0;
  for (const line of String(code).split('\n')) {
    if (line.trim()) {
      if (kept >= maxLines) break;
      kept += 1;
    }
    out.push(line);
  }
  return out.join('\n').trim();
}

export { countCodeLines, MAX_CODE_LINES };
