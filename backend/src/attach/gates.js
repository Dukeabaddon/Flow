// File gates for attach mode
// ponytail: size + duration only

export const MAX_FILE_BYTES = 20 * 1024 * 1024; // 20 MB
export const MAX_DURATION_SEC = 5 * 60; // 5 minutes
export const MAX_ATTACH_SEC = 60;
export const MAX_CODE_LINES = 30;

const AUDIO_EXT = /\.(mp3|wav|ogg|m4a|aac|flac|webm)$/i;
const MIDI_EXT = /\.(mid|midi)$/i;

/**
 * Crop window for attach excerpt (MIDI loop / audio analysis).
 * @param {number} durationSec
 * @returns {number}
 */
export function attachExcerptSec(durationSec) {
  return Math.min(MAX_ATTACH_SEC, durationSec);
}

/**
 * Largest whole 4/4 bar duration ≤ windowSec (at least one bar).
 * @param {number} windowSec
 * @param {number} [bpm=120]
 * @returns {number}
 */
export function barAlignWindowSec(windowSec, bpm = 120) {
  const barSec = (4 * 60) / bpm;
  if (!Number.isFinite(windowSec) || windowSec <= 0) return barSec;
  if (windowSec < barSec) return windowSec;
  const bars = Math.floor(windowSec / barSec);
  return bars * barSec;
}

/**
 * `.slow(N)` factor when `setcpm(bpm/4)` so one cycle equals the window.
 * @param {number} bpm
 * @param {number} windowSec
 * @returns {number}
 */
export function attachSlowFactor(bpm, windowSec) {
  const windowBeats = (windowSec * bpm) / 60;
  return windowBeats / 4;
}

/**
 * @param {File} file
 * @returns {'midi' | 'audio'}
 */
export function detectAttachKind(file) {
  const name = file?.name || '';
  const type = (file?.type || '').toLowerCase();
  if (MIDI_EXT.test(name) || type.includes('midi') || type === 'audio/mid') {
    return 'midi';
  }
  if (AUDIO_EXT.test(name) || type.startsWith('audio/')) {
    return 'audio';
  }
  // Unknown extension — try as audio if browser can decode later
  if (type.startsWith('audio/') || !type) return 'audio';
  throw new Error('Unsupported file. Use mp3, wav, ogg, m4a, mid, or midi.');
}

/**
 * @param {File} file
 */
export function assertFileSize(file) {
  if (!file) throw new Error('No file selected');
  if (file.size > MAX_FILE_BYTES) {
    throw new Error('File too large (max 20 MB). Pick a smaller file.');
  }
}

/**
 * @param {number} durationSec
 */
export function assertDuration(durationSec) {
  if (!Number.isFinite(durationSec) || durationSec <= 0) {
    throw new Error('Could not read audio duration.');
  }
  if (durationSec > MAX_DURATION_SEC) {
    throw new Error('Track too long (max 5 minutes). Pick a shorter file.');
  }
}

/**
 * @param {string} code
 * @returns {number}
 */
export function countCodeLines(code) {
  return String(code || '')
    .split('\n')
    .filter((l) => l.trim().length > 0)
    .length;
}
