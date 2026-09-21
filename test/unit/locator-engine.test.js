import { describe, it, expect } from 'vitest';
import { getBestLocator, isGeneratedId, getLocatorCandidates } from '../../src/locator-engine.js';

const base = { tag: 'button', text: '', ariaLabel: '', id: '', idUnique: false, attrs: {}, xpath: '//button[1]' };

// The selector priority ladder is defined in src/locator-engine.js.

describe('getBestLocator', () => {
  // ── P1: data-testid / test-id attributes ─────────────────────────────────
  it('returns data-testid first (P1)', () => {
    const info = { ...base, tag: 'button', text: 'Submit', attrs: { 'data-testid': 'submit-btn' } };
    expect(getBestLocator(info)).toEqual({ locator: '[data-testid="submit-btn"]', warn: false });
  });

  it('data-testid wins over aria (P1 > P3)', () => {
    const info = { ...base, tag: 'input', ariaLabel: 'Email', attrs: { 'data-testid': 'email' } };
    expect(getBestLocator(info)).toEqual({ locator: '[data-testid="email"]', warn: false });
  });

  it('data-testid wins over unique #id (P1 > P2)', () => {
    const info = { ...base, tag: 'input', id: 'email-input', idUnique: true, attrs: { 'data-testid': 'email' } };
    expect(getBestLocator(info)).toEqual({ locator: '[data-testid="email"]', warn: false });
  });

  it('supports all test-id variants (P1)', () => {
    for (const attr of ['data-test', 'data-cy', 'data-pw', 'test-id']) {
      const info = { ...base, attrs: { [attr]: 'my-val' } };
      expect(getBestLocator(info)).toEqual({ locator: `[${attr}="my-val"]`, warn: false });
    }
  });

  // ── P2: unique #id ────────────────────────────────────────────────────────
  it('returns unique #id (P2)', () => {
    const info = { ...base, tag: 'input', id: 'email-input', idUnique: true };
    expect(getBestLocator(info)).toEqual({ locator: '#email-input', warn: false });
  });

  it('#id wins over placeholder/name/text/aria (P2 > P3/P4/P5)', () => {
    const info = {
      ...base, tag: 'input', id: 'email-input', idUnique: true,
      ariaLabel: 'Email', text: 'Email',
      attrs: { type: 'email', name: 'email', placeholder: 'Enter email' },
    };
    expect(getBestLocator(info)).toEqual({ locator: '#email-input', warn: false });
  });

  it('skips #id when not unique: falls through to next priority', () => {
    const info = { ...base, tag: 'div', id: 'section', idUnique: false, xpath: '//div[@id="section"][2]' };
    expect(getBestLocator(info)).toEqual({ locator: '//div[@id="section"][2]', warn: true });
  });

  // ── P4: stable semantic attributes ───────────────────────────────────────
  it('P4a: returns placeholder selector (no testid/id)', () => {
    const info = { ...base, tag: 'input', attrs: { placeholder: 'Enter email', type: 'text' } };
    expect(getBestLocator(info)).toEqual({ locator: 'input[placeholder="Enter email"]', warn: false });
  });

  it('P4a: placeholder wins over text= (P4a > P5) when no aria', () => {
    // aria/ is now P3: this test uses no ariaLabel to verify placeholder still works
    const info = {
      ...base, tag: 'input', text: 'Submit', ariaLabel: '',
      attrs: { placeholder: 'Enter email' },
    };
    expect(getBestLocator(info)).toEqual({ locator: 'input[placeholder="Enter email"]', warn: false });
  });

  it('P4b: returns img[alt] selector for images', () => {
    const info = { ...base, tag: 'img', attrs: { alt: 'Company logo' } };
    expect(getBestLocator(info)).toEqual({ locator: 'img[alt="Company logo"]', warn: false });
  });

  it('P4c: returns name attr selector (no testid/id/placeholder)', () => {
    const info = { ...base, tag: 'input', attrs: { name: 'email', type: 'text' } };
    expect(getBestLocator(info)).toEqual({ locator: 'input[name="email"]', warn: false });
  });

  it('P4c: returns combined name+value for radio inputs', () => {
    const info = { ...base, tag: 'input', attrs: { name: 'size', type: 'radio', value: 'large' } };
    expect(getBestLocator(info)).toEqual({ locator: 'input[name="size"][value="large"]', warn: false });
  });

  it('P4c: returns name selector without value for non-radio', () => {
    const info = { ...base, tag: 'input', attrs: { name: 'email', type: 'text', value: 'foo' } };
    expect(getBestLocator(info)).toEqual({ locator: 'input[name="email"]', warn: false });
  });

  it('P8: href returns warn:true (fragile URL locator)', () => {
    // href-only anchor: no stable alternative → href with warn (P8)
    const info = { ...base, tag: 'a', attrs: { href: '/dashboard' } };
    expect(getBestLocator(info)).toEqual({ locator: 'a[href="/dashboard"]', warn: true });
  });

  it('P4c (name) wins over text= and href (P4c > P5 > P8) when no aria', () => {
    // aria/ is P3: test without ariaLabel to verify name attr still works
    const info = { ...base, tag: 'input', text: 'Email', ariaLabel: '', attrs: { name: 'email' } };
    expect(getBestLocator(info)).toEqual({ locator: 'input[name="email"]', warn: false });
  });

  // ── P5: WDIO text selectors ───────────────────────────────────────────────
  it('P5: returns text selector for button with stable text', () => {
    const info = { ...base, tag: 'button', text: 'Submit' };
    expect(getBestLocator(info)).toEqual({ locator: 'button=Submit', warn: false });
  });

  it('P5: returns text selector for anchor', () => {
    const info = { ...base, tag: 'a', text: 'Home' };
    expect(getBestLocator(info)).toEqual({ locator: 'a=Home', warn: false });
  });

  it('P5: returns text selector for h1-h6 headings', () => {
    for (const tag of ['h1', 'h2', 'h3', 'h4', 'h5', 'h6']) {
      const info = { ...base, tag, text: 'Welcome' };
      expect(getBestLocator(info).locator).toBe(`${tag}=Welcome`);
    }
  });

  it('P5: text= fires after aria/ (P3 > P5) when no aria, text wins over role/type', () => {
    // aria/ is now P3: this tests text= fires when no ariaLabel is set
    const info = { ...base, tag: 'button', text: 'Submit', ariaLabel: '' };
    expect(getBestLocator(info)).toEqual({ locator: 'button=Submit', warn: false });
  });

  it('P5: skips text selector for non-interactive tags (div, span, td)', () => {
    // non-interactive tag + no other stable attrs → falls to xpath
    const info = { ...base, tag: 'div', text: 'Hello' };
    expect(getBestLocator(info)).toEqual({ locator: '//button[1]', warn: true });
  });

  it('P5: skips text selector when text is numeric/dynamic (falls to P2 #id)', () => {
    const info = { ...base, tag: 'button', text: '13.17', id: 'btn1', idUnique: true };
    expect(getBestLocator(info)).toEqual({ locator: '#btn1', warn: false });
  });

  it('P5: skips text selector when text is a date (falls to P2 #id)', () => {
    const info = { ...base, tag: 'button', text: '2024-01-15', id: 'btn1', idUnique: true };
    expect(getBestLocator(info)).toEqual({ locator: '#btn1', warn: false });
  });

  it('P5: skips text selector when text exceeds 40 chars (falls to P2 #id)', () => {
    const info = { ...base, tag: 'button', text: 'x'.repeat(41), id: 'btn1', idUnique: true };
    expect(getBestLocator(info)).toEqual({ locator: '#btn1', warn: false });
  });

  it('P5: returns text selector for Unicode text (Polish chars)', () => {
    const info = { ...base, tag: 'button', text: 'Łazienka' };
    expect(getBestLocator(info)).toEqual({ locator: 'button=Łazienka', warn: false });
  });

  it('P5: returns text selector for text with apostrophe', () => {
    const info = { ...base, tag: 'button', text: "O'Brien" };
    expect(getBestLocator(info)).toEqual({ locator: "button=O'Brien", warn: false });
  });

  it('P5: skips text with backslash (falls to P2 #id when available)', () => {
    const info = { ...base, tag: 'button', text: 'path\\file', id: 'btn1', idUnique: true };
    expect(getBestLocator(info)).toEqual({ locator: '#btn1', warn: false });
  });

  it('P5: skips text with backslash (falls to P3 aria when no id)', () => {
    const info = { ...base, tag: 'div', text: 'path\\file', ariaLabel: 'My Label' };
    expect(getBestLocator(info)).toEqual({ locator: 'aria/My Label', warn: false });
  });

  it('P5: skips text longer than 40 chars (falls to P3 aria when no id)', () => {
    const info = { ...base, tag: 'div', text: 'x'.repeat(41), ariaLabel: 'My Label' };
    expect(getBestLocator(info)).toEqual({ locator: 'aria/My Label', warn: false });
  });

  // ── P3: aria/ selector ───────────────────────────────────────────────────
  it('P3: returns aria/ when no testid/id/semantic-attr/text', () => {
    // Input with ariaLabel but no other stable locators
    const info = { ...base, tag: 'input', text: '', ariaLabel: 'Email address' };
    expect(getBestLocator(info)).toEqual({ locator: 'aria/Email address', warn: false });
  });

  it('P3: aria/ is fallback when #id also present (P2 wins)', () => {
    const info = { ...base, tag: 'input', text: '', ariaLabel: 'Email address', id: 'email', idUnique: true };
    expect(getBestLocator(info)).toEqual({ locator: '#email', warn: false });
  });

  // ── P6: role attribute ────────────────────────────────────────────────────
  // The [role][aria-label] combo in P6 is unreachable when ariaLabel is set: P3 (aria/)
  // always fires first. P6 only fires when the element has a role but no ariaLabel.

  it('P6: when ariaLabel present, P3 aria/ fires before P6 role', () => {
    // aria/ (P3) is preferred over the [role][aria-label] combo since P3 comes first
    const info = { ...base, tag: 'div', ariaLabel: 'Main nav', attrs: { role: 'navigation' } };
    expect(getBestLocator(info)).toEqual({ locator: 'aria/Main nav', warn: false });
  });

  it('P6: returns role alone with warn:true when no ariaLabel', () => {
    const info = { ...base, tag: 'div', attrs: { role: 'dialog' } };
    expect(getBestLocator(info)).toEqual({ locator: '[role="dialog"]', warn: true });
  });

  // ── P7: type attribute ────────────────────────────────────────────────────
  it('P7: returns type attr with warn:true as fallback', () => {
    const info = { ...base, tag: 'button', attrs: { type: 'submit' } };
    expect(getBestLocator(info)).toEqual({ locator: 'button[type="submit"]', warn: true });
  });

  // ── P9: CSS/XPath fallback ────────────────────────────────────────────────
  it('P9: returns xpath with warn:true as last resort', () => {
    const info = { ...base, tag: 'span', xpath: '//div[3]/span[1]' };
    expect(getBestLocator(info)).toEqual({ locator: '//div[3]/span[1]', warn: true });
  });

  // ── Shadow DOM ────────────────────────────────────────────────────────────
  // WebdriverIO v9+ automatically pierces Shadow DOM: no >>> syntax needed.
  // Standard selectors work across shadow boundaries as-is.
  // See: https://webdriver.io/docs/selectors/#deep-selectors

  it('shadowPath field is ignored: WDIO v9 auto-pierces Shadow DOM', () => {
    // Even when shadowPath is provided (legacy), no >>> is generated
    const info = {
      tag: 'input', text: '', ariaLabel: '', id: '', idUnique: false,
      attrs: { name: 'username' }, xpath: '//input[1]',
      shadowPath: ['my-component'], // ignored in v9+
    };
    const { locator, warn } = getBestLocator(info);
    // Standard selector: no >>> prefix
    expect(locator).toBe('input[name="username"]');
    expect(warn).toBe(false);
    expect(locator).not.toContain('>>>');
  });

  it('nested shadowPath also ignored: standard selector returned', () => {
    const info = {
      tag: 'input', text: '', ariaLabel: '', id: '', idUnique: false,
      attrs: {}, xpath: '//input[1]',
      shadowPath: ['outer-host', 'inner-host'], // ignored in v9+
    };
    const { locator, warn } = getBestLocator(info);
    // Falls through to xpath fallback: but still no >>>
    expect(locator).toBe('//input[1]');
    expect(warn).toBe(true);
    expect(locator).not.toContain('>>>');
  });

  it('no shadowPath: behavior unchanged', () => {
    const info = {
      tag: 'button', text: 'Submit', ariaLabel: '', id: '', idUnique: false,
      attrs: {}, xpath: '//button[1]',
    };
    const { locator } = getBestLocator(info);
    expect(locator).toBe('button=Submit');
  });

  it('warn:true selector inside shadow: no >>> generated', () => {
    const info = {
      tag: 'button', text: '', ariaLabel: '', id: '', idUnique: false,
      attrs: { type: 'submit' }, xpath: '//button[1]',
      shadowPath: ['my-component'], // ignored in v9+
    };
    const { locator, warn } = getBestLocator(info);
    expect(locator).toBe('button[type="submit"]');
    expect(warn).toBe(true);
    expect(locator).not.toContain('>>>');
  });
});

