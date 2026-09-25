import { describe, it, expect } from 'vitest';
import { generateLine, escapeStr, getHumanLabel } from '../../src/codegen.js';

describe('generateLine', () => {
  it('navigate', () => {
    expect(generateLine({ type: 'navigate', url: 'https://app.com' }))
      .toBe(`    await browser.url('https://app.com');`);
  });

  it('click', () => {
    expect(generateLine({ type: 'click', locator: 'button=Submit' }))
      .toBe(`    await $('button=Submit').click();`);
  });

  it('dblclick', () => {
    expect(generateLine({ type: 'dblclick', locator: 'div=item' }))
      .toBe(`    await $('div=item').doubleClick();`);
  });

  it('check', () => {
    // WebdriverIO has no check(); a click toggles the box
    expect(generateLine({ type: 'check', locator: 'input[name="agree"]' }))
      .toBe(`    await $('input[name="agree"]').click();`);
  });

  it('uncheck', () => {
    expect(generateLine({ type: 'uncheck', locator: '#newsletter' }))
      .toBe(`    await $('#newsletter').click();`);
  });

  it('setValue', () => {
    expect(generateLine({ type: 'setValue', locator: 'aria/Email', value: "user@test.com" }))
      .toBe(`    await $('aria/Email').setValue('user@test.com');`);
  });

  it('setValue escapes single quotes', () => {
    expect(generateLine({ type: 'setValue', locator: 'aria/Name', value: "O'Brien" }))
      .toBe(`    await $('aria/Name').setValue('O\\'Brien');`);
  });

  it('clearValue', () => {
    expect(generateLine({ type: 'clearValue', locator: 'aria/Email' }))
      .toBe(`    await $('aria/Email').clearValue();`);
  });

  describe('select', () => {
    it('no optValue → selectByVisibleText (backward compat)', () => {
      expect(generateLine({ type: 'select', locator: 'select#country', value: 'Ukraine' }))
        .toBe(`    await $('select#country').selectByVisibleText('Ukraine');`);
    });

    it('semantic optValue (non-numeric, differs from text) → selectByAttribute', () => {
      expect(generateLine({ type: 'select', locator: 'select#size', value: 'Large', optValue: 'large' }))
        .toBe(`    await $('select#size').selectByAttribute('value', 'large');`);
    });

    it('semantic optValue with dashes/underscores → selectByAttribute', () => {
      expect(generateLine({ type: 'select', locator: 'select#currency', value: 'US Dollar', optValue: 'USD' }))
        .toBe(`    await $('select#currency').selectByAttribute('value', 'USD');`);
    });

    it('numeric optValue (index-like) → selectByVisibleText', () => {
      expect(generateLine({ type: 'select', locator: 'select#month', value: 'January', optValue: '1' }))
        .toBe(`    await $('select#month').selectByVisibleText('January');`);
    });

    it('empty optValue → selectByVisibleText', () => {
      expect(generateLine({ type: 'select', locator: 'select#x', value: 'Please select', optValue: '' }))
        .toBe(`    await $('select#x').selectByVisibleText('Please select');`);
    });

    it('optValue === value → selectByVisibleText (no benefit from selectByAttribute)', () => {
      expect(generateLine({ type: 'select', locator: 'select#x', value: 'Apple', optValue: 'Apple' }))
        .toBe(`    await $('select#x').selectByVisibleText('Apple');`);
    });

    it('escapes single quotes in optValue', () => {
      expect(generateLine({ type: 'select', locator: 'select#x', value: "O'Brien", optValue: "o-brien" }))
        .toBe(`    await $('select#x').selectByAttribute('value', 'o-brien');`);
    });
  });

  describe('keys', () => {
    it('single key: scalar string', () => {
      expect(generateLine({ type: 'keys', key: 'Enter' }))
        .toBe(`    await browser.keys('Enter');`);
    });

    it('Ctrl+A combination', () => {
      expect(generateLine({ type: 'keys', keys: ['Control', 'a'] }))
        .toBe(`    await browser.keys([Key.Ctrl, 'a']);`);
    });

    it('Meta+K combination (Cmd+K on Mac)', () => {
      expect(generateLine({ type: 'keys', keys: ['Meta', 'k'] }))
        .toBe(`    await browser.keys([Key.Meta, 'k']);`);
    });

    it('Shift+Tab (reverse tab navigation)', () => {
      expect(generateLine({ type: 'keys', keys: ['Shift', 'Tab'] }))
        .toBe(`    await browser.keys([Key.Shift, 'Tab']);`);
    });

    it('Ctrl+Shift+Z (redo)', () => {
      expect(generateLine({ type: 'keys', keys: ['Control', 'Shift', 'z'] }))
        .toBe(`    await browser.keys([Key.Ctrl, Key.Shift, 'z']);`);
    });

    it('Alt+F4', () => {
      expect(generateLine({ type: 'keys', keys: ['Alt', 'F4'] }))
        .toBe(`    await browser.keys([Key.Alt, 'F4']);`);
    });

    it('escapes single quotes in key name', () => {
      // Edge case: exotic key values
      expect(generateLine({ type: 'keys', key: "it's" }))
        .toBe(`    await browser.keys('it\\'s');`);
    });
  });

  it('moveTo', () => {
    expect(generateLine({ type: 'moveTo', locator: 'aria/Menu' }))
      .toBe(`    await $('aria/Menu').moveTo();`);
  });

  it('assert:toBeDisplayed', () => {
    expect(generateLine({ type: 'assert:toBeDisplayed', locator: 'aria/Header' }))
      .toBe(`    await expect($('aria/Header')).toBeDisplayed();`);
  });

  it('assert:toHaveText', () => {
    expect(generateLine({ type: 'assert:toHaveText', locator: 'h1=Hello', value: 'Hello' }))
      .toBe(`    await expect($('h1=Hello')).toHaveText('Hello');`);
  });

  it('assert:toHaveTextContaining', () => {
    expect(generateLine({ type: 'assert:toHaveTextContaining', locator: 'aria/Nav', value: 'Home' }))
      .toBe(`    await expect($('aria/Nav')).toHaveText('Home', { containing: true });`);
  });

  it('assert:toHaveAttr', () => {
    expect(generateLine({ type: 'assert:toHaveAttr', locator: 'aria/Link', attr: 'href', value: '/home' }))
      .toBe(`    await expect($('aria/Link')).toHaveAttr('href', '/home');`);
  });

  it('assert:toBeEnabled', () => {
    expect(generateLine({ type: 'assert:toBeEnabled', locator: 'button=Save' }))
      .toBe(`    await expect($('button=Save')).toBeEnabled();`);
  });

  it('assert:toHaveValue', () => {
    expect(generateLine({ type: 'assert:toHaveValue', locator: 'aria/Email', value: 'user@test.com' }))
      .toBe(`    await expect($('aria/Email')).toHaveValue('user@test.com');`);
  });


  it('assert:toHaveUrl asserts containment, not equality', () => {
    expect(generateLine({ type: 'assert:toHaveUrl', url: '/dashboard' }))
      .toBe(`    await expect(browser).toHaveUrl('/dashboard', { containing: true });`);
  });

  it('assert:toHaveTitle', () => {
    expect(generateLine({ type: 'assert:toHaveTitle', value: 'Dashboard' }))
      .toBe(`    await expect(browser).toHaveTitle('Dashboard');`);
  });

  it('dialog:alert generates acceptAlert', () => {
    expect(generateLine({ type: 'dialog:alert', message: 'Are you sure?', _warn: true }))
      .toBe(`    await browser.acceptAlert();`);
  });

  it('dialog:accept generates acceptAlert', () => {
    expect(generateLine({ type: 'dialog:accept', message: 'Confirm?', _warn: true }))
      .toBe(`    await browser.acceptAlert();`);
  });

  it('dialog:dismiss generates dismissAlert', () => {
    expect(generateLine({ type: 'dialog:dismiss', message: 'Confirm?', _warn: true }))
      .toBe(`    await browser.dismissAlert();`);
  });

  it('dialog:prompt generates sendAlertText and acceptAlert', () => {
    expect(generateLine({ type: 'dialog:prompt', message: 'Enter name:', value: 'Alice', _warn: true }))
      .toBe(`    await browser.sendAlertText('Alice');\n    await browser.acceptAlert();`);
  });

  it('dialog:prompt escapes single quotes in value', () => {
    expect(generateLine({ type: 'dialog:prompt', message: 'Enter:', value: "O'Brien", _warn: true }))
      .toBe(`    await browser.sendAlertText('O\\'Brien');\n    await browser.acceptAlert();`);
  });

  describe('uploadFile', () => {
    it('generates browser.uploadFile() + setValue: correct WDIO pattern', () => {
      const line = generateLine({ type: 'uploadFile', locator: 'input[type="file"]', value: 'report.pdf' });
      expect(line).toContain('browser.uploadFile(');
      expect(line).toContain('report.pdf');  // filename present (inside the path)
      expect(line).toContain('.setValue(');
    });

    it('does NOT generate bare setValue with filename: old broken pattern', () => {
      const line = generateLine({ type: 'uploadFile', locator: 'input[type="file"]', value: 'report.pdf' });
      expect(line).not.toBe(`    await $('input[type="file"]').setValue('report.pdf');`);
    });

    it('escapes single quotes in filename', () => {
      const line = generateLine({ type: 'uploadFile', locator: 'input[type="file"]', value: "O'Brien CV.pdf" });
      expect(line).toContain("O\\'Brien CV.pdf");
      expect(line).toContain('browser.uploadFile(');
    });
  });

  it('click inside iframe switches frame context', () => {
    // $('iframe').$('el') does not cross the document boundary; switchFrame does.
    expect(generateLine({ type: 'click', locator: 'button=Login', _frame: '#payment-frame' }))
      .toBe([
        `    await browser.switchFrame($('#payment-frame'));`,
        `    await $('button=Login').click();`,
        `    await browser.switchFrame(null);`,
      ].join('\n'));
  });

  it('browser-level events are not wrapped in switchFrame', () => {
    expect(generateLine({ type: 'assert:toHaveUrl', url: 'https://x.com/', _frame: '#f' }))
      .toBe(`    await expect(browser).toHaveUrl('https://x.com/', { containing: true });`);
  });

  it('dragAndDrop', () => {
    expect(generateLine({ type: 'dragAndDrop', locator: '.drag-item', targetLocator: '.drop-zone' }))
      .toBe(`    await $('.drag-item').dragAndDrop($('.drop-zone'));`);
  });

  it('closePage', () => {
    expect(generateLine({ type: 'closePage' })).toBe(`    await browser.closeWindow();`);
  });

  it('download', () => {
    const line = generateLine({ type: 'download', locator: 'a=Download', filename: 'report.pdf' });
    expect(line).toContain('await $');
    expect(line).toContain('.click()');
    expect(line).toContain('// download:');
  });

  it('returns null for unknown event type', () => {
    expect(generateLine({ type: 'unknown' })).toBeNull();
  });

  // ── toBeChecked ───────────────────────────────────────────────────────────
  describe('assert:toBeChecked', () => {
    it('generates toBeChecked()', () => {
      expect(generateLine({ type: 'assert:toBeChecked', locator: 'input[name="agree"]' }))
        .toBe(`    await expect($('input[name="agree"]')).toBeChecked();`);
    });
    it('generates not.toBeChecked()', () => {
      expect(generateLine({ type: 'assert:not:toBeChecked', locator: '#newsletter' }))
        .toBe(`    await expect($('#newsletter')).not.toBeChecked();`);
    });
  });

  // ── P2: not. modifier assertions ─────────────────────────────────────────
  describe('assert:not:* negative assertions', () => {
    it('not.toBeDisplayed()', () => {
      expect(generateLine({ type: 'assert:not:toBeDisplayed', locator: 'aria/Error banner' }))
        .toBe(`    await expect($('aria/Error banner')).not.toBeDisplayed();`);
    });
    it('not.toHaveText()', () => {
      expect(generateLine({ type: 'assert:not:toHaveText', locator: 'h1=Hello', value: 'Error' }))
        .toBe(`    await expect($('h1=Hello')).not.toHaveText('Error');`);
    });
    it('not.toBeEnabled()', () => {
      expect(generateLine({ type: 'assert:not:toBeEnabled', locator: 'button=Save' }))
        .toBe(`    await expect($('button=Save')).not.toBeEnabled();`);
    });
    it('not.toHaveValue()', () => {
      expect(generateLine({ type: 'assert:not:toHaveValue', locator: 'aria/Email', value: '' }))
        .toBe(`    await expect($('aria/Email')).not.toHaveValue('');`);
    });
    it('escapes single quotes in not.toHaveText', () => {
      expect(generateLine({ type: 'assert:not:toHaveText', locator: 'h1=Hi', value: "O'Brien" }))
        .toBe(`    await expect($('h1=Hi')).not.toHaveText('O\\'Brien');`);
    });
  });
});

