// src/recorder-modules/event-listeners.js
// All DOM/window event listeners for the WDIO recorder.
// Receives shared state via getter/setter functions, with no closure over recorder.source.js.

// Returns true for editable elements we want to record setValue for.
// contentEditable: exclude <body> (some apps make the whole body editable)
//                  and the recorder toolbar itself.
function _isRecordableInput(el) {
  if (el.closest('[id^="__wdio_"]')) return false;
  if (['INPUT', 'TEXTAREA'].includes(el.tagName)) {
    return !['submit', 'button', 'checkbox', 'radio'].includes(el.type);
  }
  // contentEditable: covers Draft.js, Quill, Tiptap, ProseMirror, etc.
  return el.isContentEditable && el.tagName !== 'BODY';
}

// On document, events from an open shadow root arrive retargeted to the host; composedPath() has the real element.
function targetOf(e) {
  return e.composedPath().find(n => n instanceof Element) ?? e.target;
}

const CLICKABLE = 'button, a, [role="button"], input[type="submit"], input[type="button"]';

// Nearest clickable ancestor, stepping out of shadow roots to their hosts (never into a slot).
function clickTargetOf(e) {
  const start = targetOf(e);
  for (let n = start; n; n = n.parentElement ?? n.getRootNode().host) {
    if (n.matches(CLICKABLE)) return n;
  }
  return start;
}

