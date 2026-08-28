// Jest-style API via Vitest
import { describe, it, expect } from 'vitest';
import {
  validateStrudelCode,
  MAX_CODE_LINES,
} from '../../backend/src/validation/validator.js';

describe('validateStrudelCode', () => {
  it('accepts note("c3").sound("sine")', () => {
    const code = 'note("c3").sound("sine")';
    expect(validateStrudelCode(code)).toBe(code);
  });

  it('accepts s("bd*4").bank("RolandTR909")', () => {
    const code = 's("bd*4").bank("RolandTR909")';
    expect(validateStrudelCode(code)).toBe(code);
  });

  it('rejects Tone.js fake API play().synth().out()', () => {
    expect(() => validateStrudelCode('play().synth().out()')).toThrow(
      /Not Strudel/,
    );
  });

  it('rejects eval', () => {
    expect(() => validateStrudelCode("eval('x')")).toThrow(/Blocked/);
  });

  it('strips markdown fences', () => {
    const raw = '```javascript\nnote("c3").sound("sine")\n```';
    expect(validateStrudelCode(raw)).toBe('note("c3").sound("sine")');
  });

  it('throws TOO_LONG when code exceeds MAX_CODE_LINES', () => {
    const lines = Array.from(
      { length: MAX_CODE_LINES + 1 },
      (_, i) => `note("c${i % 5}").sound("sine")`,
    );
    const code = lines.join('\n');
    try {
      validateStrudelCode(code);
      expect.fail('expected TOO_LONG error');
    } catch (err) {
      expect(err.code).toBe('TOO_LONG');
    }
  });
});
