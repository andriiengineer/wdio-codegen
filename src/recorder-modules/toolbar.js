// src/recorder-modules/toolbar.js

function _btnStyle(bg, color) {
  return [
    `background:${bg}`,
    `color:${color}`,
    'border:none',
    'border-radius:4px',
    'padding:2px 6px',
    'cursor:pointer',
    'font:inherit',
    'font-size:11px',
    'line-height:1.4',
  ].join(';');
}

/**
 * Injects the floating recording toolbar into the page.
 * Only runs in the top-level frame (not iframes).
 *
 * @param {{ onPause: Function, onResume: Function, onClear: Function, onPick: Function, onAssertMode: Function }} callbacks
 * @returns {{ updateCounter(n: number): void, syncPauseState(paused: boolean): void, setPickActive(active: boolean): void, setAssertActive(mode: string|null): void }}
 */
export function createToolbar({ onPause, onResume, onClear, onPick, onAssertMode }) {
  // The recording toolbar belongs to the top-level frame only.
  // iframes still get highlight overlays but not the toolbar.
  if (window !== window.top) return _noopAPI();
  if (document.getElementById('__wdio_toolbar__')) return _noopAPI();

  const toolbar = document.createElement('div');
  toolbar.id = '__wdio_toolbar__';
  toolbar.style.cssText = [
    'position:fixed',
    'top:12px',
    'left:50%',
    'transform:translateX(-50%)',
    'z-index:2147483647',
    'display:flex',
    'align-items:center',
    'gap:6px',
    'padding:4px 10px',
    'background:rgba(15,15,25,0.85)',
    'border:1px solid rgba(255,255,255,0.12)',
    'border-radius:999px',
    'box-shadow:0 2px 12px rgba(0,0,0,.50)',
    'font:500 10px -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif',
    'color:#e2e8f0',
    'user-select:none',
    'pointer-events:all',
    'cursor:grab',
    'backdrop-filter:blur(8px)',
    '-webkit-backdrop-filter:blur(8px)',
  ].join(';');

  toolbar.onmouseenter = () => { toolbar.style.opacity = '1'; };
  toolbar.onmouseleave = () => { toolbar.style.opacity = '0.85'; };

  // Clear translateX(-50%) on first drag so explicit left/top coordinates take over.
  let _dragging = false;
  let _dragOffsetX = 0;
  let _dragOffsetY = 0;

  toolbar.addEventListener('mousedown', (e) => {
    if (e.target !== toolbar) return; // ignore clicks on child buttons
    _dragging = true;
    const rect = toolbar.getBoundingClientRect();
    _dragOffsetX = e.clientX - rect.left;
    _dragOffsetY = e.clientY - rect.top;
    toolbar.style.cursor = 'grabbing';
    toolbar.style.transform = '';
    toolbar.style.left = rect.left + 'px';
    toolbar.style.top = rect.top + 'px';
    e.preventDefault();
  });

  document.addEventListener('mousemove', (e) => {
    if (!_dragging) return;
    toolbar.style.left = (e.clientX - _dragOffsetX) + 'px';
    toolbar.style.top  = (e.clientY - _dragOffsetY) + 'px';
  });

  document.addEventListener('mouseup', () => {
    if (!_dragging) return;
    _dragging = false;
    toolbar.style.cursor = 'grab';
  });

  const dot = document.createElement('span');
  dot.id = '__wdio_toolbar_dot__';
  dot.style.cssText = 'width:6px;height:6px;border-radius:50%;background:#ef4444;flex-shrink:0';
  toolbar.appendChild(dot);

  const counter = document.createElement('span');
  counter.id = '__wdio_toolbar_counter__';
  counter.style.cssText = 'color:#94a3b8;font-size:10px;min-width:40px;text-align:center';
  counter.textContent = '0 steps';
  toolbar.appendChild(counter);

  const pauseBtn = document.createElement('button');
  pauseBtn.id = '__wdio_toolbar_pause__';
  pauseBtn.type = 'button';
  pauseBtn.style.cssText = _btnStyle('transparent', '#e2e8f0');
  pauseBtn.textContent = '⏸';
  pauseBtn.onclick = (e) => {
    e.stopPropagation();
    const nowPaused = pauseBtn.textContent === '⏸';
    if (nowPaused) onPause(); else onResume();
  };
  toolbar.appendChild(pauseBtn);

  const clearBtn = document.createElement('button');
  clearBtn.type = 'button';
  clearBtn.style.cssText = _btnStyle('transparent', '#e2e8f0');
  clearBtn.textContent = '✕';
  clearBtn.onclick = (e) => { e.stopPropagation(); onClear(); };
  toolbar.appendChild(clearBtn);

  const hoverLocator = document.createElement('span');
  hoverLocator.id = '__wdio_hover_locator__';
  hoverLocator.style.cssText = [
    'font:10px monospace',
    'color:#38bdf8',
    'max-width:280px',
    'overflow:hidden',
    'text-overflow:ellipsis',
    'white-space:nowrap',
    'opacity:0.85',
    'padding:0 4px',
  ].join(';');
  hoverLocator.title = 'Hovered element locator';
  toolbar.appendChild(hoverLocator);

  const sepLoc = document.createElement('span');
  sepLoc.style.cssText = 'width:1px;height:12px;background:rgba(255,255,255,0.15);margin:0 2px;flex-shrink:0';
  toolbar.appendChild(sepLoc);

  const pickBtn = document.createElement('button');
  pickBtn.id = '__wdio_pick__';
  pickBtn.type = 'button';
  pickBtn.title = 'Pick locator';
  pickBtn.textContent = '🎯';
  pickBtn.style.cssText = 'background:transparent;border:none;cursor:pointer;font:11px sans-serif;color:#94a3b8;padding:2px 4px;border-radius:3px';
  pickBtn.onclick = (e) => { e.stopPropagation(); onPick(); };
  toolbar.appendChild(pickBtn);

  const sep3 = document.createElement('span');
  sep3.style.cssText = 'width:1px;height:12px;background:rgba(255,255,255,0.15);margin:0 2px;flex-shrink:0';
  toolbar.appendChild(sep3);

  const assertTextBtn = document.createElement('button');
  assertTextBtn.id = '__wdio_assert_text__';
  assertTextBtn.type = 'button';
  assertTextBtn.title = 'Assert text';
  assertTextBtn.textContent = 'T';
  assertTextBtn.style.cssText = 'background:transparent;border:none;cursor:pointer;font:700 10px monospace;color:#94a3b8;padding:2px 4px;border-radius:3px';
  assertTextBtn.onclick = (e) => { e.stopPropagation(); onAssertMode('text'); };
  toolbar.appendChild(assertTextBtn);

  const assertVisibleBtn = document.createElement('button');
  assertVisibleBtn.id = '__wdio_assert_visible__';
  assertVisibleBtn.type = 'button';
  assertVisibleBtn.title = 'Assert visible';
  assertVisibleBtn.textContent = '👁';
  assertVisibleBtn.style.cssText = 'background:transparent;border:none;cursor:pointer;font:10px sans-serif;color:#94a3b8;padding:2px 4px;border-radius:3px';
  assertVisibleBtn.onclick = (e) => { e.stopPropagation(); onAssertMode('visible'); };
  toolbar.appendChild(assertVisibleBtn);

  const assertValueBtn = document.createElement('button');
  assertValueBtn.id = '__wdio_assert_value__';
  assertValueBtn.type = 'button';
  assertValueBtn.title = 'Assert value';
  assertValueBtn.textContent = '=';
  assertValueBtn.style.cssText = 'background:transparent;border:none;cursor:pointer;font:700 10px monospace;color:#94a3b8;padding:2px 4px;border-radius:3px';
  assertValueBtn.onclick = (e) => { e.stopPropagation(); onAssertMode('value'); };
  toolbar.appendChild(assertValueBtn);

  document.body.appendChild(toolbar);

  return {
    updateCounter(n) {
      counter.textContent = `${n} step${n === 1 ? '' : 's'}`;
    },
    syncPauseState(paused) {
      pauseBtn.textContent = paused ? '▶' : '⏸';
      dot.style.background = paused ? '#64748b' : '#ef4444';
    },
    setPickActive(active) {
      pickBtn.style.color = active ? '#38bdf8' : '#94a3b8';
    },
    setAssertActive(mode) {
      assertTextBtn.style.color    = mode === 'text'    ? '#f59e0b' : '#94a3b8';
      assertVisibleBtn.style.color = mode === 'visible' ? '#f59e0b' : '#94a3b8';
      assertValueBtn.style.color   = mode === 'value'   ? '#f59e0b' : '#94a3b8';
    },
  };
}

function _noopAPI() {
  return { updateCounter() {}, syncPauseState() {}, setPickActive() {}, setAssertActive() {} };
}