export function attachEventListeners({
  send,
  getPickMode, setPickMode,
  getAssertMode, setAssertMode,
  getHighlight,
  getUniqueLocator,
  showTextAssertForm,
  showContextMenu,
  onFlushInput,
  onCancelClick,
  getInputBuf,
  setInputBuf,
  getFocusValues,
  setClickBuf,
  resolveTextAssertLocator,
}) {
  let hoverTimer = null;
  let dragSourceEl = null;

  // A shadow control without a stable locator is clicked via its host, if the host's centre lands on it.
  function clickLocator(el) {
    const own = getUniqueLocator(el);
    const r = el.getBoundingClientRect();
    for (let n = el; own.warn && n.getRootNode() instanceof ShadowRoot;) {
      n = n.getRootNode().host;
      const h = n.getBoundingClientRect();
      const cx = h.left + h.width / 2, cy = h.top + h.height / 2;
      if (cx < r.left || cx > r.right || cy < r.top || cy > r.bottom) continue;
      const host = getUniqueLocator(n);
      if (!host.warn) return host;
    }
    return own;
  }

  document.addEventListener('click', (e) => {
    const el = clickTargetOf(e);
    if (!el || el === document.body) return;
    if (el.closest('[id^="__wdio_"]')) return;
    // checkboxes/radios are recorded via the change event, which does not leave a shadow root
    if (el.tagName === 'INPUT' && (el.type === 'checkbox' || el.type === 'radio') && el.getRootNode() === document) return;

    if (getPickMode()) {
      const { locator, warn } = getUniqueLocator(el);
      window.__wdioRecord?.(JSON.stringify({ type: 'pick', locator, _warn: warn }));
      setPickMode(false);
      return;
    }

    if (getAssertMode()) {
      const { locator, warn } = getUniqueLocator(el);
      if (getAssertMode() === 'text') {
        const text = (el.innerText || '').trim().split('\n')[0].trim().slice(0, 100);
        const { locator: assertLocator, warn: assertWarn } = resolveTextAssertLocator(el, locator, warn, text);
        setAssertMode(null);
        showTextAssertForm({ locator: assertLocator, text, warn: assertWarn, eventType: 'assert:toHaveTextContaining' });
        return;
      } else if (getAssertMode() === 'visible') {
        send({ type: 'assert:toBeDisplayed', locator, _warn: warn });
      } else if (getAssertMode() === 'value') {
        const isFormEl = ['INPUT', 'SELECT', 'TEXTAREA'].includes(el.tagName);
        if (!isFormEl) {
          const tip = document.createElement('div');
          tip.style.cssText = 'position:fixed;bottom:60px;left:50%;transform:translateX(-50%);background:#333;color:#fc9;font-size:11px;padding:4px 10px;border-radius:4px;pointer-events:none;z-index:2147483647';
          tip.textContent = 'Assert Value: only works on input / select / textarea';
          document.body.appendChild(tip);
          setTimeout(() => tip.remove(), 2000);
          return;
        }
        const value = el.value ?? (el.getAttribute('value') || '');
        setAssertMode(null);
        showTextAssertForm({ locator, text: value, warn, eventType: 'assert:toHaveValue', title: 'Assert Value' });
        return;
      }
      setAssertMode(null);
      return;
    }

    if (el.tagName === 'A' && (el.hasAttribute('download') || /\.(pdf|zip|docx?|xlsx?|csv|png|jpe?g|gif|mp4|mp3|exe|dmg|pkg|deb|rpm)\b/i.test(el.href || ''))) {
      const filename = el.getAttribute('download') || el.href.split('/').pop().split('?')[0] || '';
      const { locator, warn } = getUniqueLocator(el);
      send({ type: 'download', locator, filename, _warn: warn });
      return;
    }

    // 300 ms buffer: a second click cancels the single and becomes dblclick.
    const { locator, warn } = clickLocator(el);
    const payload = { type: 'click', locator, _warn: warn };
    onCancelClick();
    setClickBuf({
      payload,
      timer: setTimeout(() => { setClickBuf(null); send(payload); }, 300),
    });
  }, true);

  document.addEventListener('dblclick', (e) => {
    if (targetOf(e).closest('[id^="__wdio_"]')) return;
    const el = clickTargetOf(e);
    if (!el || el === document.body) return;
    onCancelClick(); // discard buffered single clicks
    const { locator, warn } = clickLocator(el);
    send({ type: 'dblclick', locator, _warn: warn });
  }, true);

  document.addEventListener('change', (e) => {
    const el = targetOf(e);
    if (el.closest('[id^="__wdio_"]')) return;
    if (el.tagName === 'SELECT') {
      const { locator, warn } = getUniqueLocator(el);
      const opt = el.options[el.selectedIndex];
      // Normalise visible text: collapse whitespace (non-breaking spaces, tabs, newlines)
      // so selectByVisibleText() gets a clean string independent of browser rendering.
      const optText  = (opt?.text  ?? '').replace(/\s+/g, ' ').trim();
      const optValue = (opt?.value ?? '').trim();
      send({ type: 'select', locator, value: optText, optValue, _warn: warn });
    }
    if (el.tagName === 'INPUT' && el.type === 'checkbox') {
      const { locator, warn } = getUniqueLocator(el);
      send({ type: el.checked ? 'check' : 'uncheck', locator, _warn: warn });
    }
    if (el.tagName === 'INPUT' && el.type === 'radio' && el.checked) {
      const { locator, warn } = getUniqueLocator(el);
      send({ type: 'click', locator, _warn: warn });
    }
    if (el.tagName === 'INPUT' && el.type === 'file' && el.files?.length > 0) {
      const { locator, warn } = getUniqueLocator(el);
      send({ type: 'uploadFile', locator, value: el.files[0].name, _warn: warn });
    }
  }, true);

  document.addEventListener('focusin', (e) => {
    const el = targetOf(e);
    if (!_isRecordableInput(el)) return;
    getFocusValues().set(el, el.isContentEditable ? el.innerText.replace(/\n$/, '') : el.value);
  }, true);

  document.addEventListener('input', (e) => {
    const el = targetOf(e);
    if (!_isRecordableInput(el)) return;
    if (el.tagName === 'INPUT' && el.type === 'file') return;
    const { locator, warn } = getUniqueLocator(el);
    setInputBuf({ el, locator, warn });
  }, true);

  document.addEventListener('blur', (e) => {
    const el = targetOf(e);
    if (!_isRecordableInput(el)) return;
    // Only flush if the buffer belongs to this element (not a later field that already replaced it).
    if (getInputBuf()?.el === el) onFlushInput();
  }, true);

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && (getAssertMode() || getPickMode())) {
      setAssertMode(null);
      setPickMode(false);
      e.stopPropagation();
      return;
    }
    if (targetOf(e).closest('[id^="__wdio_"]')) return;

    // Standalone modifier keys: do not record Ctrl/Alt/Meta/Shift on their own.
    if (['Shift', 'Control', 'Meta', 'Alt'].includes(e.key)) return;

    // Paste shortcuts: the typed result will be captured by _inputBuf/setValue.
    // Recording the key itself would generate a redundant (and platform-wrong) line.
    const isMac = navigator.platform.includes('Mac');
    if (e.key === 'v' && (isMac ? e.metaKey : e.ctrlKey)) return;
    if (e.key === 'Insert' && e.shiftKey) return; // Shift+Insert paste (Windows)

    // Detect whether a meaningful modifier is held.
    // Ctrl / Alt / Meta always count. Shift counts only for non-printable keys
    // (Shift+Tab = reverse-tab; Shift+A = capital A, which setValue handles).
    const hasPrimary = e.ctrlKey || e.altKey || e.metaKey;
    const isPrintable = e.key.length === 1;
    const hasShift  = e.shiftKey && !isPrintable; // Shift+Tab yes, Shift+A no
    const isCombo   = hasPrimary || hasShift;

    if (isCombo) {
      // Combination key: flush pending text first so setValue precedes keys() in output.
      onFlushInput();
      const keys = [];
      if (e.ctrlKey)  keys.push('Control');
      if (e.altKey)   keys.push('Alt');
      if (e.metaKey)  keys.push('Meta');
      if (hasShift)   keys.push('Shift');
      keys.push(e.key);
      send({ type: 'keys', keys }); // array format → browser.keys([Key.Ctrl, 'a'])
      return;
    }

    // No modifier: record only well-known special keys to avoid noise.
    // Full F1-F12 range.
    const SPECIAL = ['Enter', 'Tab', 'Escape', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight',
      'Backspace', 'Delete', 'PageUp', 'PageDown', 'Home', 'End',
      'F1', 'F2', 'F3', 'F4', 'F5', 'F6', 'F7', 'F8', 'F9', 'F10', 'F11', 'F12'];
    if (SPECIAL.includes(e.key)) {
      // Flush pending setValue BEFORE keys that can move focus.
      if (['Tab', 'Enter', 'Escape'].includes(e.key)) onFlushInput();
      send({ type: 'keys', key: e.key }); // scalar format → browser.keys('Enter')
    }
  }, true);

  document.addEventListener('dragstart', (e) => {
    dragSourceEl = targetOf(e);
  }, true);

  document.addEventListener('drop', (e) => {
    if (!dragSourceEl) return;
    const target = targetOf(e);
    if (!target || target === dragSourceEl || target === document.body) return;
    if (target.closest('[id^="__wdio_"]')) return;

    const { locator: srcLoc, warn: srcWarn } = getUniqueLocator(dragSourceEl);
    const { locator: tgtLoc, warn: tgtWarn } = getUniqueLocator(target);

    send({
      type: 'dragAndDrop',
      locator: srcLoc,
      targetLocator: tgtLoc,
      _warn: srcWarn || tgtWarn,
    });

    dragSourceEl = null;
  }, true);

  document.addEventListener('dragend', () => {
    dragSourceEl = null;
  }, true);

  window.addEventListener('scroll', () => { getHighlight()?.clearQuery(); }, { capture: true, passive: true });

  document.addEventListener('mouseover', (e) => {
    if (targetOf(e).closest('[id^="__wdio_"]')) { getHighlight()?.clearHover(); getHighlight()?.updateHoverLocator(''); return; }
    if (targetOf(e) === document.body || targetOf(e) === document.documentElement) { getHighlight()?.clearHover(); getHighlight()?.updateHoverLocator(''); return; }
    clearTimeout(hoverTimer);
    const target = targetOf(e);
    hoverTimer = setTimeout(() => {
      const { locator } = getUniqueLocator(target);
      getHighlight()?.showHover(target, locator);
      getHighlight()?.updateHoverLocator(locator);
    }, 50);
  }, true);

  document.addEventListener('mouseout', (e) => {
    clearTimeout(hoverTimer);
    if (targetOf(e).closest('[id^="__wdio_"]')) return;
    getHighlight()?.clearHover();
    getHighlight()?.updateHoverLocator('');
  }, true);

  document.addEventListener('contextmenu', (e) => {
    if (targetOf(e).closest('[id^="__wdio_"]')) return;
    e.preventDefault();
    const el = targetOf(e);
    const { locator, warn } = getUniqueLocator(el);
    const text = (el.innerText || '').trim().split('\n')[0].trim().slice(0, 60);
    const isCheckable = el.type === 'checkbox' || el.type === 'radio';
    const isFormEl    = ['INPUT', 'SELECT', 'TEXTAREA'].includes(el.tagName);
    const currentValue = isFormEl ? (el.value ?? '') : '';
    showContextMenu({
      x: e.clientX, y: e.clientY, locator, warn, text,
      isFormEl, isCheckable, currentValue,
      currentUrl: location.pathname,
      pageTitle: document.title,
    });
  }, true);
}
