import React, { useState, useRef, useCallback, useEffect } from 'react';
import { FlowLogo } from './components/FlowLogo';
import { Visualizer } from './features/visualizer';
import { PromptInput } from './features/prompt';
import { generatePattern } from '@backend/api';
import { initEngine, playPattern, stopPattern, setEngineStatusCallback, getRecordingStream, getAnalyserNode } from '@backend/audio';
import { findTemplate, matchTemplate } from '@backend/library';
import {
  assertFileSize,
  detectAttachKind,
  analyzeAudioFile,
  buildAudioExperimentPrompt,
} from '@backend/attach';
import { flowTrace } from '@backend/debug/flowTrace.js';
import { visualSpecFromPrompt } from '@backend/visual';

async function loadMidiAttach() {
  const mod = await import('@backend/attach/midiDistill.js');
  return mod;
}

export default function App() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [currentCode, setCurrentCode] = useState('');
  const [elapsed, setElapsed] = useState(0);
  const [isLooping, setIsLooping] = useState(true);
  const [attachedFile, setAttachedFile] = useState(null);
  const [statusText, setStatusText] = useState('');

  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const schedulerRef = useRef(null);
  const gainNodeRef = useRef(null);
  const recordingStreamRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const canvasRef = useRef(null);
  const abortControllerRef = useRef(null);
  const timerRef = useRef(null);
  const visualizerRef = useRef(null);

  useEffect(() => {
    setEngineStatusCallback((msg) => setStatusText(msg || ''));
    return () => setEngineStatusCallback(null);
  }, []);

  useEffect(() => {
    if (isPlaying) {
      const start = Date.now() - elapsed * 1000;
      timerRef.current = setInterval(() => {
        setElapsed(Math.floor((Date.now() - start) / 1000));
      }, 1000);
    } else {
      clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [isPlaying]);

  const formatTime = (s) =>
    `${Math.floor(s / 60)}:${String(Math.floor(s) % 60).padStart(2, '0')}`;

  const ensureEngine = useCallback(async () => {
    const engine = await initEngine();
    audioContextRef.current = engine.audioContext;
    analyserRef.current = engine.analyser;
    schedulerRef.current = engine.scheduler;
    gainNodeRef.current = engine.gainNode;
    recordingStreamRef.current = engine.recordingStream;
    if (audioContextRef.current?.state === 'suspended') {
      await audioContextRef.current.resume();
    }
  }, []);

  useEffect(() => {
    const warm = () => {
      ensureEngine().catch(() => {});
    };
    window.addEventListener('pointerdown', warm, { once: true });
    return () => window.removeEventListener('pointerdown', warm);
  }, [ensureEngine]);

  const playCode = useCallback(async (code, { fallbackPrompt, visualSpec } = {}) => {
    await ensureEngine();
    if (audioContextRef.current?.state === 'suspended') {
      await audioContextRef.current.resume();
    }

    if (visualSpec && visualizerRef.current) {
      visualizerRef.current(visualSpec);
    }

    try {
      await playPattern(
        schedulerRef.current,
        code,
        audioContextRef.current,
      );
      setCurrentCode(code);
      setElapsed(0);
      setIsPlaying(true);
    } catch (err) {
      const template = findTemplate(fallbackPrompt || 'ambient');
      try {
        await playPattern(
          schedulerRef.current,
          template.code,
          audioContextRef.current,
        );
        setCurrentCode(template.code);
        setElapsed(0);
        setIsPlaying(true);
        setError('Pattern failed — playing fallback.');
      } catch {
        setError(err.message || 'Playback failed');
        throw err;
      }
    }
  }, [ensureEngine]);

  const handleFileSelect = useCallback((file) => {
    setError(null);
    try {
      assertFileSize(file);
      detectAttachKind(file);
      setAttachedFile(file);
      setStatusText('');
    } catch (err) {
      setAttachedFile(null);
      setError(err.message || 'Invalid file');
    }
  }, []);

  const handleClearAttach = useCallback(() => {
    setAttachedFile(null);
    setStatusText('');
    setError(null);
  }, []);

  const handleAttachSubmit = useCallback(
    async (hint, file) => {
      setError(null);
      setIsLoading(true);

      if (abortControllerRef.current) abortControllerRef.current.abort();
      abortControllerRef.current = new AbortController();
      const signal = abortControllerRef.current.signal;

      try {
        await ensureEngine();
        const kind = detectAttachKind(file);
        assertFileSize(file);

        if (kind === 'midi') {
          setStatusText('Reading MIDI…');
          const buf = await file.arrayBuffer();
          const midiMod = await loadMidiAttach();
          const { code, meta } = midiMod.midiToStrudel(buf, hint);
          const cropMsg = `Looping first ${formatTime(meta.windowSec)} of ${formatTime(meta.duration)}`;
          setStatusText(cropMsg);
          await playCode(code, {
            fallbackPrompt: hint || 'piano',
            visualSpec: visualSpecFromPrompt(hint || 'piano'),
          });
          setStatusText(cropMsg);
          setAttachedFile(null);
          return;
        }

        // Audio path — analyze offline (does not touch live engine)
        setStatusText('Analyzing audio…');
        const analysis = await analyzeAudioFile(file);
        const cropMsg = `Looping first ${formatTime(analysis.excerptSec)} of ${formatTime(analysis.duration)}`;
        setStatusText(cropMsg);
        const prompt = buildAudioExperimentPrompt(analysis, hint);

        const template = findTemplate(
          hint || analysis.filename || 'ambient',
        );
        const visualHint = hint || analysis.filename || 'ambient';
        await playCode(template.code, {
          fallbackPrompt: 'ambient',
          visualSpec: visualSpecFromPrompt(visualHint),
        });

        setStatusText('Composing experiment…');
        try {
          const code = await generatePattern(prompt, '', signal);
          await playCode(code, {
            fallbackPrompt: hint || analysis.filename || 'ambient',
          });
        } catch {
          // keep fallback already playing
        }
        setStatusText(cropMsg);
        setAttachedFile(null);
      } catch (err) {
        if (err?.name === 'AbortError') return;
        setError(err.message || 'Attach failed');
        setStatusText('');
      } finally {
        setIsLoading(false);
      }
    },
    [ensureEngine, playCode],
  );

  const handlePromptSubmit = useCallback(
    async (promptText, file) => {
      if (file) {
        await handleAttachSubmit(promptText, file);
        return;
      }

      setError(null);
      setStatusText('');

      if (abortControllerRef.current) abortControllerRef.current.abort();
      abortControllerRef.current = new AbortController();
      const signal = abortControllerRef.current.signal;

      const { template, score } = matchTemplate(promptText);
      const visualSpec = visualSpecFromPrompt(promptText);
      flowTrace({
        src: 'route',
        via: 'try-cerebras',
        templateId: template.id,
        score,
        prompt: String(promptText).slice(0, 80),
      });
      flowTrace({
        src: 'visual',
        mode: visualSpec.mode,
        texture: visualSpec.texture,
        dirX: Number(visualSpec.dirX.toFixed(2)),
        dirY: Number(visualSpec.dirY.toFixed(2)),
      });

      const llm = generatePattern(promptText, '', signal);

      const engineReady = ensureEngine()
        .then(() => playCode(template.code, { visualSpec }))
        .catch((err) => {
          setError(err.message || 'Playback failed');
        });

      llm
        .then(async (code) => {
          await engineReady;
          if (signal.aborted) return;
          flowTrace({
            src: 'swap',
            via: 'cerebras',
            preview: String(code).replace(/\s+/g, ' ').slice(0, 80),
          });
          await playCode(code);
        })
        .catch((err) => {
          flowTrace({
            src: 'swap',
            via: 'none',
            stayedOn: template.id,
            error: String(err?.message || err).slice(0, 160),
          });
        });
    },
    [ensureEngine, playCode, handleAttachSubmit],
  );

  const handlePlayStop = useCallback(async () => {
    if (isPlaying) {
      stopPattern(schedulerRef.current);
      setIsPlaying(false);
    } else if (currentCode) {
      await ensureEngine();
      await playPattern(
        schedulerRef.current,
        currentCode,
        audioContextRef.current,
      );
      setIsPlaying(true);
    } else {
      handlePromptSubmit('ambient chill');
    }
  }, [isPlaying, currentCode, ensureEngine, handlePromptSubmit]);

  const handleRecordToggle = useCallback(() => {
    if (isRecording) {
      if (mediaRecorderRef.current?.state === 'recording') {
        mediaRecorderRef.current.stop();
      }
      setIsRecording(false);
    } else {
      if (!recordingStreamRef.current && !getRecordingStream()) return;

      const stream = getRecordingStream() || recordingStreamRef.current;
      recordingStreamRef.current = stream;
      const liveAnalyser = getAnalyserNode() || analyserRef.current;
      analyserRef.current = liveAnalyser;

      const recorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus',
      });
      const chunks = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/webm;codecs=opus' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `flow-${Date.now()}.webm`;
        a.click();
        URL.revokeObjectURL(url);
      };

      recorder.start(100);
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
    }
  }, [isRecording]);

  const handleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  };

  return (
    <div className="app">
      <Visualizer
        canvasRef={canvasRef}
        analyserRef={analyserRef}
        isPlaying={true}
        onChangeConfig={(fn) => {
          visualizerRef.current = fn;
        }}
      />

      <FlowLogo />

      <div className="top-bar">
        <span className="top-bar__time">{formatTime(elapsed)}</span>

        {isRecording ? (
          <div className="top-bar__waveform">
            {Array.from({ length: 16 }, (_, i) => (
              <div key={i} className="top-bar__waveform-bar" />
            ))}
          </div>
        ) : (
          <div className="top-bar__progress">
            <div
              className="top-bar__progress-fill"
              style={{ width: isPlaying ? '100%' : '0%' }}
            />
          </div>
        )}

        <button
          className="top-bar__btn"
          onClick={() => setIsLooping(!isLooping)}
          aria-label="Toggle loop"
          title="Loop"
          style={{ opacity: isLooping ? 1 : 0.4 }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M17 2l4 4-4 4" />
            <path d="M3 11V9a4 4 0 014-4h14" />
            <path d="M7 22l-4-4 4-4" />
            <path d="M21 13v2a4 4 0 01-4 4H3" />
          </svg>
        </button>

        <button
          className="top-bar__btn"
          onClick={handleFullscreen}
          aria-label="Fullscreen"
          title="Fullscreen"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M8 3H5a2 2 0 00-2 2v3m18 0V5a2 2 0 00-2-2h-3m0 18h3a2 2 0 002-2v-3M3 16v3a2 2 0 002 2h3" />
          </svg>
        </button>

        <button
          className={`top-bar__btn top-bar__btn--record ${isRecording ? 'active' : ''}`}
          onClick={handleRecordToggle}
          disabled={!isPlaying}
          aria-label={isRecording ? 'Stop recording' : 'Record'}
          title="Record"
        >
          ⏺
        </button>
      </div>

      {error && (
        <div className="error-banner" role="alert">
          {error}
        </div>
      )}

      <PromptInput
        onSubmit={handlePromptSubmit}
        onFileSelect={handleFileSelect}
        onClearAttach={handleClearAttach}
        attachedFile={attachedFile}
        isLoading={isLoading}
        disabled={isLoading}
        isPlaying={isPlaying}
        onPlayStop={handlePlayStop}
        statusText={statusText}
      />
    </div>
  );
}
