export const TEST_ID_ATTRS = ['data-testid', 'data-test', 'data-cy', 'data-pw', 'test-id'];

// Tags where text= selector is reliable (interactive/semantic elements)
export const INTERACTIVE_TAGS = new Set(['button', 'a', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'th', 'label', 'option', 'li']);

// Reject numeric/dynamic text: pure numbers, currency, dates
export const DYNAMIC_TEXT_RE = /^[\d\s$€£¥,.%+\-()\/:]+$|(\d{4}[-\/]\d{2}[-\/]\d{2}|\d{1,2}[\/.-]\d{1,2}[\/.-]\d{2,4})/;

// Framework-generated ID prefixes that produce counter-based IDs not stable across renders.
// Design rule: when ambiguous, return false (allow the ID). A missed generated ID degrades
// selector quality; a falsely rejected semantic ID blocks locator generation entirely.
const GENERATED_ID_PREFIX_RE = /^(mui-|radix-|headlessui-|react-select-|floating-ui-|popper-|rc-|ant-|el-|ember|__next-|__relay-)/i;

/**
 * Returns true when an element ID is framework-generated and therefore unstable
 * across renders (counter changes, random hash, Radix colon-style, etc.).
 *
 * @param {string} id
 * @returns {boolean}
 */
export function isGeneratedId(id) {
  if (!id) return false;
  // Radix / HeadlessUI colon-style: ":r0:", "radix-:r1:", "headlessui-menu-:r3:"
  if (id.includes(':')) return true;
  // Known framework prefixes that append numeric counters
  if (GENERATED_ID_PREFIX_RE.test(id)) return true;
  // Purely numeric ID: always generated
  if (/^\d+$/.test(id)) return true;
  // Ends with separator + 3+ digits: "menu-item-123", "tooltip-99999"
  // (1-2 trailing digits are allowed: "tab-1", "step-12" can be semantic)
  if (/[-_]\d{3,}$/.test(id)) return true;
  return false;
}

/**
 * Selector priority (aligns with WebdriverIO-native philosophy):
 *
 *  P1: data-testid / data-test / data-cy / data-pw / test-id  (explicit test hooks)
 *  P2: unique stable #id                                       (CSS-native, fast)
 *  P3: aria/ selector                                          (explicit accessibility label, stable and descriptive)
 *  P4: stable semantic attributes                              (placeholder, img[alt], name)
 *         Note: P4b uses CSS attribute syntax [name="…"], NOT the deprecated WebDriver
 *         byName strategy. CSS attribute selectors are fully supported in WDIO v9+.
 *  P5: WDIO text selectors                                     (button=Save, a=Checkout)
 *  P6: role alone (warn: not unique without additional context)
 *  P7: type attribute (warn)
 *  P8: href attribute (warn, URLs are fragile: tokens, env-specific paths, query strings)
 *  P9: CSS/XPath fallback (warn)
 *
 * References:
 *   https://webdriver.io/docs/selectors/
 *   https://webdriver.io/docs/bestpractices/
 *
 * Note: Shadow DOM is NOT handled here. WebdriverIO v9+ automatically pierces
 * Shadow DOM boundaries: no >>> syntax needed. Standard selectors work as-is.
 *
 * @param {{ tag: string, text: string, ariaLabel: string, id: string,
 *           idUnique: boolean, attrs: Record<string,string>, xpath: string }} info
 * @returns {{ locator: string, warn: boolean }}
 */
