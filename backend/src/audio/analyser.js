// Analyser bridge — extracts frequency data for visualization
// ponytail: thin wrapper, analyser is already created in engine.js

/**
 * Get bass level (0-1) from analyser.
 * @param {AnalyserNode} analyser
 * @returns {number} Normalized bass level
 */
export function getBassLevel(analyser) {
  if (!analyser) return 0;
  const data = new Uint8Array(analyser.frequencyBinCount);
  analyser.getByteFrequencyData(data);
  // Bass is the first ~10 frequency bins
  const bassSlice = data.slice(0, 10);
  const sum = bassSlice.reduce((a, b) => a + b, 0);
  return sum / (10 * 255);
}

/**
 * Get full frequency spectrum normalized to 0-1.
 * @param {AnalyserNode} analyser
 * @returns {Float32Array} Normalized frequency data
 */
export function getSpectrum(analyser) {
  if (!analyser) return new Float32Array(0);
  const data = new Uint8Array(analyser.frequencyBinCount);
  analyser.getByteFrequencyData(data);
  const normalized = new Float32Array(data.length);
  for (let i = 0; i < data.length; i++) {
    normalized[i] = data[i] / 255;
  }
  return normalized;
}
