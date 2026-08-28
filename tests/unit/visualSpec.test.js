// Jest-style API via Vitest
import { describe, it, expect } from 'vitest';
import {
  visualSpecFromPrompt,
  MODE,
  TEXTURE,
} from '../../backend/src/visual/fromPrompt.js';

describe('visualSpecFromPrompt', () => {
  it('is deterministic for the same prompt', () => {
    const a = visualSpecFromPrompt('cyberpunk lofi');
    const b = visualSpecFromPrompt('cyberpunk lofi');
    expect(a).toEqual(b);
  });

  it('changes field when the prompt changes', () => {
    const a = visualSpecFromPrompt('cyberpunk lofi');
    const b = visualSpecFromPrompt('cowboy desert');
    expect(a.color1).not.toEqual(b.color1);
    expect(a.dirX !== b.dirX || a.mode !== b.mode).toBe(true);
  });

  it('biases cyberpunk toward scan + neon', () => {
    const spec = visualSpecFromPrompt('neon cyberpunk city');
    expect(spec.mode).toBe(MODE.scan);
    expect(spec.texture).toBe(TEXTURE.scan);
    expect(spec.color1[1]).toBeGreaterThan(0.8);
  });

  it('biases metal toward chladni + grain', () => {
    const spec = visualSpecFromPrompt('death metal');
    expect(spec.mode).toBe(MODE.chladni);
    expect(spec.texture).toBe(TEXTURE.grain);
  });

  it('normalizes direction to unit length', () => {
    const spec = visualSpecFromPrompt('wave ocean');
    const len = Math.hypot(spec.dirX, spec.dirY);
    expect(len).toBeCloseTo(1, 5);
  });

  it('empty / idle uses cymatic blue-white kaleido', () => {
    const spec = visualSpecFromPrompt('');
    const idle = visualSpecFromPrompt('flow idle');
    expect(spec).toEqual(idle);
    expect(spec.mode).toBe(MODE.kaleido);
    expect(spec.texture).toBe(TEXTURE.clean);
    expect(spec.color1[2]).toBeGreaterThan(0.8);
    expect(spec.color2[0]).toBeGreaterThan(0.9);
  });
});
