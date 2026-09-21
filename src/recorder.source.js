// src/recorder.source.js
// Source file: built by esbuild into src/recorder.content.js (the injected bundle).
// Run: npm run build
import { buildFallbackSelector, extractInfo, getUniqueLocator } from './recorder-modules/recorder-locator.js';
import { getFrameSelector, resolveTextAssertLocator } from './recorder-modules/recorder-helpers.js';
import { attachDialogOverrides, attachSPANavigation } from './recorder-modules/recorder-controls.js';
import { createToolbar } from './recorder-modules/toolbar.js';
import { createHighlight } from './recorder-modules/highlight.js';
import { showContextMenu } from './recorder-modules/context-menu.js';
import { showTextAssertForm, showAttrAssertForm } from './recorder-modules/assert-forms.js';
import { attachEventListeners } from './recorder-modules/event-listeners.js';

(function () {
  if (window.__wdioRecorderActive) return; // prevent double-injection
  window.__wdioRecorderActive = true;

  const FRAME_SEL = getFrameSelector();
  let paused = false;
  let assertMode = null; // null | 'text' | 'visible' | 'value'
  let pickMode = false;
  let stepCount = 0;
  let _toolbar = null;
  let _highlight = null;

  // Tracks the value an input/textarea held when it received focus.
  // Used by _flushInput() to decide whether a clearValue() is needed before setValue().
  const focusValues = new WeakMap();

  let _clickBuf = null; // { payload, timer }

  function _flushClick() {
    if (!_clickBuf) return;
    clearTimeout(_clickBuf.timer);
    send(_clickBuf.payload);
    _clickBuf = null;
  }

  function _cancelClick() {
    if (!_clickBuf) return;
    clearTimeout(_clickBuf.timer);
    _clickBuf = null;
  }

  // ── Input buffer for setValue / keys ordering ─────────────────────────
  // Buffers the most recently edited input/textarea/contentEditable instead of
  // emitting setValue on every input event, and flushes it on:
  //   blur:    user left the field normally
  //   keydown: before browser.keys() for Tab / Enter / Escape, so that setValue()
  //            always precedes browser.keys() in generated code.
  let _inputBuf = null; // { el, locator, warn } | null

  // contentEditable: browsers append a trailing \n to innerText, so strip it.
  function _elValue(el) {
    return el.isContentEditable
      ? el.innerText.replace(/\n$/, '')
      : el.value;
  }

  function _flushInput() {
    if (!_inputBuf) return;
    const { el, locator, warn } = _inputBuf;
    _inputBuf = null;
    const currentValue  = _elValue(el);
    const previousValue = focusValues.get(el) ?? '';
    if (currentValue === previousValue) return; // value unchanged, nothing to record
    if (previousValue !== '') {
      send({ type: 'clearValue', locator, _warn: warn });
    }
    send({ type: 'setValue', locator, value: currentValue, _warn: warn });
  }

  window.__wdioHighlight = function(selector) {
    _highlight?.clearQuery();
    if (selector) _highlight?.showQuery(selector);
  };

  window.__wdioControl = function(cmd) {
    if (cmd === 'pause')         { paused = true;  setPick(false); setAssertMode(null); syncPauseButton(); }
    if (cmd === 'resume')        { paused = false; setPick(false); setAssertMode(null); syncPauseButton(); }
    if (cmd === 'assertText')    { setAssertMode('text');    setPick(false); }
    if (cmd === 'assertVisible') { setAssertMode('visible'); setPick(false); }
    if (cmd === 'assertValue')   { setAssertMode('value');   setPick(false); }
    if (cmd === 'pick')          { setPick(!pickMode); setAssertMode(null); }
    if (cmd === 'recording')     { setAssertMode(null); setPick(false); }
  };

  function send(event) {
    if (paused) return;
    if (event.type !== 'navigate') {
      stepCount++;
      updateToolbarCounter();
    }
    const payload = FRAME_SEL ? { ...event, _frame: FRAME_SEL } : event;
    window.__wdioRecord?.(JSON.stringify(payload));
  }

  attachSPANavigation(send, _flushInput, _flushClick);
  attachDialogOverrides(send);

  function setAssertMode(mode) {
    assertMode = mode;
    document.body.style.cursor = mode ? 'crosshair' : (pickMode ? 'crosshair' : '');
    _toolbar?.setAssertActive(mode);
  }

  function setPick(active) {
    pickMode = active;
    document.body.style.cursor = active ? 'crosshair' : (assertMode ? 'crosshair' : '');
    _toolbar?.setPickActive(active);
  }

  function syncPauseButton() {
    _toolbar?.syncPauseState(paused);
  }

  function updateToolbarCounter() {
    _toolbar?.updateCounter(stepCount);
  }

  function injectUI() {
    _toolbar = createToolbar({
      onPause:      () => {
        paused = true;
        syncPauseButton();
        // Must call __wdioRecord directly: send() checks `if (paused) return` and
        // would silently drop this message when transitioning into the paused state.
        window.__wdioRecord?.(JSON.stringify({ type: 'control:pause' }));
      },
      onResume:     () => {
        paused = false;
        syncPauseButton();
        window.__wdioRecord?.(JSON.stringify({ type: 'control:resume' }));
      },
      onClear:      () => {
        stepCount = 0;
        updateToolbarCounter();
        window.__wdioRecord?.(JSON.stringify({ type: 'clear' }));
      },
      onPick:       () => { setPick(!pickMode); },
      onAssertMode: (mode) => { setAssertMode(assertMode === mode ? null : mode); },
    });
    _highlight = createHighlight();
  }

  if (document.body) {
    injectUI();
  } else {
    document.addEventListener('DOMContentLoaded', injectUI);
  }

  attachEventListeners({
    send,
    getPickMode:  () => pickMode,
    setPickMode:  (v) => setPick(v),
    getAssertMode: () => assertMode,
    setAssertMode,
    getHighlight:  () => _highlight,
    getUniqueLocator,
    showTextAssertForm: (opts) => showTextAssertForm({ ...opts, send }),
    showContextMenu: (opts) => showContextMenu({
      ...opts, send,
      showTextAssertForm: (o) => showTextAssertForm({ ...o, send }),
      showAttrAssertForm: (o) => showAttrAssertForm({ ...o, send }),
    }),
    onFlushInput:  _flushInput,
    onCancelClick: _cancelClick,
    getInputBuf:   () => _inputBuf,
    setInputBuf:   (v) => { _inputBuf = v; },
    getFocusValues: () => focusValues,
    setClickBuf:   (v) => { _clickBuf = v; },
    resolveTextAssertLocator,
  });

  if (window === window.top && /^https?:/.test(location.href)) {
    send({ type: 'navigate', url: location.href });
  }
})();
