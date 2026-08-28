// API Key Rotator — 3 keys, round-robin
// ponytail: Cerebras free tier is 1B requests/day, no real limit needed

const keys = [
  ...new Set(
    [
      import.meta.env.VITE_CEREBRAS_KEY_A,
      import.meta.env.VITE_CEREBRAS_KEY_B,
      import.meta.env.VITE_CEREBRAS_KEY_C,
    ].filter(Boolean),
  ),
];

let currentIndex = 0;

/**
 * Get next key (round-robin rotation).
 */
export function getNextKey() {
  if (keys.length === 0) throw new Error('No API keys configured');
  const key = keys[currentIndex];
  currentIndex = (currentIndex + 1) % keys.length;
  return key;
}

/**
 * Always allowed — Cerebras has no meaningful rate limit on free tier.
 */
export function canMakeCall() {
  return true;
}

export function getKeyCount() {
  return keys.length;
}

export function getWaitTime() {
  return 0;
}

export function recordCall() {}