// ── isGeneratedId ────────────────────────────────────────────────────────────
describe('isGeneratedId', () => {
  // ── Should return true (generated, must NOT be used as #id locator) ───────

  describe('Radix / colon-style IDs', () => {
    it('rejects :r0: (bare colon ID)', () => expect(isGeneratedId(':r0:')).toBe(true));
    it('rejects radix-:r1:', () => expect(isGeneratedId('radix-:r1:')).toBe(true));
    it('rejects headlessui-menu-:r3:', () => expect(isGeneratedId('headlessui-menu-:r3:')).toBe(true));
  });

  describe('Known framework prefixes', () => {
    it('rejects mui-12345', () => expect(isGeneratedId('mui-12345')).toBe(true));
    it('rejects mui-components-1', () => expect(isGeneratedId('mui-components-1')).toBe(true));
    it('rejects headlessui-menu-item-15', () => expect(isGeneratedId('headlessui-menu-item-15')).toBe(true));
    it('rejects react-select-2-input', () => expect(isGeneratedId('react-select-2-input')).toBe(true));
    it('rejects floating-ui-5', () => expect(isGeneratedId('floating-ui-5')).toBe(true));
    it('rejects popper-10', () => expect(isGeneratedId('popper-10')).toBe(true));
    it('rejects rc-input-1', () => expect(isGeneratedId('rc-input-1')).toBe(true));
    it('rejects ant-tooltip-2', () => expect(isGeneratedId('ant-tooltip-2')).toBe(true));
    it('rejects el-button-1', () => expect(isGeneratedId('el-button-1')).toBe(true));
    it('rejects ember123', () => expect(isGeneratedId('ember123')).toBe(true));
    it('rejects __next-build-manifest', () => expect(isGeneratedId('__next-build-manifest')).toBe(true));
    it('rejects __relay-store-1', () => expect(isGeneratedId('__relay-store-1')).toBe(true));
  });

  describe('Pure numeric IDs', () => {
    it('rejects "123"', () => expect(isGeneratedId('123')).toBe(true));
    it('rejects "0"', () => expect(isGeneratedId('0')).toBe(true));
    it('rejects "99999"', () => expect(isGeneratedId('99999')).toBe(true));
  });

  describe('Trailing 3+ digit counters', () => {
    it('rejects menu-item-123', () => expect(isGeneratedId('menu-item-123')).toBe(true));
    it('rejects tooltip-999', () => expect(isGeneratedId('tooltip-999')).toBe(true));
    it('rejects dialog_456', () => expect(isGeneratedId('dialog_456')).toBe(true));
    it('rejects item-1000', () => expect(isGeneratedId('item-1000')).toBe(true));
  });

  // ── Should return false (stable, OK to use as #id locator) ───────────────

  describe('Semantic IDs: must NOT be rejected', () => {
    it('allows email-input', () => expect(isGeneratedId('email-input')).toBe(false));
    it('allows submit-btn', () => expect(isGeneratedId('submit-btn')).toBe(false));
    it('allows login-form', () => expect(isGeneratedId('login-form')).toBe(false));
    it('allows main-content', () => expect(isGeneratedId('main-content')).toBe(false));
    it('allows nav', () => expect(isGeneratedId('nav')).toBe(false));
    it('allows header', () => expect(isGeneratedId('header')).toBe(false));
    it('allows modal-overlay', () => expect(isGeneratedId('modal-overlay')).toBe(false));
    it('allows search-input', () => expect(isGeneratedId('search-input')).toBe(false));
  });

  describe('Single or double trailing digit (semantic page numbering)', () => {
    it('allows tab-1', () => expect(isGeneratedId('tab-1')).toBe(false));
    it('allows step-2', () => expect(isGeneratedId('step-2')).toBe(false));
    it('allows section-12', () => expect(isGeneratedId('section-12')).toBe(false));
    it('allows panel-99', () => expect(isGeneratedId('panel-99')).toBe(false));
  });

  describe('Embedded digit (not trailing counter)', () => {
    it('allows h1 (tag-like)', () => expect(isGeneratedId('h1')).toBe(false));
    it('allows step1', () => expect(isGeneratedId('step1')).toBe(false));
    it('allows form2-container', () => expect(isGeneratedId('form2-container')).toBe(false));
  });

  describe('Edge cases', () => {
    it('allows empty string', () => expect(isGeneratedId('')).toBe(false));
    it('allows undefined-like falsy', () => expect(isGeneratedId(null)).toBe(false));
  });
});

