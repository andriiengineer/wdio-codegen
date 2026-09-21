// src/recorder-modules/context-menu.js

function _removeMenu() {
  document.getElementById('__wdio_assert_menu__')?.remove();
}

/**
 * Renders the right-click assertion context menu at (x, y).
 * All action callbacks are injected: the module knows only DOM.
 *
 * @param {{ x: number, y: number, locator: string, warn: boolean, text: string, isFormEl: boolean, isCheckable: boolean, currentValue: string, currentUrl: string, pageTitle: string, send: Function, showTextAssertForm: Function, showAttrAssertForm: Function }} opts
 */
export function showContextMenu({
  x, y, locator, warn, text,
  isFormEl, isCheckable, currentValue, currentUrl, pageTitle,
  send, showTextAssertForm, showAttrAssertForm,
}) {
  _removeMenu();

  const menu = document.createElement('div');
  menu.id = '__wdio_assert_menu__';
  menu.style.cssText = `position:fixed;top:${y}px;left:${x}px;
    background:white;border:1px solid #e2e8f0;border-radius:8px;
    box-shadow:0 4px 20px rgba(0,0,0,.10);font:12px -apple-system,sans-serif;
    min-width:230px;z-index:2147483647;overflow:hidden`;

  const header = document.createElement('div');
  header.style.cssText = 'padding:7px 12px;color:#94a3b8;font-size:10px;font-weight:600;background:#f8fafc;border-bottom:1px solid #f1f5f9;letter-spacing:.05em';
  header.textContent = 'ADD ASSERTION';
  menu.appendChild(header);

  const items = [
    ['Record right-click here', () => send({ type: 'rightClick', locator, _warn: warn })],
    ['Hover over element',      () => send({ type: 'moveTo', locator, _warn: warn })],
    ['Element is visible',      () => send({ type: 'assert:toBeDisplayed', locator, _warn: warn })],
    ['Element is NOT visible',  () => send({ type: 'assert:not:toBeDisplayed', locator, _warn: warn })],
    ['Text equals…',            () => { _removeMenu(); showTextAssertForm({ locator, text, warn, eventType: 'assert:toHaveText' }); }],
    ['Text contains…',          () => { _removeMenu(); showTextAssertForm({ locator, text, warn, eventType: 'assert:toHaveTextContaining' }); }],
    ['Text is NOT…',            () => { _removeMenu(); showTextAssertForm({ locator, text, warn, eventType: 'assert:not:toHaveText' }); }],
    ...(isFormEl ? [
      ['Value equals…',         () => { _removeMenu(); showTextAssertForm({ locator, text: currentValue, warn, eventType: 'assert:toHaveValue', title: 'Assert Value' }); }],
    ] : []),
    ['Attribute equals…',       () => {
      _removeMenu();
      showAttrAssertForm({ locator, warn });
    }],
    ['Element is in viewport',   () => send({ type: 'assert:toBeInViewport', locator, _warn: warn })],
    ['Element is enabled',      () => send({ type: 'assert:toBeEnabled', locator, _warn: warn })],
    ['Element is NOT enabled',  () => send({ type: 'assert:not:toBeEnabled', locator, _warn: warn })],
    ...(isCheckable ? [
      ['Element is checked',    () => send({ type: 'assert:toBeChecked', locator, _warn: warn })],
      ['Element is NOT checked', () => send({ type: 'assert:not:toBeChecked', locator, _warn: warn })],
    ] : []),
  ];

  items.forEach(([label, handler], i) => {
    const row = document.createElement('div');
    row.style.cssText = `padding:8px 12px;cursor:pointer;${i % 2 ? 'background:#f8fafc' : ''}`;
    row.textContent = label;
    row.onmouseenter = () => row.style.background = '#eff6ff';
    row.onmouseleave = () => row.style.background = i % 2 ? '#f8fafc' : '';
    row.onclick = () => { handler(); _removeMenu(); };
    menu.appendChild(row);
  });

  const footer = document.createElement('div');
  footer.style.cssText = 'padding:6px 12px;border-top:1px solid #f1f5f9;background:#f8fafc;display:flex;gap:12px;font-size:10px;color:#94a3b8';

  const urlBtn = document.createElement('span');
  urlBtn.style.cursor = 'pointer';
  urlBtn.textContent = '🌐 Assert URL';
  urlBtn.onclick = () => { send({ type: 'assert:toHaveUrl', url: currentUrl }); _removeMenu(); };

  const titleBtn = document.createElement('span');
  titleBtn.style.cursor = 'pointer';
  titleBtn.textContent = '📄 Assert Title';
  titleBtn.onclick = () => { send({ type: 'assert:toHaveTitle', value: pageTitle }); _removeMenu(); };

  footer.appendChild(urlBtn);
  footer.appendChild(titleBtn);
  menu.appendChild(footer);

  document.body.appendChild(menu);
  document.addEventListener('click', _removeMenu, { once: true });
}
