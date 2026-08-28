export {
  MAX_FILE_BYTES,
  MAX_DURATION_SEC,
  MAX_ATTACH_SEC,
  MAX_CODE_LINES,
  attachExcerptSec,
  barAlignWindowSec,
  attachSlowFactor,
  detectAttachKind,
  assertFileSize,
  assertDuration,
  countCodeLines,
} from './gates.js';

export {
  analyzeAudioFile,
  buildAudioExperimentPrompt,
} from './audioAnalyze.js';

// midiToStrudel: import from './midiDistill.js' lazily (Vite CJS interop)
