import React, { useState, useRef, useEffect } from 'react';

export function PromptInput({
  onSubmit,
  onFileSelect,
  onClearAttach,
  attachedFile,
  isLoading,
  disabled,
  isPlaying,
  onPlayStop,
  statusText,
}) {
  const [text, setText] = useState('');
  const inputRef = useRef(null);
  const fileRef = useRef(null);

  useEffect(() => {
    if (inputRef.current) inputRef.current.focus();
  }, []);

  const canSend = Boolean(text.trim() || attachedFile) && !disabled;

  const handleSubmit = (e) => {
    if (e) e.preventDefault();
    if (!canSend) return;
    onSubmit(text.trim(), attachedFile || null);
    setText('');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleIconClick = () => {
    if (disabled) return;
    fileRef.current?.click();
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !onFileSelect) return;
    onFileSelect(file);
  };

  const placeholder = attachedFile
    ? 'Optional style hint…'
    : 'Describe your vibe…';

  return (
    <div className="bottom-wrapper">
      <form onSubmit={handleSubmit} className="bottom-bar">
        <button
          type="button"
          className={`bottom-bar__icon ${attachedFile ? 'bottom-bar__icon--active' : ''}`}
          onClick={handleIconClick}
          disabled={disabled}
          aria-label="Attach audio or MIDI file"
          title="Attach mp3 / midi / audio"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 18V5l12-2v13" />
            <circle cx="6" cy="18" r="3" />
            <circle cx="18" cy="16" r="3" />
          </svg>
        </button>

        <input
          ref={fileRef}
          type="file"
          data-testid="attach-file"
          className="bottom-bar__file"
          accept="audio/*,.mp3,.wav,.ogg,.m4a,.aac,.flac,.webm,.mid,.midi,audio/midi,audio/x-midi"
          onChange={handleFileChange}
          tabIndex={-1}
        />

        <div className="bottom-bar__field">
          {attachedFile && (
            <div className="bottom-bar__chip">
              <span className="bottom-bar__chip-name" title={attachedFile.name}>
                {attachedFile.name}
              </span>
              <button
                type="button"
                className="bottom-bar__chip-clear"
                onClick={onClearAttach}
                aria-label="Clear attached file"
                disabled={disabled}
              >
                ×
              </button>
            </div>
          )}

          <input
            ref={inputRef}
            type="text"
            className="bottom-bar__input"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled}
            aria-label="Enter a music vibe prompt"
            autoComplete="off"
          />

          {statusText && (
            <span className="bottom-bar__status" aria-live="polite">
              {statusText}
            </span>
          )}
        </div>

        <button
          type="submit"
          className="bottom-bar__send"
          disabled={!canSend}
          aria-label="Send prompt"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="19" x2="12" y2="5" />
            <polyline points="5 12 12 5 19 12" />
          </svg>
        </button>
      </form>

      <button
        type="button"
        className="bottom-bar__play"
        onClick={onPlayStop}
        aria-label={isPlaying ? 'Stop' : 'Play'}
      >
        {isPlaying ? (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16" /><rect x="14" y="4" width="4" height="16" /></svg>
        ) : (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
        )}
      </button>
    </div>
  );
}
