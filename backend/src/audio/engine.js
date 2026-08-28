// Audio Engine — Strudel integration matched to strudel.cc sound bake

import { bakeStrudelSounds } from './soundBake.js';

let audioContext = null;
let analyser = null;
let gainNode = null;
let strudelInstance = null;
let recordingStream = null;
let soundsReady = null;
let statusCallback = null;

async function tapSuperdoughThroughGain() {
  if (!gainNode) return { tapped: false, reason: 'no-gain' };
  try {
    const { getSuperdoughAudioController } = await import('superdough');
    const destGain = getSuperdoughAudioController()?.output?.destinationGain;
    if (!destGain) return { tapped: false, reason: 'no-destGain' };
    if (destGain._flowTapped === gainNode) return { tapped: true, already: true };
    destGain.disconnect();
    destGain.connect(gainNode);
    destGain._flowTapped = gainNode;
    return { tapped: true, already: false };
  } catch (err) {
    return { tapped: false, error: String(err?.message || err) };
  }
}

function rebuildOnContext(ctx) {
  if (!ctx || ctx === audioContext) return;
  audioContext = ctx;
  analyser = ctx.createAnalyser();
  analyser.fftSize = 256;
  analyser.smoothingTimeConstant = 0.8;
  gainNode = ctx.createGain();
  gainNode.gain.value = 0.8;
  gainNode.connect(analyser);
  analyser.connect(ctx.destination);
  const recordingDest = ctx.createMediaStreamDestination();
  gainNode.connect(recordingDest);
  recordingStream = recordingDest.stream;
}

function installDestinationTap() {
  if (AudioNode.prototype._flowOrigConnect) {
    window.__flowHijackCount = window.__flowHijackCount || 0;
    return { installed: true, already: true, hijackCount: window.__flowHijackCount };
  }
  const orig = AudioNode.prototype.connect;
  AudioNode.prototype._flowOrigConnect = orig;
  window.__flowHijackCount = 0;
  AudioNode.prototype.connect = function flowConnect(...args) {
    const dest = args[0];
    if (dest && dest === this.context.destination && this !== analyser && this !== gainNode) {
      if (gainNode && this.context !== gainNode.context) {
        rebuildOnContext(this.context);
      }
      if (gainNode && this.context === gainNode.context) {
        args[0] = gainNode;
        window.__flowHijackCount = (window.__flowHijackCount || 0) + 1;
      }
    }
    return orig.apply(this, args);
  };
  return { installed: true, already: false, hijackCount: 0 };
}

/**
 * Optional UI status hook (e.g. "Loading piano…").
 * @param {(msg: string) => void} fn
 */
export function setEngineStatusCallback(fn) {
  statusCallback = fn;
}

function setStatus(msg) {
  try {
    statusCallback?.(msg);
  } catch {
    /* ignore */
  }
}

/**
 * Initialize the audio engine. Must be called from a user gesture handler.
 */
let boot = null;

async function createEngineOnce() {

  const { setAudioContext } = await import('superdough');
  audioContext = new (window.AudioContext || window.webkitAudioContext)();
  setAudioContext(audioContext);

  analyser = audioContext.createAnalyser();
  analyser.fftSize = 256;
  analyser.smoothingTimeConstant = 0.8;

  gainNode = audioContext.createGain();
  gainNode.gain.value = 0.8;
  gainNode.connect(analyser);
  analyser.connect(audioContext.destination);

  const recordingDest = audioContext.createMediaStreamDestination();
  gainNode.connect(recordingDest);
  recordingStream = recordingDest.stream;

  installDestinationTap();


  try {
    const { initStrudel } = await import('@strudel/web');

    strudelInstance = await initStrudel({
      audioContext,
      destination: gainNode,
      prebake: async () => {
        // Register AFTER webaudio/superdough ready (cV already ran)
        soundsReady = bakeStrudelSounds(() => {});
        await soundsReady;
      },
    });

    // Belt-and-suspenders: bake again if prebake skipped somehow
    if (!soundsReady) {
      soundsReady = bakeStrudelSounds(() => {});
    }
    await soundsReady;

    await tapSuperdoughThroughGain();
  } catch (err) {
    console.error('Strudel init failed:', err);
    strudelInstance = createFallbackScheduler();
  }

  if (audioContext.state === 'suspended') {
    await audioContext.resume();
  }

  setStatus('');

  return {
    audioContext,
    analyser,
    scheduler: strudelInstance,
    gainNode,
    recordingStream: recordingDest.stream,
  };
}

export async function initEngine() {
  if (!boot) {
    boot = createEngineOnce().catch((err) => {
      boot = null;
      throw err;
    });
  }
  await boot;
  if (audioContext?.state === 'suspended') {
    await audioContext.resume();
  }
  installDestinationTap();
  if (soundsReady) await soundsReady;
  await tapSuperdoughThroughGain();
  return {
    audioContext,
    analyser,
    scheduler: strudelInstance,
    gainNode,
    recordingStream,
  };
}

/**
 * Clean code for evaluate: strip comments only.
 * Do NOT rewrite gm_* / piano — soundfonts are registered like strudel.cc.
 * @param {string} code
 */
export function sanitizePatternCode(code) {
  return String(code || '')
    .split('\n')
    .filter((line) => !line.trim().startsWith('//'))
    .join('\n')
    .trim();
}

/**
 * Evaluate and play a Strudel pattern.
 */
export async function playPattern(scheduler, code, ctx = audioContext) {
  if (!scheduler) return;

  if (ctx && ctx.state === 'suspended') {
    await ctx.resume();
  }

  if (soundsReady) {
    try {
      await soundsReady;
    } catch (err) {
      console.warn('Sound bake warning:', err);
    }
  }

  await tapSuperdoughThroughGain();

  const clean = sanitizePatternCode(code);
  if (!clean) {
    throw new Error('Empty pattern after sanitize');
  }

  try {
    if (scheduler.evaluate) {
      // Second arg autostart=true (@strudel/core repl). Eval errors are swallowed
      // internally — check state.evalError or we get a silent timer.
      const pattern = await scheduler.evaluate(clean, true);
      if (scheduler.state?.evalError) {
        throw scheduler.state.evalError;
      }
      if (pattern == null && scheduler.setPattern) {
        throw new Error('Evaluate returned no pattern');
      }
    } else if (scheduler.setPattern) {
      scheduler.setPattern(clean, true);
    }
  } catch (err) {
    console.error('Pattern evaluation error:', err);
    throw new Error(`Invalid pattern: ${err.message}`);
  }
}

export function stopPattern(scheduler) {
  if (!scheduler) return;
  try {
    if (scheduler.stop) scheduler.stop();
    else if (scheduler.silence) scheduler.silence();
  } catch (err) {
    console.warn('Stop error:', err);
  }
}

export function getAnalyserData() {
  if (!analyser) return null;
  const data = new Uint8Array(analyser.frequencyBinCount);
  analyser.getByteFrequencyData(data);
  return data;
}

function createFallbackScheduler() {
  return {
    evaluate: async () => {},
    stop: () => {},
    setPattern: () => {},
  };
}

export function getRecordingStream() {
  return recordingStream;
}

export function getAnalyserNode() {
  return analyser;
}
