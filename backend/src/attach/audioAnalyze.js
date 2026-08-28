// Audio file analyze → features for AI distill
// ponytail: OfflineAudioContext only — never touch live Strudel graph

import {
  assertDuration,
  attachExcerptSec,
  MAX_DURATION_SEC,
} from './gates.js';

/**
 * Decode file offline, gate duration, extract light features.
 * @param {File} file
 * @returns {Promise<{ duration: number, estimatedBpm: number, energy: number, filename: string, excerptSec: number }>}
 */
export async function analyzeAudioFile(file) {
  const arrayBuf = await file.arrayBuffer();

  // Decode with a throwaway context so we never touch the live engine graph
  const probeCtx = new (window.AudioContext || window.webkitAudioContext)();
  let audioBuffer;
  try {
    audioBuffer = await probeCtx.decodeAudioData(arrayBuf.slice(0));
  } finally {
    try {
      await probeCtx.close();
    } catch {
      /* ignore */
    }
  }

  assertDuration(audioBuffer.duration);

  const excerptSec = attachExcerptSec(audioBuffer.duration);
  const features = extractFeatures(audioBuffer, excerptSec);

  return {
    filename: file.name,
    duration: audioBuffer.duration,
    estimatedBpm: features.bpm,
    energy: features.energy,
    excerptSec,
  };
}

/**
 * Offline energy + crude BPM from onset peaks in excerpt.
 * @param {AudioBuffer} audioBuffer
 * @param {number} excerptSec
 */
function extractFeatures(audioBuffer, excerptSec) {
  const sr = audioBuffer.sampleRate;
  const end = Math.min(audioBuffer.length, Math.floor(excerptSec * sr));
  const channel = audioBuffer.getChannelData(0);

  const hop = 1024;
  const energies = [];
  for (let i = 0; i + hop < end; i += hop) {
    let sum = 0;
    for (let j = 0; j < hop; j++) {
      const s = channel[i + j];
      sum += s * s;
    }
    energies.push(Math.sqrt(sum / hop));
  }

  const energy =
    energies.reduce((a, b) => a + b, 0) / Math.max(1, energies.length);

  const onsets = [];
  for (let i = 1; i < energies.length; i++) {
    onsets.push(Math.max(0, energies[i] - energies[i - 1]));
  }

  const bpm = estimateBpmFromOnsets(onsets, sr, hop) || 110;

  return {
    bpm,
    energy: Math.round(energy * 1000) / 1000,
  };
}

function estimateBpmFromOnsets(onsets, sampleRate, hop) {
  if (onsets.length < 32) return null;

  const frameSec = hop / sampleRate;
  let bestLag = 0;
  let bestScore = 0;

  const minLag = Math.floor(60 / 160 / frameSec);
  const maxLag = Math.floor(60 / 70 / frameSec);

  for (let lag = minLag; lag <= maxLag; lag++) {
    let score = 0;
    for (let i = 0; i + lag < onsets.length; i++) {
      score += onsets[i] * onsets[i + lag];
    }
    if (score > bestScore) {
      bestScore = score;
      bestLag = lag;
    }
  }

  if (!bestLag) return null;
  const bpm = Math.round(60 / (bestLag * frameSec));
  return Math.min(160, Math.max(70, bpm));
}

/**
 * Build AI user message from audio features.
 * @param {object} analysis
 * @param {string} [hint]
 */
function formatMmSs(sec) {
  const s = Math.floor(sec);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

export function buildAudioExperimentPrompt(analysis, hint = '') {
  const totalMmSs = formatMmSs(analysis.duration);
  const excerptMmSs = formatMmSs(analysis.excerptSec);
  const vibe =
    analysis.energy > 0.08
      ? 'high energy / driving'
      : analysis.energy > 0.03
        ? 'medium energy'
        : 'soft / sparse';

  return [
    'Create a SHORT Strudel experiment loop inspired by an uploaded audio track.',
    'Do NOT recreate the full song. Loop the vibe of the first minute only — distill groove and texture into a compact loop.',
    'Use waveforms (sine/sawtooth/square/triangle), Dirt drums (bd/hh/cp), and GM fonts (gm_epiano1, gm_piano) like strudel.cc.',
    'Prefer gm_epiano1 or sine for melodic piano-like parts.',
    `File: ${analysis.filename}`,
    analysis.duration > 60
      ? `Duration: ${totalMmSs} total — analyzed first ${excerptMmSs} (first 1:00)`
      : `Duration: ${totalMmSs} (full file)`,
    `Estimated BPM: ${analysis.estimatedBpm}`,
    `Energy feel: ${vibe}`,
    hint?.trim() ? `User hint: ${hint.trim()}` : '',
    'Output ONLY Strudel JS. Max 30 lines. Use stack() and .cpm(BPM/4).',
  ]
    .filter(Boolean)
    .join('\n');
}

export { MAX_DURATION_SEC };
