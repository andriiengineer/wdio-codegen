import React from 'react';
import type { Mode } from '../types';
import './Toolbar.css';

interface Props {
  mode: Mode;
  lang: 'js' | 'ts';
  hasCode: boolean;
  outputFile?: string;
  onModeChange: (mode: Mode) => void;
  onLangChange: (lang: 'js' | 'ts') => void;
  onCopy: () => void;
  onClear: () => void;
  onSave: () => void;
}

export function Toolbar({ mode, lang, hasCode, outputFile, onModeChange, onLangChange, onCopy, onClear, onSave }: Props) {
  const isRecording = mode === 'recording';
  const isPaused = mode === 'standby';

  function toggleAssert(next: Mode) {
    onModeChange(mode === next ? 'recording' : next);
  }

  const assertDisabled = isPaused;

  return (
    <div className="toolbar">
      <button
        className={`tb-btn tb-btn--record${isRecording ? ' active' : ''}`}
        onClick={() => onModeChange(isRecording ? 'standby' : 'recording')}
        title={isRecording ? 'Stop recording (Space)' : 'Start recording (Space)'}
      >
        {isRecording ? '⏹' : '⏺'} {isRecording ? 'Stop' : 'Record'}
      </button>

      <div className="tb-sep" />

      <button
        className={`tb-btn tb-btn--pick${mode === 'pick' ? ' active' : ''}`}
        onClick={() => toggleAssert('pick')}
        title="Pick locator"
        disabled={isPaused}
      >
        🔍 Pick
      </button>

      <div className="tb-sep" />

      <button
        className={`tb-btn tb-btn--assert${mode === 'assertVisibility' ? ' active' : ''}`}
        onClick={() => toggleAssert('assertVisibility')}
        title="Assert element is visible"
        disabled={assertDisabled}
      >
        👁 Visibility
      </button>

      <button
        className={`tb-btn tb-btn--assert${mode === 'assertText' ? ' active' : ''}`}
        onClick={() => toggleAssert('assertText')}
        title="Assert element text"
        disabled={assertDisabled}
      >
        T Text
      </button>

      <button
        className={`tb-btn tb-btn--assert${mode === 'assertValue' ? ' active' : ''}`}
        onClick={() => toggleAssert('assertValue')}
        title="Assert input value"
        disabled={assertDisabled}
      >
        = Value
      </button>

      <div className="tb-sep" />

      <button className="tb-btn" onClick={onCopy} disabled={!hasCode} title="Copy all code">
        📋 Copy
      </button>

      {outputFile && (
        <button className="tb-btn" onClick={() => onSave()} disabled={!hasCode} title={`Save to ${outputFile} (⌘S)`}>
          💾 Save
        </button>
      )}

      <button className="tb-btn" onClick={onClear} disabled={!hasCode} title="Clear recording">
        🗑 Clear
      </button>

      <div className="tb-spacer" />

      <select
        className="tb-lang"
        value={lang}
        onChange={(e) => onLangChange(e.target.value as 'js' | 'ts')}
      >
        <option value="js">JS</option>
        <option value="ts">TS</option>
      </select>
    </div>
  );
}