// ── getHumanLabel: semantic log labels ────────────────────────────────────
describe('getHumanLabel', () => {
  it('navigate → readable URL label', () => {
    expect(getHumanLabel({ type: 'navigate', url: 'https://app.com' })).toContain('Navigate');
    expect(getHumanLabel({ type: 'navigate', url: 'https://app.com' })).toContain('app.com');
  });
  it('click → readable label', () => {
    const label = getHumanLabel({ type: 'click', locator: 'button=Submit' });
    expect(label).toContain('Click');
    expect(label).toContain('button=Submit');
  });
  it('setValue → Fill label', () => {
    const label = getHumanLabel({ type: 'setValue', locator: 'aria/Email', value: 'user@test.com' });
    expect(label).toContain('Fill');
    expect(label).toContain('user@test.com');
  });
  it('assert:toBeDisplayed → Assert visible label', () => {
    expect(getHumanLabel({ type: 'assert:toBeDisplayed', locator: 'aria/Header' })).toContain('Assert');
  });
  it('assert:toBeChecked → Assert checked label', () => {
    expect(getHumanLabel({ type: 'assert:toBeChecked', locator: '#cb' })).toContain('Assert');
  });
  it('assert:not:toBeDisplayed → not-visible label', () => {
    const label = getHumanLabel({ type: 'assert:not:toBeDisplayed', locator: 'aria/Error' });
    expect(label).toContain('not');
  });
  it('unknown type → returns the type string', () => {
    expect(getHumanLabel({ type: 'foo:bar' })).toBeTruthy();
  });
});

