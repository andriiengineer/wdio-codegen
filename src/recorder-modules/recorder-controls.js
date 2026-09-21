// src/recorder-modules/recorder-controls.js
// Browser-global override helpers: dialog interception, SPA navigation patching.
// These run in the browser context (bundled by esbuild into recorder.content.js).
// Each function takes `send` as a callback to avoid circular imports.

export function attachDialogOverrides(send) {
  const _origAlert = window.alert;
  window.alert = function(msg) {
    send({ type: 'dialog:alert', message: String(msg ?? ''), _warn: true });
    return _origAlert.call(this, msg);
  };

  const _origConfirm = window.confirm;
  window.confirm = function(msg) {
    const result = _origConfirm.call(this, msg);
    send({ type: result ? 'dialog:accept' : 'dialog:dismiss', message: String(msg ?? ''), _warn: true });
    return result;
  };

  const _origPrompt = window.prompt;
  window.prompt = function(msg, defaultValue) {
    if (window.__wdioRecorderInternal) return _origPrompt.call(this, msg, defaultValue);
    const result = _origPrompt.call(this, msg, defaultValue);
    if (result !== null) {
      send({ type: 'dialog:prompt', message: String(msg ?? ''), value: result });
    } else {
      send({ type: 'dialog:dismiss', message: String(msg ?? ''), _warn: false });
    }
    return result;
  };
}

// Patches history.pushState and popstate for SPA navigation detection.
// Top-level frame only: iframes don't own navigation history.
export function attachSPANavigation(send, flushInput, flushClick) {
  if (window !== window.top) return;
  const _origPushState = history.pushState.bind(history);
  history.pushState = function(...args) {
    flushInput(); // commit pending setValue before navigation
    flushClick(); // commit buffered click before navigation
    _origPushState(...args);
    window.__wdioRecord?.(JSON.stringify({ type: 'navigate', url: location.href }));
  };
  window.addEventListener('popstate', () => {
    flushInput();
    flushClick();
    window.__wdioRecord?.(JSON.stringify({ type: 'navigate', url: location.href }));
  });
}
