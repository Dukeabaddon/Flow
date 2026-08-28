// Jest-style API via Vitest
import { describe, it, expect } from 'vitest';
import { findTemplate } from '../../backend/src/fallback/matcher.js';

describe('findTemplate', () => {
  it('returns ambient-drone for empty or null prompt', () => {
    expect(findTemplate('').id).toBe('ambient-drone');
    expect(findTemplate(null).id).toBe('ambient-drone');
  });

  it('matches lupang hinirang', () => {
    expect(findTemplate('lupang hinirang').id).toBe('lupang-hinirang');
  });

  it('matches cyberpunk', () => {
    expect(findTemplate('cyberpunk').id).toBe('cyberpunk-dark');
  });

  it('matches philippines national anthem', () => {
    expect(findTemplate('philippines national anthem').id).toBe('lupang-hinirang');
  });
});