describe('escapeStr', () => {
  it('escapes single quotes', () => {
    expect(escapeStr("it's")).toBe("it\\'s");
  });
  it('escapes backslashes', () => {
    expect(escapeStr('path\\file')).toBe('path\\\\file');
  });
});

// ── Code-injection regression suite ───────────────────────────────────────────
// Every value reaching generateLine comes from an untrusted page. A value that can
// terminate the string literal / line / comment it is placed in turns the generated
// spec into arbitrary code executed on the QA engineer's machine at `npm test`.
// See src/codegen.js:escapeStr.

/** Parses a generated line as JS. Throws if the payload broke out of its literal. */
const parseLine = (line) => new Function(`return async () => {\n${line}\n};`);

/** Runs a generated line with stubs, recording every call. Never executes page payloads. */
const runLine = async (line) => {
  const calls = [];
  // `then` must stay undefined: an awaited chainable proxy would otherwise look like a
  // thenable and hang forever.
  const el = new Proxy({}, {
    get: (_, m) => m === 'then' ? undefined : (...a) => { calls.push([m, ...a]); return el; },
  });
  const $ = () => el;
  const browser = new Proxy({}, { get: (_, m) => (...a) => { calls.push(['browser.' + m, ...a]); } });
  const expectFn = () => new Proxy({}, {
    get: (t, m) => m === 'then' ? undefined
      : m === 'not' ? expectFn()
      : ((...a) => calls.push(['expect.' + String(m), ...a])),
  });
  const Key = new Proxy({}, { get: (_, k) => `Key.${String(k)}` });
  await new Function('$', 'browser', 'expect', 'Key',
    `return async () => {\n${line}\n};`)($, browser, expectFn, Key)();
  return calls;
};

