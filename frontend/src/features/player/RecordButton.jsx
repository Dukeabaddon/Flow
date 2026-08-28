import React from 'react';

export function RecordButton({ isRecording, onToggle, disabled }) {
  return (
    <button
      className={`btn ${isRecording ? 'btn--recording' : ''}`}
      onClick={onToggle}
      disabled={disabled}
      aria-label={isRecording ? 'Stop recording' : 'Start recording'}
      title={isRecording ? 'Stop recording' : 'Record'}
    >
      {isRecording ? '⏺' : '⏺'}
    </button>
  );
}
