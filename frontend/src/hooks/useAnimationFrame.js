import { useRef, useEffect, useCallback } from 'react';

/**
 * Custom hook for requestAnimationFrame loops.
 * @param {function} callback - Called each frame with timestamp
 * @param {boolean} active - Whether the loop is running
 */
export function useAnimationFrame(callback, active) {
  const frameRef = useRef(null);
  const callbackRef = useRef(callback);

  // Keep callback ref current without restarting loop
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useEffect(() => {
    if (!active) return;

    const loop = (time) => {
      callbackRef.current(time);
      frameRef.current = requestAnimationFrame(loop);
    };

    frameRef.current = requestAnimationFrame(loop);
    return () => {
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current);
      }
    };
  }, [active]);
}