// ── P2 behaviour with generated IDs ─────────────────────────────────────────
describe('getBestLocator: P2 skips generated IDs', () => {
  it('skips mui- prefixed id even when unique: falls through to text=', () => {
    const info = { ...base, tag: 'button', text: 'Submit', id: 'mui-12345', idUnique: true };
    expect(getBestLocator(info)).toEqual({ locator: 'button=Submit', warn: false });
  });

  it('skips Radix colon-style id: falls through to aria/', () => {
    const info = { ...base, tag: 'div', ariaLabel: 'My Label', id: 'radix-:r0:', idUnique: true };
    expect(getBestLocator(info)).toEqual({ locator: 'aria/My Label', warn: false });
  });

  it('skips purely numeric id: falls to xpath', () => {
    const info = { ...base, tag: 'div', id: '123', idUnique: true, xpath: '//div[1]' };
    expect(getBestLocator(info)).toEqual({ locator: '//div[1]', warn: true });
  });

  it('uses stable semantic id when unique: P2 wins', () => {
    const info = { ...base, tag: 'input', id: 'email-input', idUnique: true };
    expect(getBestLocator(info)).toEqual({ locator: '#email-input', warn: false });
  });

  it('skips trailing-3-digit id: falls through to text=', () => {
    const info = { ...base, tag: 'button', text: 'Save', id: 'btn-999', idUnique: true };
    expect(getBestLocator(info)).toEqual({ locator: 'button=Save', warn: false });
  });

  it('allows tab-1 (1 trailing digit) as stable #id', () => {
    const info = { ...base, tag: 'div', id: 'tab-1', idUnique: true };
    expect(getBestLocator(info)).toEqual({ locator: '#tab-1', warn: false });
  });
});

