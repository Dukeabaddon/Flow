// Jest-style API via Vitest
import { describe, it, expect } from 'vitest';
import { templates } from '../../backend/src/library/templates.js';

describe('templates', () => {
  it('has unique ids', () => {
    const ids = templates.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('includes lupang-hinirang with code', () => {
    const lupang = templates.find((t) => t.id === 'lupang-hinirang');
    expect(lupang).toBeDefined();
    expect(lupang.name).toBe('Lupang Hinirang');
    expect(lupang.tags).toContain('philippines');
    expect(lupang.code).toContain('gm_epiano1');
    expect(lupang.code).toContain('note(');
  });

  it('cyberpunk-dark code includes RolandTR909', () => {
    const cyberpunk = templates.find((t) => t.id === 'cyberpunk-dark');
    expect(cyberpunk).toBeDefined();
    expect(cyberpunk.code).toContain('RolandTR909');
  });
});
