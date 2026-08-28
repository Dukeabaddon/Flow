/**
 * @typedef {Object} Template
 * @property {string} id - Unique identifier
 * @property {string} name - Human-readable name
 * @property {string[]} tags - Keywords for matching
 * @property {number} bpm - Tempo in beats per minute
 * @property {string} code - Valid Strudel code string
 */

/**
 * @typedef {Object} ShaderConfig
 * @property {string} name - Configuration name
 * @property {number[]} color1 - RGB values [0-1, 0-1, 0-1]
 * @property {number[]} color2 - RGB values [0-1, 0-1, 0-1]
 * @property {number} complexity - Pattern complexity (1.0-6.0)
 * @property {number} speed - Animation speed (0.3-2.5)
 */

/**
 * @typedef {Object} AppState
 * @property {boolean} isPlaying - Whether audio is currently playing
 * @property {boolean} isRecording - Whether recording is active
 * @property {boolean} isLoading - Whether API call is in progress
 * @property {string|null} error - Current error message
 * @property {string} currentCode - Currently playing Strudel code
 * @property {boolean} fallbackMode - Whether using cached templates
 */

/**
 * @typedef {Object} AudioEngine
 * @property {AudioContext} audioContext - Web Audio context
 * @property {AnalyserNode} analyser - FFT analyser for visualization
 * @property {GainNode} gainNode - Master gain node
 * @property {object} scheduler - Strudel scheduler instance
 */

// ponytail: JSDoc types instead of TypeScript — no build step needed for types
export {};
