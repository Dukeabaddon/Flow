// Jest-style API via Vitest
import { describe, it, expect } from 'vitest';
import * as ToneMidi from '@tonejs/midi';
import { midiToStrudel } from '../../backend/src/attach/midiDistill.js';
import { barAlignWindowSec } from '../../backend/src/attach/gates.js';

const Midi =
  ToneMidi.Midi ||
  ToneMidi.default?.Midi ||
  ToneMidi.default;

function toArrayBuffer(midi) {
  const uint8 = midi.toArray();
  return uint8.buffer.slice(uint8.byteOffset, uint8.byteOffset + uint8.byteLength);
}

function buildNinetySecMidi() {
  const midi = new Midi();
  const track = midi.addTrack();

  track.addNote({ midi: 60, time: 1, duration: 0.4 });
  track.addNote({ midi: 64, time: 1, duration: 0.4 });

  for (let t = 0; t <= 90; t += 0.5) {
    const pitch = t >= 70 ? 90 : 60;
    track.addNote({ midi: pitch, time: t, duration: 0.4 });
  }

  return midi;
}

function buildShortMidi() {
  const midi = new Midi();
  const track = midi.addTrack();
  track.addNote({ midi: 60, time: 0, duration: 0.5 });
  track.addNote({ midi: 64, time: 1, duration: 0.5 });
  return midi;
}

describe('midiToStrudel', () => {
  it('crops 90s MIDI to first minute with durations and slow', () => {
    const buf = toArrayBuffer(buildNinetySecMidi());
    const { code, meta } = midiToStrudel(buf);

    expect(meta.windowSec).toBeLessThanOrEqual(60);
    expect(meta.cropped).toBe(true);
    expect(meta.duration).toBeGreaterThanOrEqual(89);

    expect(code).toMatch(/@\d+/);
    expect(code).toContain('.slow(');
    expect(code).toMatch(/setcpm\(120\s*\/\s*4\)/);

    expect(code).not.toMatch(/\s90@/);
    expect(code).not.toMatch(/"90/);
    expect(code).toContain('60');
    expect(code).toMatch(/\[/);

    const noteMatch = code.match(/note\(`([^`]+)`\)/);
    expect(noteMatch).toBeTruthy();
    expect(noteMatch[1]).not.toMatch(/\b90@/);
  });

  it('short MIDI is not cropped', () => {
    const buf = toArrayBuffer(buildShortMidi());
    const { meta } = midiToStrudel(buf);

    expect(meta.cropped).toBe(false);
    expect(meta.windowSec).toBe(
      barAlignWindowSec(Math.min(60, meta.duration), meta.bpm),
    );
  });
});
