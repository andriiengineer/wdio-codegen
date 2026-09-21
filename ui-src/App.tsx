import React, { useCallback, useEffect, useRef } from 'react';
import { Toolbar } from './components/Toolbar';
import { CodePanel, buildCode } from './components/CodePanel';
import { Sidebar } from './components/Sidebar';
import { useWS } from './hooks/useWS';
import { useRecorder } from './hooks/useRecorder';
import { langFromPath } from '../src/code-builder.js';
import type { Mode } from './types';

// True when the user is typing in an editable element, used to skip global
// shortcuts so they don't hijack normal text input.
function isTypingTarget(el: EventTarget | null): boolean {
  if (!(el instanceof HTMLElement)) return false;
  if (el.isContentEditable) return true;
  const tag = el.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
}

interface Props {
  port: string;
  outputFile: string;
  token: string;
  browserName?: string;
}

export default function App({ port, outputFile, token }: Props) {
  const { state, setMode, setLang, setLocator, handleWsMessage } = useRecorder(langFromPath(outputFile));
  const { send } = useWS(port, token, handleWsMessage);
  const locatorInputRef = useRef<HTMLInputElement>(null);

  // Sync mode with page via WS
  const handleModeChange = useCallback((mode: Mode) => {
    setMode(mode);
    // Map React mode names to __wdioControl commands
    const cmdMap: Record<Mode, string> = {
      recording: 'recording',
      standby: 'pause',
      assertText: 'assertText',
      assertVisibility: 'assertVisible',
      assertValue: 'assertValue',
      pick: 'pick',
    };
    send({ type: 'set-mode', mode: cmdMap[mode] });
  }, [send, setMode]);

  // Global keyboard shortcuts. Guarded so they never hijack a real input/textarea.
  // Escape always works (it should cancel modes even mid-type).
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      // Escape: cancel any active mode (works even while typing)
      if (e.key === 'Escape') {
        handleModeChange('recording');
        return;
      }

      // Cmd/Ctrl+K: focus locator input (works even while typing elsewhere)
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        locatorInputRef.current?.focus();
        locatorInputRef.current?.select();
        return;
      }

      // The shortcuts below would clobber regular typing, so skip if a form
      // element is focused.
      if (isTypingTarget(e.target)) return;

      // Cmd/Ctrl+S: save to file (only when --output was given)
      if (mod && e.key.toLowerCase() === 's') {
        e.preventDefault();
        handleSave();
        return;
      }

      // Space: toggle record/pause
      if (e.key === ' ' || e.code === 'Space') {
        e.preventDefault();
        handleModeChange(state.mode === 'recording' ? 'standby' : 'recording');
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [handleModeChange, state.mode, state.lines.length, outputFile]);

  // Update page title from first navigate URL
  useEffect(() => {
    const nav = state.lines.find(l => l.text.includes('browser.url('));
    if (nav) {
      const m = nav.text.match(/browser\.url\('([^']+)'\)/);
      if (m) {
        try {
          const domain = new URL(m[1]).hostname;
          document.title = `wdio-codegen - ${domain}`;
        } catch {}
      }
    }
  }, [state.lines.length]);

  function handleLocatorChange(sel: string) {
    setLocator(sel);
    send({ type: 'highlight', selector: sel });
  }

  function handleCopy() {
    const code = buildCode(state.lines, state.lang);
    navigator.clipboard.writeText(code).catch(() => {});
  }

  function handleClear() {
    if (state.lines.length === 0) return;
    const ok = window.confirm(`Clear ${state.actionCount} recorded action${state.actionCount === 1 ? '' : 's'}? This cannot be undone.`);
    if (ok) send({ type: 'clear' });
  }

  async function handleSave() {
    if (!outputFile || state.lines.length === 0) return;
    const code = buildCode(state.lines, state.lang);
    try {
      await fetch(`http://localhost:${port}/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Wdio-Token': token },
        body: JSON.stringify({ code, path: outputFile }),
      });
    } catch {
      // Silently ignore network errors: file save is best-effort
    }
  }

  const isRecording = state.mode === 'recording';
  const browserName = state.browserName || 'chrome';

  return (
    <div className="app">
      <div className="app-titlebar">
        <div className="titlebar-dot" style={{ background: '#ff5f56' }} />
        <div className="titlebar-dot" style={{ background: '#ffbd2e' }} />
        <div className="titlebar-dot" style={{ background: '#27c93f' }} />
        <span style={{ marginLeft: 8 }}>wdio-codegen</span>
      </div>

      <Toolbar
        mode={state.mode}
        lang={state.lang}
        hasCode={state.lines.length > 0}
        outputFile={outputFile}
        onModeChange={handleModeChange}
        onLangChange={setLang}
        onCopy={handleCopy}
        onClear={handleClear}
        onSave={handleSave}
      />

      <div className="app-body">
        <div className="code-area">
          <CodePanel lines={state.lines} lang={state.lang} />
        </div>
        <Sidebar
          locator={state.locator}
          lines={state.lines}
          onLocatorChange={handleLocatorChange}
          locatorInputRef={locatorInputRef}
        />
      </div>

      <div className="app-statusbar">
        {isRecording ? (
          <span className="status-rec"><span className="status-dot" />Recording</span>
        ) : state.mode === 'standby' ? (
          <span style={{ color: '#888' }}>⏸ Paused</span>
        ) : (
          <span style={{ color: '#7c3aed' }}>● {state.mode}</span>
        )}
        <span>{browserName.charAt(0).toUpperCase() + browserName.slice(1)}</span>
        <span>WebdriverIO 9</span>
        <div style={{ flex: 1 }} />
        <span>{state.actionCount} actions</span>
        {outputFile && <span>→ {outputFile}</span>}
        {!state.connected && <span className="status-disconnected">Disconnected</span>}
      </div>
    </div>
  );
}