// ── P1: custom testId attribute via second param ──────────────────────────────
describe('getBestLocator: custom testIdAttrs param', () => {
  it('uses custom attr list when provided', () => {
    const info = { ...base, tag: 'input', attrs: { 'data-qa': 'email-input' } };
    expect(getBestLocator(info, ['data-qa'])).toEqual({ locator: '[data-qa="email-input"]', warn: false });
  });

  it('falls through when custom attr not present on element', () => {
    const info = { ...base, tag: 'button', text: 'Submit', attrs: { 'data-testid': 'btn' } };
    // custom list ['data-qa']: data-testid is NOT in it, so P1 skips, falls to text=
    expect(getBestLocator(info, ['data-qa'])).toEqual({ locator: 'button=Submit', warn: false });
  });

  it('default behavior unchanged when no second param', () => {
    const info = { ...base, tag: 'input', attrs: { 'data-testid': 'email' } };
    expect(getBestLocator(info)).toEqual({ locator: '[data-testid="email"]', warn: false });
  });
});

// ── getLocatorCandidates: all viable locators ranked ─────────────────────────
describe('getLocatorCandidates', () => {
  it('returns array with best locator first', () => {
    const info = {
      tag: 'button', text: 'Submit', ariaLabel: 'Submit form',
      id: '', idUnique: false, attrs: { 'data-testid': 'submit-btn' }, xpath: '//button[1]',
    };
    const candidates = getLocatorCandidates(info);
    expect(Array.isArray(candidates)).toBe(true);
    expect(candidates.length).toBeGreaterThanOrEqual(3);
    expect(candidates[0].locator).toBe('[data-testid="submit-btn"]'); // P1 best
  });

  it('each candidate has locator, warn, label fields', () => {
    const info = { ...base, tag: 'button', text: 'Save', ariaLabel: 'Save document' };
    const candidates = getLocatorCandidates(info);
    for (const c of candidates) {
      expect(c).toHaveProperty('locator');
      expect(c).toHaveProperty('warn');
      expect(c).toHaveProperty('label');
      expect(typeof c.locator).toBe('string');
      expect(typeof c.warn).toBe('boolean');
      expect(typeof c.label).toBe('string');
    }
  });

  it('includes aria and text candidates when both present', () => {
    const info = { ...base, tag: 'button', text: 'Submit', ariaLabel: 'Submit form' };
    const candidates = getLocatorCandidates(info);
    expect(candidates.some(c => c.locator === 'aria/Submit form')).toBe(true);
    expect(candidates.some(c => c.locator === 'button=Submit')).toBe(true);
  });

  it('includes href as warn candidate (not no-warn)', () => {
    const info = { ...base, tag: 'a', text: 'Dashboard', attrs: { href: '/dashboard' } };
    const candidates = getLocatorCandidates(info);
    const hrefCandidate = candidates.find(c => c.locator.includes('href'));
    expect(hrefCandidate).toBeDefined();
    expect(hrefCandidate.warn).toBe(true);
  });

  it('does not duplicate locators', () => {
    const info = { ...base, tag: 'input', ariaLabel: 'Email', attrs: { 'data-testid': 'email', placeholder: 'Enter email' } };
    const candidates = getLocatorCandidates(info);
    const locators = candidates.map(c => c.locator);
    expect(new Set(locators).size).toBe(locators.length);
  });
});