const BREAKOUTS = {
  newline: "x\n    await browser.execute('PWNED');//",
  carriageReturn: "x\r    await browser.execute('PWNED');//",
  quote: "x'); await browser.execute('PWNED'); ('",
  backslashQuote: "x\\'); await browser.execute('PWNED'); ('",
  backtick: 'x`); await browser.execute(`PWNED`); (`',
  templateExpr: 'x${await browser.execute("PWNED")}',
  lineSeparator: 'x\u2028    await browser.execute(\'PWNED\');//',
  paragraphSeparator: 'x\u2029    await browser.execute(\'PWNED\');//',
};

describe('escapeStr: code injection', () => {
  for (const [name, payload] of Object.entries(BREAKOUTS)) {
    it(`neutralises ${name}`, () => {
      const escaped = escapeStr(payload);
      expect(escaped).not.toMatch(/[\n\r\u2028\u2029]/);
      // The literal must stay closed: no unescaped quote survives.
      expect(() => new Function(`return '${escaped}';`)).not.toThrow();
      expect(new Function(`return '${escaped}';`)()).toBe(payload);
    });
  }

  it('coerces null/undefined instead of throwing', () => {
    expect(escapeStr(undefined)).toBe('');
    expect(escapeStr(null)).toBe('');
  });

  it('escapes control characters', () => {
    expect(escapeStr('a\x00b\x07c')).toBe('a\\x00b\\x07c');
  });
});

