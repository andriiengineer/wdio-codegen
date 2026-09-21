// src/recorder-modules/assert-forms.js

function _makeField(placeholder) {
  const inp = document.createElement('input');
  inp.type = 'text';
  inp.placeholder = placeholder;
  inp.style.cssText = [
    'background:#0f172a',
    'border:1px solid #334155',
    'border-radius:6px',
    'color:#e2e8f0',
    'font:13px monospace',
    'padding:7px 10px',
    'outline:none',
    'width:100%',
    'box-sizing:border-box',
  ].join(';');
  inp.addEventListener('focus', () => { inp.style.borderColor = '#3b82f6'; });
  inp.addEventListener('blur',  () => { inp.style.borderColor = '#334155'; });
  // Prevent recorder from picking up keystrokes inside the form
  inp.addEventListener('keydown', e => e.stopPropagation(), true);
  return inp;
}

function _overlayBase(id) {
  document.getElementById(id)?.remove();
  const overlay = document.createElement('div');
  overlay.id = id;
  overlay.style.cssText = [
    'position:fixed',
    'top:50%', 'left:50%',
    'transform:translate(-50%,-50%)',
    'background:#1e293b',
    'border:1px solid #334155',
    'border-radius:10px',
    'padding:18px 20px',
    'font:13px -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif',
    'color:#e2e8f0',
    'z-index:2147483647',
    'box-shadow:0 8px 32px rgba(0,0,0,.6)',
    'min-width:280px',
    'display:flex',
    'flex-direction:column',
    'gap:10px',
  ].join(';');
  return overlay;
}

function _cancelBtn() {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.textContent = 'Cancel';
  btn.style.cssText = 'background:transparent;border:1px solid #334155;border-radius:5px;color:#94a3b8;font:12px sans-serif;padding:5px 12px;cursor:pointer';
  return btn;
}

function _okBtn() {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.textContent = 'Add Assertion';
  btn.style.cssText = 'background:#3b82f6;border:none;border-radius:5px;color:#fff;font:600 12px sans-serif;padding:5px 14px;cursor:pointer';
  return btn;
}

/**
 * Renders a floating text/value assertion form pre-filled with detected text.
 * User can edit before confirming.
 *
 * @param {{ locator: string, text: string, warn: boolean, eventType: string, title?: string, send: Function }} opts
 */
export function showTextAssertForm({ locator, text, warn, eventType, title, send }) {
  const overlay = _overlayBase('__wdio_text_form__');
  overlay.style.minWidth = '320px';

  const titleEl = document.createElement('div');
  titleEl.style.cssText = 'font-size:11px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:.06em';
  titleEl.textContent = title || 'Assert Text';
  overlay.appendChild(titleEl);

  const locLabel = document.createElement('div');
  locLabel.style.cssText = 'font-size:11px;color:#64748b;font-family:monospace;overflow:hidden;text-overflow:ellipsis;white-space:nowrap';
  locLabel.textContent = locator;
  overlay.appendChild(locLabel);

  const inp = document.createElement('input');
  inp.type = 'text';
  inp.placeholder = 'Expected text…';
  inp.style.cssText = [
    'background:#0f172a',
    'border:1px solid #3b82f6',
    'border-radius:6px',
    'color:#e2e8f0',
    'font:13px monospace',
    'padding:7px 10px',
    'outline:none',
    'width:100%',
    'box-sizing:border-box',
  ].join(';');
  inp.value = text;
  inp.addEventListener('keydown', e => e.stopPropagation(), true);
  inp.addEventListener('focus', () => { inp.style.borderColor = '#60a5fa'; });
  inp.addEventListener('blur',  () => { inp.style.borderColor = '#3b82f6'; });
  overlay.appendChild(inp);

  const btnRow = document.createElement('div');
  btnRow.style.cssText = 'display:flex;gap:8px;justify-content:flex-end;margin-top:2px';

  const cancel = _cancelBtn();
  cancel.onclick = () => overlay.remove();

  const ok = _okBtn();
  ok.onclick = () => {
    send({ type: eventType, locator, value: inp.value, _warn: warn });
    overlay.remove();
  };

  inp.addEventListener('keydown', e => {
    if (e.key === 'Enter')  { e.preventDefault(); ok.click(); }
    if (e.key === 'Escape') { e.preventDefault(); overlay.remove(); }
  });

  btnRow.appendChild(cancel);
  btnRow.appendChild(ok);
  overlay.appendChild(btnRow);
  document.body.appendChild(overlay);

  inp.focus();
  inp.select();
}

/**
 * Renders a floating form to capture attribute name + expected value for an assert:toHaveAttr step.
 *
 * @param {{ locator: string, warn: boolean, send: Function }} opts
 */
export function showAttrAssertForm({ locator, warn, send }) {
  const overlay = _overlayBase('__wdio_attr_form__');

  const titleEl = document.createElement('div');
  titleEl.style.cssText = 'font-size:11px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:.06em';
  titleEl.textContent = 'Assert Attribute';
  overlay.appendChild(titleEl);

  const attrInput = _makeField('Attribute name (e.g. href)');
  const valInput  = _makeField('Expected value');
  overlay.appendChild(attrInput);
  overlay.appendChild(valInput);

  const btnRow = document.createElement('div');
  btnRow.style.cssText = 'display:flex;gap:8px;justify-content:flex-end;margin-top:2px';

  const cancel = _cancelBtn();
  cancel.onclick = () => overlay.remove();

  const ok = _okBtn();
  ok.onclick = () => {
    const attr = attrInput.value.trim();
    const val  = valInput.value;
    if (attr) send({ type: 'assert:toHaveAttr', locator, attr, value: val, _warn: warn });
    overlay.remove();
  };

  [attrInput, valInput].forEach(inp => {
    inp.addEventListener('keydown', e => {
      if (e.key === 'Enter')  { e.preventDefault(); ok.click(); }
      if (e.key === 'Escape') { e.preventDefault(); overlay.remove(); }
    });
  });

  btnRow.appendChild(cancel);
  btnRow.appendChild(ok);
  overlay.appendChild(btnRow);
  document.body.appendChild(overlay);
  attrInput.focus();
}