export function getBestLocator(info, testIdAttrs = TEST_ID_ATTRS) {
  const { tag, text, ariaLabel, id, idUnique, attrs = {}, xpath } = info;

  let locator, warn;
  let found = false;

  // ── P1: test-id attributes (explicit test hooks, most stable) ────────────
  for (const attr of testIdAttrs) {
    if (attrs[attr]) { locator = `[${attr}="${attrs[attr]}"]`; warn = false; found = true; break; }
  }

  // ── P2: unique #id (CSS-native, fast, browser-native) ───────────────────
  // Skip IDs that are framework-generated (counter-based, colon-style, known prefixes).
  if (!found && id && idUnique && !isGeneratedId(id)) {
    locator = `#${id}`; warn = false; found = true;
  }

  // ── P3: aria/ selector (explicit accessibility label, stable and descriptive) ──
  if (!found && ariaLabel) {
    locator = `aria/${ariaLabel}`; warn = false; found = true;
  }

  // ── P4: stable semantic attributes ──────────────────────────────────────

  // P4a: placeholder (distinctive label for form inputs)
  if (!found && attrs.placeholder) {
    locator = `${tag}[placeholder="${attrs.placeholder}"]`; warn = false; found = true;
  }

  // P4b: img[alt] for images
  if (!found && tag === 'img' && attrs.alt) {
    locator = `img[alt="${attrs.alt}"]`; warn = false; found = true;
  }

  // P4c: name attribute as a CSS attribute selector, e.g. `input[name="email"]`
  // (not the deprecated WebDriver `byName` strategy). Radio buttons combine
  // name+value to pin down the specific option.
  if (!found && attrs.name) {
    if (tag === 'input' && attrs.type === 'radio' && attrs.value) {
      locator = `input[name="${attrs.name}"][value="${attrs.value}"]`; warn = false;
    } else {
      locator = `${tag}[name="${attrs.name}"]`; warn = false;
    }
    found = true;
  }

  // ── P5: WDIO text selectors (interactive/semantic tags, stable text) ────
  // "Best. Resembles how the user interacts with the page and is fast."
  // See webdriver.io/docs/selectors/
  if (!found) {
    const trimmed = (text || '').trim();
    if (
      trimmed.length > 0 &&
      trimmed.length <= 40 &&
      INTERACTIVE_TAGS.has(tag) &&
      !DYNAMIC_TEXT_RE.test(trimmed) &&
      !/[\\\x00-\x1F<>]/.test(trimmed)
    ) {
      locator = `${tag}=${trimmed}`; warn = false; found = true;
    }
  }

  // ── P6: role attribute (warn: not unique without additional context) ───────
  if (!found && attrs.role) {
    locator = `[role="${attrs.role}"]`; warn = true; found = true;
  }

  // ── P7: type attribute (potentially non-unique, warn) ────────────────────
  if (!found && attrs.type) {
    locator = `${tag}[type="${attrs.type}"]`; warn = true; found = true;
  }

  // ── P8: href attribute (warn, URLs are fragile: env-specific, may contain tokens) ────
  // href values change across environments and can carry auth tokens, session IDs or
  // query strings, so text= (P5) or aria/ (P3) are preferred for navigable anchors.
  if (!found && attrs.href) {
    locator = `a[href="${attrs.href}"]`; warn = true; found = true;
  }

  // ── P9: CSS/XPath fallback (last resort, warn) ───────────────────────────
  if (!found) {
    locator = xpath; warn = true;
  }

  return { locator, warn };
}

/**
 * Returns ALL viable locator candidates for an element, ordered by priority (best first).
 * Used by the Sidebar to offer alternative locators the user can choose from.
 *
 * Each candidate: { locator: string, warn: boolean, label: string }
 *
 * @param {{ tag: string, text: string, ariaLabel: string, id: string,
 *           idUnique: boolean, attrs: Record<string,string>, xpath: string }} info
 * @param {string[]} [testIdAttrs] - custom test-id attribute list (default: TEST_ID_ATTRS)
 * @returns {{ locator: string, warn: boolean, label: string }[]}
 */
export function getLocatorCandidates(info, testIdAttrs = TEST_ID_ATTRS) {
  const { tag, text, ariaLabel, id, idUnique, attrs = {}, xpath } = info;
  const candidates = [];
  const seen = new Set();

  function add(locator, warn, label) {
    if (!locator || seen.has(locator)) return;
    seen.add(locator);
    candidates.push({ locator, warn, label });
  }

  // P1: test-id
  for (const attr of testIdAttrs) {
    if (attrs[attr]) add(`[${attr}="${attrs[attr]}"]`, false, `test-id (${attr})`);
  }

  // P2: unique #id
  if (id && idUnique && !isGeneratedId(id)) add(`#${id}`, false, '#id');

  // P3: aria/
  if (ariaLabel) add(`aria/${ariaLabel}`, false, 'aria-label');

  // P4a: placeholder
  if (attrs.placeholder) add(`${tag}[placeholder="${attrs.placeholder}"]`, false, 'placeholder');

  // P4b: img[alt]
  if (tag === 'img' && attrs.alt) add(`img[alt="${attrs.alt}"]`, false, 'alt');

  // P4c: name
  if (attrs.name) {
    if (tag === 'input' && attrs.type === 'radio' && attrs.value) {
      add(`input[name="${attrs.name}"][value="${attrs.value}"]`, false, 'name+value');
    } else {
      add(`${tag}[name="${attrs.name}"]`, false, 'name');
    }
  }

  // P5: text=
  const trimmed = (text || '').trim();
  if (trimmed.length > 0 && trimmed.length <= 40 && INTERACTIVE_TAGS.has(tag) &&
      !DYNAMIC_TEXT_RE.test(trimmed) && !/[\\\x00-\x1F<>]/.test(trimmed)) {
    add(`${tag}=${trimmed}`, false, 'text');
  }

  // P8: href (warn)
  if (attrs.href) add(`a[href="${attrs.href}"]`, true, 'href (fragile)');

  // P9: xpath (warn)
  if (xpath) add(xpath, true, 'xpath');

  return candidates;
}
