// Jest-style API via Vitest
import { describe, it, expect } from 'vitest';
import { buildAudioExperimentPrompt } from '../../backend/src/attach/audioAnalyze.js';

describe('buildAudioExperimentPrompt', () => {
  it('mentions first minute crop and no full song', () => {
    const prompt = buildAudioExperimentPrompt({
      duration: 180,
      excerptSec: 60,
      estimatedBpm: 110,
      energy: 0.05,
      filename: 'song.mp3',
    });

    expect(prompt).toMatch(/1:00|first minute/i);
    expect(prompt).toMatch(/Do NOT recreate/i);
    expect(prompt).toContain('song.mp3');
  });

  it('short file prompt does not claim a 1:00 crop', () => {
    const prompt = buildAudioExperimentPrompt({
      duration: 20,
      excerptSec: 20,
      estimatedBpm: 100,
      energy: 0.02,
      filename: 'clip.wav',
    });
    expect(prompt).toMatch(/full file/i);
    expect(prompt).not.toMatch(/first 1:00/);
  });
});
