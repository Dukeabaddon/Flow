import React from 'react';

export function PlayButton({ isPlaying, onPlay, onStop, disabled }) {
  return (
    <button
      className={`btn ${isPlaying ? 'btn--playing' : ''}`}
      onClick={isPlaying ? onStop : onPlay}
      disabled={disabled}
      aria-label={isPlaying ? 'Stop playback' : 'Start playback'}
      title={isPlaying ? 'Stop' : 'Play'}
    >
      {isPlaying ? '⏹' : '▶'}
    </button>
  );
}
