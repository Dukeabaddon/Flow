// Jest-style API via Vitest
import { describe, it, expect } from 'vitest';
import {
  detectAttachKind,
  assertFileSize,
  assertDuration,
  countCodeLines,
  attachExcerptSec,
  barAlignWindowSec,
  attachSlowFactor,
  MAX_FILE_BYTES,
  MAX_DURATION_SEC,
} from '../../backend/src/attach/gates.js';

describe('gates', () => {
  it('detectAttachKind distinguishes midi from mp3', () => {
    const midi = { name: 'track.mid', type: 'audio/midi', size: 100 };
    const mp3 = { name: 'track.mp3', type: 'audio/mpeg', size: 100 };
    expect(detectAttachKind(midi)).toBe('midi');
    expect(detectAttachKind(mp3)).toBe('audio');
  });

  it('assertFileSize throws over 20MB', () => {
    const big = { name: 'big.mp3', type: 'audio/mpeg', size: MAX_FILE_BYTES + 1 };
    expect(() => assertFileSize(big)).toThrow(/too large/i);
  });

  it('countCodeLines ignores blank lines', () => {
    const code = 'note("c3").sound("sine")\n\n\nnote("d3").sound("sine")';
    expect(countCodeLines(code)).toBe(2);
  });

  it('attachExcerptSec caps at 60 seconds', () => {
    expect(attachExcerptSec(180)).toBe(60);
    expect(attachExcerptSec(20)).toBe(20);
  });

  it('barAlignWindowSec aligns to whole 4/4 bars', () => {
    expect(barAlignWindowSec(60, 120)).toBe(60);
  });

  it('attachSlowFactor matches window cycle', () => {
    expect(attachSlowFactor(120, 60)).toBe(30);
  });

  it('allows 3 minute file duration under max gate', () => {
    expect(() => assertDuration(180)).not.toThrow();
    expect(180).toBeLessThan(MAX_DURATION_SEC);
  });
});
