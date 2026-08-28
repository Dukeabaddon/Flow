// MIDI → Lupang-style Strudel loop (first 60s, bar-aligned)
// ponytail: durations + chords, no code-line chop

import * as ToneMidi from '@tonejs/midi';
import {
  MAX_ATTACH_SEC,
  attachSlowFactor,
  barAlignWindowSec,
} from './gates.js';

const Midi =
  ToneMidi.Midi ||
  ToneMidi.default?.Midi ||
  ToneMidi.default;

if (typeof Midi !== 'function') {
  throw new Error('Failed to load @tonejs/midi Midi class');
}

const MAX_NOTES_PER_TRACK = 400;
const BEAT_QUANT = 0.25;

function quantize(beats, step = BEAT_QUANT) {
  return Math.round(beats / step) * step;
}

/**
 * @param {import('@tonejs/midi').Note[]} notes
 * @param {number} bpm
 * @returns {string}
 */
export function notesToMiniNotation(notes, bpm) {
  if (!notes.length) return '';

  const sorted = [...notes].sort((a, b) => a.time - b.time);
  const beatMap = new Map();

  for (const n of sorted) {
    const beat = quantize((n.time * bpm) / 60);
    if (!beatMap.has(beat)) beatMap.set(beat, []);
    beatMap.get(beat).push(n);
  }

  const beats = [...beatMap.keys()].sort((a, b) => a - b);
  const tokens = [];
  let cursorBeat = 0;

  for (const beat of beats) {
    const chordNotes = beatMap.get(beat);

    if (beat > cursorBeat) {
      const gapUnits = Math.max(1, Math.round((beat - cursorBeat) * 4));
      tokens.push(`~@${gapUnits}`);
    }

    const durationBeats = Math.max(
      BEAT_QUANT,
      ...chordNotes.map((n) =>
        quantize((n.duration * bpm) / 60, BEAT_QUANT),
      ),
    );
    const durUnits = Math.max(1, Math.round(durationBeats * 4));

    const pitches = [...new Set(chordNotes.map((n) => n.midi))].sort(
      (a, b) => a - b,
    );

    if (pitches.length === 1) {
      tokens.push(`${pitches[0]}@${durUnits}`);
    } else {
      tokens.push(`[${pitches.join(',')}]@${durUnits}`);
    }

    cursorBeat = beat + durationBeats;
  }

  return tokens.join(' ');
}

/**
 * @param {number} avgMidi
 * @param {boolean} forceEpiano
 * @returns {string}
 */
function pickSound(avgMidi, forceEpiano) {
  if (forceEpiano) return 'gm_epiano1';
  if (avgMidi < 48) return 'sawtooth';
  if (avgMidi <= 72) return 'gm_epiano1';
  return 'sine';
}

/**
 * @param {ArrayBuffer | Uint8Array} arrayBuffer
 * @param {string} [hint]
 * @returns {{ code: string, meta: object }}
 */
export function midiToStrudel(arrayBuffer, hint = '') {
  let buf = arrayBuffer;
  if (arrayBuffer instanceof Uint8Array) {
    buf = arrayBuffer.buffer.slice(
      arrayBuffer.byteOffset,
      arrayBuffer.byteOffset + arrayBuffer.byteLength,
    );
  }

  const midi = new Midi(buf);
  const bpm = Math.round(midi.header.tempos?.[0]?.bpm || 120);
  const sourceDuration = midi.duration;
  const rawWindow = Math.min(MAX_ATTACH_SEC, sourceDuration);
  const windowSec = barAlignWindowSec(rawWindow, bpm);
  const slow = attachSlowFactor(bpm, windowSec);
  const hintLower = (hint || '').toLowerCase();
  const forceEpiano = /piano|epiano/.test(hintLower);

  const tracks = midi.tracks
    .map((t, i) => ({
      i,
      name: t.name || `track-${i}`,
      notes: t.notes || [],
      count: (t.notes || []).length,
    }))
    .filter((t) => t.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, 3);

  if (!tracks.length) {
    throw new Error('MIDI has no notes.');
  }

  const layers = [];

  for (const track of tracks) {
    const inWindow = track.notes
      .filter((n) => n.time < windowSec + 0.05)
      .slice(0, MAX_NOTES_PER_TRACK);

    if (!inWindow.length) continue;

    const mini = notesToMiniNotation(inWindow, bpm);
    if (!mini) continue;

    const avgMidi =
      inWindow.reduce((s, n) => s + n.midi, 0) / inWindow.length;
    const sound = pickSound(avgMidi, forceEpiano);
    const gain = layers.length === 0 ? 0.55 : 0.4;

    layers.push(
      `note(\`${mini}\`).s("${sound}").clip(1).gain(${gain}).slow(${slow})`,
    );
  }

  if (!layers.length) {
    throw new Error('Could not distill MIDI into a loop.');
  }

  const code = [
    `setcpm(${bpm}/4)`,
    'stack(',
    `  ${layers.join(',\n  ')}`,
    ')',
  ].join('\n');

  return {
    code: code.trim(),
    meta: {
      bpm,
      tracks: tracks.map((t) => t.name),
      name: midi.name || 'midi',
      duration: sourceDuration,
      windowSec,
      cropped: sourceDuration > windowSec + 0.05,
      hint: hint?.trim() || '',
    },
  };
}