describe('generateLine: code injection', () => {
  // Vector 1: the `download` filename lands in a `//` comment, and a raw newline ends
  // the comment and the rest of the payload becomes a statement.
  it('download filename cannot escape the comment', async () => {
    const line = generateLine({
      type: 'download', locator: 'a=Download', filename: BREAKOUTS.newline,
    });
    expect(() => parseLine(line)).not.toThrow();
    const calls = await runLine(line);
    expect(calls).toEqual([['click']]);
  });

  // Vector 2: assert:toHaveAttr used to interpolate event.attr with no escaping at all.
  it('assert:toHaveAttr escapes the attribute name', async () => {
    const line = generateLine({
      type: 'assert:toHaveAttr', locator: 'a', attr: BREAKOUTS.quote, value: 'v',
    });
    const calls = await runLine(line);
    expect(calls).toEqual([['expect.toHaveAttr', BREAKOUTS.quote, 'v']]);
  });

  // Every string-bearing event type must survive every payload.
  const CASES = [
    (p) => ({ type: 'setValue', locator: 'input', value: p }),
    (p) => ({ type: 'setValue', locator: p, value: 'v' }),
    (p) => ({ type: 'click', locator: 'a', _frame: p }),
    (p) => ({ type: 'select', locator: 's', value: p }),
    (p) => ({ type: 'select', locator: 's', value: 'v', optValue: p }),
    (p) => ({ type: 'keys', key: p }),
    (p) => ({ type: 'keys', keys: ['Control', p] }),
    (p) => ({ type: 'openPage', url: p }),
    (p) => ({ type: 'assert:toHaveText', locator: 'a', value: p }),
    (p) => ({ type: 'assert:toHaveTextContaining', locator: 'a', value: p }),
    (p) => ({ type: 'assert:toHaveValue', locator: 'a', value: p }),
    (p) => ({ type: 'assert:toHaveTitle', value: p }),
    (p) => ({ type: 'assert:toHaveUrl', url: p }),
    (p) => ({ type: 'assert:not:toHaveText', locator: 'a', value: p }),
    (p) => ({ type: 'assert:not:toHaveValue', locator: 'a', value: p }),
    (p) => ({ type: 'dialog:prompt', value: p }),
    (p) => ({ type: 'uploadFile', locator: 'input', value: p }),
    (p) => ({ type: 'dragAndDrop', locator: 'a', targetLocator: p }),
    (p) => ({ type: 'download', locator: 'a', filename: p }),
  ];

  for (const [name, payload] of Object.entries(BREAKOUTS)) {
    it(`no event type lets ${name} break out`, async () => {
      for (const make of CASES) {
        const event = make(payload);
        const line = generateLine(event);
        expect(line, `${event.type} produced no line`).toBeTruthy();
        expect(() => parseLine(line), `${event.type} / ${name}`).not.toThrow();
        // The payload may legitimately appear as *data* in an argument; what must never
        // happen is it becoming a *call* of its own.
        const calls = await runLine(line);
        const executed = calls.map(c => String(c[0])).filter(m => /execute/.test(m));
        expect(executed, `${event.type} / ${name}`).toEqual([]);
      }
    });
  }

  it('navigate still rejects non-http schemes', () => {
    expect(generateLine({ type: 'navigate', url: 'javascript:alert(1)' })).toBeNull();
  });
});
