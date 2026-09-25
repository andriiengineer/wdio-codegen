// Line terminators that end a JS string literal (and a `//` comment) if left raw.
// U+2028/U+2029 are line terminators in JS source even though they look like ordinary text.
const LINE_TERMINATORS = {
  '\n': '\\n',
  '\r': '\\r',
  '\t': '\\t',
  '\u2028': '\\u2028',
  '\u2029': '\\u2029',
};

/**
 * Escapes a page-supplied string for interpolation into a single-quoted JS string
 * literal in the generated test file.
 *
 * SECURITY: these values come from an untrusted page, and anything that can terminate
 * the literal, the line or the comment around it becomes code that runs when the spec
 * does. Escaping \ and ' alone is not enough: a raw newline ends the literal. Backticks
 * and ${ are escaped too, so the output survives a switch to a template literal.
 *
 * @param {unknown} str
 * @returns {string}
 */
export function escapeStr(str) {
  return String(str ?? '')
    .replace(/[\\'`]/g, (c) => '\\' + c)
    .replace(/\$\{/g, '\\${')
    .replace(/[\n\r\t\u2028\u2029]/g, (c) => LINE_TERMINATORS[c])
    // Remaining C0 controls and DEL: not breakouts by themselves, but they corrupt the
    // generated file and hide payloads from review.
    .replace(/[\x00-\x1f\x7f]/g, (c) => '\\x' + c.charCodeAt(0).toString(16).padStart(2, '0'));
}

export function generateLine(event) {
  const line = buildLine(event);
  // An iframe holds a separate document that $('iframe').$('#el') cannot reach.
  // browser.switchFrame() moves the whole command context inside until the switch back,
  // and only element commands need it: url, keys and alerts carry no locator.
  if (!line || !event._frame || !event.locator) return line;
  return `    await browser.switchFrame($('${escapeStr(event._frame)}'));\n`
    + `${line}\n`
    + `    await browser.switchFrame(null);`;
}

function buildLine(event) {
  const L = (loc) => `$('${escapeStr(loc)}')`;
  switch (event.type) {
    case 'navigate':
      if (!/^https?:/.test(event.url)) return null;
      return `    await browser.url('${escapeStr(event.url)}');`;
    case 'click':
      return `    await ${L(event.locator)}.click();`;
    case 'dblclick':
      return `    await ${L(event.locator)}.doubleClick();`;
    case 'setValue':
      return `    await ${L(event.locator)}.setValue('${escapeStr(event.value)}');`;
    case 'check':
    case 'uncheck':
      return `    await ${L(event.locator)}.click();`;
    case 'clearValue':
      return `    await ${L(event.locator)}.clearValue();`;
    case 'select': {
      // selectByAttribute('value', ...) is preferred when the option value is meaningful:
      // non-empty, non-numeric (numeric values are index-like), and different from the
      // visible text. It avoids locale-dependent text matching.
      const ov = event.optValue;
      const useAttr = ov && !/^\d+$/.test(ov) && ov !== event.value;
      return useAttr
        ? `    await ${L(event.locator)}.selectByAttribute('value', '${escapeStr(ov)}');`
        : `    await ${L(event.locator)}.selectByVisibleText('${escapeStr(event.value)}');`;
    }
    case 'keys': {
      // Modifier combination: event.keys is an array, e.g. ['Control', 'a']
      // Single key:           event.key  is a string,  e.g. 'Enter'
      // WDIO uses Key.Ctrl (cross-platform: Cmd on Mac, Ctrl on Win/Linux).
      if (event.keys) {
        const MODIFIER_MAP = { Control: 'Key.Ctrl', Meta: 'Key.Meta', Alt: 'Key.Alt', Shift: 'Key.Shift' };
        const parts = event.keys.map(k => MODIFIER_MAP[k] ?? `'${escapeStr(k)}'`);
        return `    await browser.keys([${parts.join(', ')}]);`;
      }
      return `    await browser.keys('${escapeStr(event.key)}');`;
    }
    case 'rightClick':
      return `    await ${L(event.locator)}.click({ button: 'right' });`;
    case 'openPage':
      return `    await browser.switchWindow('${escapeStr(event.url)}');`;
    case 'moveTo':
      return `    await ${L(event.locator)}.moveTo();`;
    // ── Positive assertions ─────────────────────────────────────────────────
    case 'assert:toBeDisplayed':
      return `    await expect(${L(event.locator)}).toBeDisplayed();`;
    case 'assert:toHaveText':
      return `    await expect(${L(event.locator)}).toHaveText('${escapeStr(event.value)}');`;
    case 'assert:toHaveTextContaining':
      return `    await expect(${L(event.locator)}).toHaveText('${escapeStr(event.value)}', { containing: true });`;
    case 'assert:toHaveAttr':
      return `    await expect(${L(event.locator)}).toHaveAttr('${escapeStr(event.attr)}', '${escapeStr(event.value)}');`;
    case 'assert:toBeEnabled':
      return `    await expect(${L(event.locator)}).toBeEnabled();`;
    case 'assert:toHaveValue':
      return `    await expect(${L(event.locator)}).toHaveValue('${escapeStr(event.value)}');`;
    case 'assert:toBeChecked':
      return `    await expect(${L(event.locator)}).toBeChecked();`;
    case 'assert:toBeInViewport':
      return `    await expect(${L(event.locator)}).toBeDisplayedInViewport();`;
    case 'assert:toHaveUrl':
      return `    await expect(browser).toHaveUrl('${escapeStr(event.url)}', { containing: true });`;
    case 'assert:toHaveTitle':
      return `    await expect(browser).toHaveTitle('${escapeStr(event.value)}');`;
    // ── Negative (not.) assertions ──────────────────────────────────────────
    case 'assert:not:toBeDisplayed':
      return `    await expect(${L(event.locator)}).not.toBeDisplayed();`;
    case 'assert:not:toHaveText':
      return `    await expect(${L(event.locator)}).not.toHaveText('${escapeStr(event.value)}');`;
    case 'assert:not:toBeEnabled':
      return `    await expect(${L(event.locator)}).not.toBeEnabled();`;
    case 'assert:not:toHaveValue':
      return `    await expect(${L(event.locator)}).not.toHaveValue('${escapeStr(event.value)}');`;
    case 'assert:not:toBeChecked':
      return `    await expect(${L(event.locator)}).not.toBeChecked();`;
    case 'dialog:alert':
    case 'dialog:accept':
      return `    await browser.acceptAlert();`;
    case 'dialog:dismiss':
      return `    await browser.dismissAlert();`;
    case 'dialog:prompt':
      return `    await browser.sendAlertText('${escapeStr(event.value)}');\n    await browser.acceptAlert();`;
    case 'uploadFile':
      // browser.uploadFile() transfers the file to the remote WebDriver machine and
      // returns the remote path that setValue() must receive.
      // Bare setValue('filename') does NOT work: WebDriver requires an absolute path.
      return `    // ⚠ uploadFile: replace with an absolute file path on the test runner machine\n    await ${L(event.locator)}.setValue(await browser.uploadFile('/path/to/${escapeStr(event.value)}'));`;
    case 'dragAndDrop':
      return `    await ${L(event.locator)}.dragAndDrop(${L(event.targetLocator)});`;
    case 'closePage':
      return `    await browser.closeWindow();`;
    case 'download':
      return `    // download: ${escapeStr(event.filename || 'file')}\n    await ${L(event.locator)}.click();`;
    default:
      return null;
  }
}

/**
 * Returns a human-readable one-line label for a recorded event.
 * Used by the Semantic Log tab in the Sidebar to show actions in plain language.
 *
 * @param {{ type: string, [key: string]: any }} event
 * @returns {string}
 */
export function getHumanLabel(event) {
  const loc = event.locator ? ` · ${event.locator}` : '';
  switch (event.type) {
    case 'navigate':     return `🌐 Navigate → ${event.url}`;
    case 'click':        return `🖱 Click${loc}`;
    case 'rightClick':   return `🖱 Right-click${loc}`;
    case 'dblclick':     return `🖱🖱 Double-click${loc}`;
    case 'check':        return `☑ Check${loc}`;
    case 'uncheck':      return `☐ Uncheck${loc}`;
    case 'setValue':     return `⌨ Fill${loc} → "${event.value}"`;
    case 'clearValue':   return `✕ Clear${loc}`;
    case 'select':       return `▼ Select${loc} → "${event.value}"`;
    case 'keys':         return `⌨ Keys · ${event.key ?? (event.keys || []).join('+')}`;
    case 'moveTo':       return `↗ Hover${loc}`;
    case 'uploadFile':   return `📁 Upload · ${event.value}`;
    case 'dragAndDrop':  return `↔ Drag${loc}`;
    case 'closePage':    return `✕ Close tab`;
    case 'openPage':     return `🗂 Switch tab → ${event.url}`;
    case 'download':     return `⬇ Download · ${event.filename || ''}`;
    // Positive assertions
    case 'assert:toBeDisplayed':     return `👁 Assert visible${loc}`;
    case 'assert:toHaveText':        return `T Assert text="${event.value}"${loc}`;
    case 'assert:toHaveTextContaining': return `T Assert contains "${event.value}"${loc}`;
    case 'assert:toHaveAttr':        return `@ Assert attr ${event.attr}="${event.value}"${loc}`;
    case 'assert:toBeEnabled':       return `✓ Assert enabled${loc}`;
    case 'assert:toBeChecked':       return `☑ Assert checked${loc}`;
    case 'assert:toBeInViewport':    return `📐 Assert in viewport${loc}`;
    case 'assert:toHaveValue':       return `= Assert value="${event.value}"${loc}`;
    case 'assert:toHaveUrl':         return `🌐 Assert URL contains "${event.url}"`;
    case 'assert:toHaveTitle':       return `📄 Assert title="${event.value}"`;
    // Negative assertions
    case 'assert:not:toBeDisplayed': return `👁✗ Assert not visible${loc}`;
    case 'assert:not:toHaveText':    return `T✗ Assert not text="${event.value}"${loc}`;
    case 'assert:not:toBeEnabled':   return `✗ Assert not enabled${loc}`;
    case 'assert:not:toHaveValue':   return `=✗ Assert not value="${event.value}"${loc}`;
    case 'assert:not:toBeChecked':   return `☐ Assert not checked${loc}`;
    // Dialogs
    case 'dialog:alert':
    case 'dialog:accept':  return `💬 Accept dialog`;
    case 'dialog:dismiss': return `💬 Dismiss dialog`;
    case 'dialog:prompt':  return `💬 Dialog input → "${event.value}"`;
    default:               return event.type;
  }
}
