import palettes from '../../../frontend/src/features/visualizer/shaders/configs.json';

/** 0 contour 1 chladni 2 warp 3 scan 4 kaleido */
export const MODE = {
  contour: 0,
  chladni: 1,
  warp: 2,
  scan: 3,
  kaleido: 4,
};

/** 0 dither 1 grain 2 scan 3 clean */
export const TEXTURE = {
  dither: 0,
  grain: 1,
  scan: 2,
  clean: 3,
};

/** Idle / first paint — original cymatic kaleido, blue + white. */
export const DEFAULT_SPEC = {
  mode: MODE.kaleido,
  texture: TEXTURE.clean,
  dirX: 0,
  dirY: 1,
  rotate: 0,
  scale: 1,
  warp: 0.12,
  color1: [0.12, 0.42, 1.0],
  color2: [0.95, 0.98, 1.0],
  complexity: 4.2,
  speed: 1,
};

function fnv1a(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i += 1) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function unit(seed, salt) {
  return fnv1a(`${seed}:${salt}`) / 4294967296;
}

function pickPalette(seed) {
  const i = fnv1a(`pal:${seed}`) % palettes.length;
  const p = palettes[i];
  return {
    color1: [...p.color1],
    color2: [...p.color2],
    complexity: p.complexity,
    speed: p.speed,
  };
}

function has(hay, ...needles) {
  return needles.some((n) => hay.includes(n));
}

/**
 * Deterministic visual field from a prompt. Keywords bias; hash fills the rest.
 * Same prompt → same spec.
 * @param {string} prompt
 */
export function visualSpecFromPrompt(prompt) {
  const raw = String(prompt || '').trim();
  const text = raw.toLowerCase();
  if (!text || text === 'flow idle') {
    return { ...DEFAULT_SPEC, color1: [...DEFAULT_SPEC.color1], color2: [...DEFAULT_SPEC.color2] };
  }
  const seed = fnv1a(text);

  const pal = pickPalette(seed);
  let mode = Math.floor(unit(seed, 'mode') * 5);
  let texture = Math.floor(unit(seed, 'tex') * 4);
  let dirX = unit(seed, 'dx') * 2 - 1;
  let dirY = unit(seed, 'dy') * 2 - 1;
  let rotate = unit(seed, 'rot') * 6.283;
  let scale = 0.7 + unit(seed, 'sc') * 1.4;
  let warp = unit(seed, 'wp') * 1.1;
  let { color1, color2, complexity, speed } = pal;

  if (has(text, 'ambient', 'calm', 'drone', 'rain', 'zen', 'soft', 'chill', 'lofi')) {
    mode = MODE.contour;
    speed = Math.min(speed, 0.7);
    texture = TEXTURE.grain;
    warp *= 0.4;
  }
  if (has(text, 'metal', 'death', 'industrial', 'glitch', 'noise', 'harsh')) {
    mode = MODE.chladni;
    texture = TEXTURE.grain;
    warp = Math.max(warp, 0.85);
    speed = Math.max(speed, 1.4);
    complexity = Math.max(complexity, 4.5);
  }
  if (has(text, 'cyberpunk', 'neon', 'synthwave', 'matrix')) {
    mode = MODE.scan;
    texture = TEXTURE.scan;
    color1 = [0, 1, 0.8];
    color2 = [1, 0, 0.5];
    speed = Math.max(speed, 1.6);
  }
  if (has(text, 'cowboy', 'country', 'western', 'desert', 'highway')) {
    mode = MODE.contour;
    color1 = [0.7, 0.5, 0.2];
    color2 = [0.4, 0.2, 0.05];
    dirX = 0.85;
    dirY = 0.05;
    speed = 0.45;
  }
  if (has(text, 'techno', 'rave', 'edm', 'dnb', 'drill', 'house')) {
    mode = MODE.kaleido;
    texture = TEXTURE.dither;
    speed = Math.max(speed, 1.7);
    rotate += 1.2;
  }
  if (has(text, 'wave', 'ocean', 'water', 'tide')) {
    mode = MODE.contour;
    dirX = 0.2;
    dirY = 0.9;
    texture = TEXTURE.dither;
  }
  if (has(text, 'swirl', 'spin', 'rotate', 'vortex')) {
    rotate += 2.4;
    mode = MODE.warp;
  }
  if (has(text, 'reverse', 'backward', 'down')) {
    dirX *= -1;
    dirY = -Math.abs(dirY) - 0.3;
  }
  if (has(text, 'dark', 'horror', 'void', 'shadow')) {
    color1 = [0.05, 0, 0.1];
    color2 = [0.2, 0, 0.3];
    texture = TEXTURE.grain;
  }
  if (has(text, 'lupang', 'hinirang', 'anthem', 'filipino', 'opm')) {
    mode = MODE.contour;
    color1 = [0.9, 0.7, 0.3];
    color2 = [0.0, 0.35, 0.15];
    speed = 0.55;
    texture = TEXTURE.clean;
  }
  if (has(text, 'jazz', 'bossa', 'smooth')) {
    mode = MODE.warp;
    speed = 0.55;
    texture = TEXTURE.clean;
  }

  const len = Math.hypot(dirX, dirY) || 1;
  dirX /= len;
  dirY /= len;

  return {
    mode,
    texture,
    dirX,
    dirY,
    rotate,
    scale,
    warp,
    color1,
    color2,
    complexity,
    speed,
  };
}
