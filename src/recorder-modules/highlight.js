// src/recorder-modules/highlight.js

/**
 * Creates hover highlight (blue border following cursor) and query highlight
 * (green overlays for locator-bar matches).
 *
 * @returns {{ showHover(el: Element, locatorText: string): void, clearHover(): void, showQuery(selector: string): void, clearQuery(): void, updateHoverLocator(text: string): void }}
 */
export function createHighlight() {
  if (document.getElementById('__wdio_highlight_overlay__')) return _noopHandles();

  const overlay = document.createElement('div');
  overlay.id = '__wdio_highlight_overlay__';
  overlay.style.cssText = [
    'position:fixed',
    'pointer-events:none',
    'box-sizing:border-box',
    'border:2px solid #3b82f6',
    'border-radius:2px',
    'background:rgba(59,130,246,.08)',
    'z-index:2147483646',
    'display:none',
    'transition:none',
  ].join(';');
  document.body.appendChild(overlay);

  const label = document.createElement('div');
  label.id = '__wdio_highlight_label__';
  label.style.cssText = [
    'position:fixed',
    'pointer-events:none',
    'background:#1e293b',
    'color:#f1f5f9',
    'font:500 11px/1.4 -apple-system,BlinkMacSystemFont,"Segoe UI",monospace',
    'padding:3px 7px',
    'border-radius:4px',
    'white-space:nowrap',
    'max-width:400px',
    'overflow:hidden',
    'text-overflow:ellipsis',
    'z-index:2147483646',
    'display:none',
    'box-shadow:0 2px 8px rgba(0,0,0,.35)',
  ].join(';');
  document.body.appendChild(label);

  let _queryHighlightEls = [];

  return {
    showHover(el, locatorText) {
      const rect = el.getBoundingClientRect();
      overlay.style.top    = rect.top  + 'px';
      overlay.style.left   = rect.left + 'px';
      overlay.style.width  = rect.width  + 'px';
      overlay.style.height = rect.height + 'px';
      overlay.style.display = 'block';

      label.textContent = locatorText || '';
      const labelHeight = 22;
      const topAbove = rect.top - labelHeight - 4;
      label.style.left = Math.max(0, rect.left) + 'px';
      label.style.top  = (topAbove >= 0 ? topAbove : rect.bottom + 4) + 'px';
      label.style.display = 'block';
    },
    clearHover() {
      overlay.style.display = 'none';
      label.style.display   = 'none';
    },
    showQuery(selector) {
      this.clearQuery();
      let elements;
      try { elements = [...document.querySelectorAll(selector)]; } catch { return; }
      elements.slice(0, 50).forEach(el => {
        const rect = el.getBoundingClientRect();
        const div = document.createElement('div');
        div.style.cssText = [
          'position:fixed',
          `top:${rect.top}px`,
          `left:${rect.left}px`,
          `width:${rect.width}px`,
          `height:${rect.height}px`,
          'border:2px solid #22c55e',
          'border-radius:2px',
          'background:rgba(34,197,94,.15)',
          'pointer-events:none',
          'z-index:2147483645',
          'transition:none',
        ].join(';');
        document.body.appendChild(div);
        _queryHighlightEls.push(div);
      });
    },
    clearQuery() {
      for (const el of _queryHighlightEls) el.remove();
      _queryHighlightEls = [];
    },
    updateHoverLocator(text) {
      const el = document.getElementById('__wdio_hover_locator__');
      if (el) el.textContent = text || '';
    },
  };
}

function _noopHandles() {
  return { showHover() {}, clearHover() {}, showQuery() {}, clearQuery() {}, updateHoverLocator() {} };
}
