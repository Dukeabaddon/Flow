import React, { useEffect } from 'react';
import { useVisualizer } from './useVisualizer';

export function Visualizer({ canvasRef, analyserRef, isPlaying, onChangeConfig }) {
  const { initShader, updateUniforms, cleanup, applySpec } = useVisualizer(canvasRef);

  useEffect(() => {
    initShader();
    if (onChangeConfig) onChangeConfig(applySpec);
    return cleanup;
  }, []);

  // Always animate — simulated pulse when no analyser, real data when playing
  useEffect(() => {
    let animId;
    const animate = () => {
      if (analyserRef.current) {
        const data = new Uint8Array(analyserRef.current.frequencyBinCount);
        analyserRef.current.getByteFrequencyData(data);
        const bassSlice = data.slice(0, 10);
        const bass = bassSlice.reduce((a, b) => a + b, 0) / (10 * 255);
        updateUniforms({ bass });
      } else {
        const t = Date.now() / 1000;
        const fakeBass = 0.15 + Math.sin(t * 0.5) * 0.1;
        updateUniforms({ bass: fakeBass });
      }
      animId = requestAnimationFrame(animate);
    };

    animId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animId);
  }, [analyserRef]);

  return (
    <canvas
      ref={canvasRef}
      className="visualizer-canvas"
      aria-hidden="true"
    />
  );
}