// ── aria/ is P3, before placeholder, name and text ──────────────────────────
// An explicit accessibility label beats every semantic attribute.
describe('aria/ raised to P3', () => {
  const base8 = { tag: 'input', text: '', ariaLabel: '', id: '', idUnique: false, attrs: {}, xpath: '//input[1]' };

  it('aria/ wins over placeholder (P3 > P4a)', () => {
    const info = { ...base8, ariaLabel: 'Email field', attrs: { placeholder: 'Enter email' } };
    expect(getBestLocator(info)).toEqual({ locator: 'aria/Email field', warn: false });
  });

  it('aria/ wins over [name=...] (P3 > P4c)', () => {
    const info = { ...base8, ariaLabel: 'Email field', attrs: { name: 'email' } };
    expect(getBestLocator(info)).toEqual({ locator: 'aria/Email field', warn: false });
  });

  it('aria/ wins over text= (P3 > P5) on interactive tags', () => {
    const info = { tag: 'button', text: 'Submit', ariaLabel: 'Submit form', id: '', idUnique: false, attrs: {}, xpath: '//button' };
    expect(getBestLocator(info)).toEqual({ locator: 'aria/Submit form', warn: false });
  });

  it('aria/ wins over img[alt] (P3 > P4b)', () => {
    const info = { tag: 'img', text: '', ariaLabel: 'Company logo', id: '', idUnique: false, attrs: { alt: 'Logo image' }, xpath: '//img' };
    expect(getBestLocator(info)).toEqual({ locator: 'aria/Company logo', warn: false });
  });

  it('#id still beats aria/ (P2 > P3)', () => {
    const info = { ...base8, ariaLabel: 'Email', id: 'email-input', idUnique: true };
    expect(getBestLocator(info)).toEqual({ locator: '#email-input', warn: false });
  });

  it('testid still beats aria/ (P1 > P3)', () => {
    const info = { ...base8, ariaLabel: 'Email', attrs: { 'data-testid': 'email' } };
    expect(getBestLocator(info)).toEqual({ locator: '[data-testid="email"]', warn: false });
  });
});

// ── a[href] is P8 with warn:true ─────────────────────────────────────────────
// text= and aria/ win over it for anchors: URL-based locators are fragile.
describe('a[href] demoted to P8 (warn)', () => {
  const baseA = { tag: 'a', text: '', ariaLabel: '', id: '', idUnique: false, attrs: {}, xpath: '//a[1]' };

  it('href-only anchor returns warn:true (no stable alternative)', () => {
    const info = { ...baseA, attrs: { href: '/dashboard' } };
    expect(getBestLocator(info)).toEqual({ locator: 'a[href="/dashboard"]', warn: true });
  });

  it('text= wins over href for anchor (P5 > P8)', () => {
    const info = { ...baseA, text: 'Dashboard', attrs: { href: '/dashboard' } };
    expect(getBestLocator(info)).toEqual({ locator: 'a=Dashboard', warn: false });
  });

  it('aria/ wins over href for anchor (P3 > P8)', () => {
    const info = { ...baseA, ariaLabel: 'Go to dashboard', attrs: { href: '/dashboard' } };
    expect(getBestLocator(info)).toEqual({ locator: 'aria/Go to dashboard', warn: false });
  });

  it('testid beats href (P1 > P8)', () => {
    const info = { ...baseA, attrs: { href: '/page', 'data-testid': 'nav-link' } };
    expect(getBestLocator(info)).toEqual({ locator: '[data-testid="nav-link"]', warn: false });
  });

  it('#id beats href (P2 > P8)', () => {
    const info = { ...baseA, id: 'nav-home', idUnique: true, attrs: { href: '/' } };
    expect(getBestLocator(info)).toEqual({ locator: '#nav-home', warn: false });
  });
});
