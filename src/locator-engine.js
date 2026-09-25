export const TEST_ID_ATTRS = ['data-testid', 'data-test', 'data-cy', 'data-pw', 'test-id'];

// Tags where text= selector is reliable (interactive/semantic elements)
export const INTERACTIVE_TAGS = new Set(['button', 'a', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'th', 'label', 'option', 'li']);

// Reject numeric/dynamic text: pure numbers, currency, dates
export const DYNAMIC_TEXT_RE = /^[\d\s$€£¥,.%+\-()\/:]+$|(\d{4}[-\/]\d{2}[-\/]\d{2}|\d{1,2}[\/.-]\d{1,2}[\/.-]\d{2,4})/;

// Framework-generated ID prefixes that produce counter-based IDs not stable across renders.
// Design rule: when ambiguous, return false (allow the ID). A missed generated ID degrades
// selector quality; a falsely rejected semantic ID blocks locator generation entirely.
const GENERATED_ID_PREFIX_RE = /^(mui-|radix-|headlessui-|react-select-|floating-ui-|popper-|rc-|ant-|el-|ember|__next-|__relay-)/i;

/** Escapes a value for a double-quoted CSS attribute selector `[attr="…"]`. */
export function cssAttr(value) {
  return String(value)
    .replace(/["\\]/g, '\\$&')
    .replace(/[\n\r\f]/g, (c) => `\\${c.charCodeAt(0).toString(16)} `);
}

function idSelector(id) {
  return /^-?[A-Za-z_][\w-]*$/.test(id) ? `#${id}` : `[id="${cssAttr(id)}"]`;
}

/** WebdriverIO treats a selector ending in an image extension as an image-file selector. */
export function isWdioImageSelector(selector) {
  return /\.(jpe?g|gif|png|bmp|svg)$/i.test(selector);
}

// aria/ and tag=text go into an XPath string literal, which cannot escape `"`.
function isWdioSafeValue(value) {
  return !value.includes('"') && !isWdioImageSelector(value);
}

/** The XPath WebdriverIO 9 builds for `aria/…` and `tag=text` (findStrategy); null for CSS. */
export function toWdioXPath(locator) {
  return wdioXPathBranches(locator)?.join(' | ') ?? null;
}

export function wdioXPathBranches(locator) {
  if (locator.startsWith('aria/')) {
    const l = locator.slice('aria/'.length);
    return [
      `.//*[@aria-labelledby=(//*[normalize-space(text()) = "${l}"]/@id)]`,
      `.//*[@aria-describedby=(//*[normalize-space(text()) = "${l}"]/@id)]`,
      `.//*[@aria-label = "${l}"]`,
      `.//input[@id = (//label[normalize-space() = "${l}"]/@for)]`,
      `.//textarea[@id = (//label[normalize-space() = "${l}"]/@for)]`,
      `.//input[ancestor::label[normalize-space(text()) = "${l}"]]`,
      `.//textarea[ancestor::label[normalize-space(text()) = "${l}"]]`,
      `.//input[@placeholder="${l}"]`,
      `.//textarea[@placeholder="${l}"]`,
      `.//input[@aria-placeholder="${l}"]`,
      `.//textarea[@aria-placeholder="${l}"]`,
      `.//*[not(self::label)][@title="${l}"]`,
      `.//img[@alt="${l}"]`,
      `.//*[not(self::label)][normalize-space(text()) = "${l}"]`,
    ];
  }
  const m = locator.match(/^(\w+)=(.+)$/);
  if (!m) return null;
  const [, tag, text] = m;
  const own = `.//${tag}[normalize-space(text()) = "${text}"]`;
  return [own, `.//${tag}[not(${own}) and normalize-space() = "${text}"]`];
}

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
 * Returns ALL viable locator candidates for an element, ordered by priority (best first).
 * Each candidate: { locator, warn, label }.
 *
 * Selector priority (aligns with WebdriverIO-native philosophy):
 *
 *  P1: data-testid / data-test / data-cy / data-pw / test-id  (explicit test hooks)
 *  P2: unique stable #id                                       (CSS-native, fast)
 *  P3: aria/ selector                                          (explicit accessibility label, stable and descriptive)
 *  P4: stable semantic attributes                              (placeholder, img[alt], name, submit value)
 *         Note: P4c uses CSS attribute syntax [name="…"], NOT the deprecated WebDriver
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
    if (attrs[attr]) add(`[${attr}="${cssAttr(attrs[attr])}"]`, false, `test-id (${attr})`);
  }

  // P2: unique, non-generated #id
  if (id && idUnique && !isGeneratedId(id)) add(idSelector(id), false, '#id');

  // P3: aria/
  if (ariaLabel && isWdioSafeValue(ariaLabel)) add(`aria/${ariaLabel}`, false, 'aria-label');

  // P4a: placeholder
  if (attrs.placeholder) add(`${tag}[placeholder="${cssAttr(attrs.placeholder)}"]`, false, 'placeholder');

  // P4b: img[alt]
  if (tag === 'img' && attrs.alt) add(`img[alt="${cssAttr(attrs.alt)}"]`, false, 'alt');

  // P4c: name (radio: name+value)
  if (attrs.name) {
    if (tag === 'input' && attrs.type === 'radio' && attrs.value) {
      add(`input[name="${cssAttr(attrs.name)}"][value="${cssAttr(attrs.value)}"]`, false, 'name+value');
    } else {
      add(`${tag}[name="${cssAttr(attrs.name)}"]`, false, 'name');
    }
  }

  // P4d: submit/button caption (WDIO aria/ does not read value)
  if (tag === 'input' && ['submit', 'button', 'reset'].includes(attrs.type) && attrs.value) {
    add(`input[type="${attrs.type}"][value="${cssAttr(attrs.value)}"]`, false, 'value');
  }

  // P5: text=
  const trimmed = (text || '').trim();
  if (trimmed.length > 0 && trimmed.length <= 40 && INTERACTIVE_TAGS.has(tag) &&
      !DYNAMIC_TEXT_RE.test(trimmed) && !/[\\\x00-\x1F<>]/.test(trimmed) && isWdioSafeValue(trimmed)) {
    add(`${tag}=${trimmed}`, false, 'text');
  }

  // P6: role (warn)
  if (attrs.role) add(`[role="${cssAttr(attrs.role)}"]`, true, 'role');

  // P7: type (warn)
  if (attrs.type) add(`${tag}[type="${cssAttr(attrs.type)}"]`, true, 'type');

  // P8: href (warn)
  if (attrs.href) add(`a[href="${cssAttr(attrs.href)}"]`, true, 'href (fragile)');

  // P9: CSS path (warn)
  if (xpath) add(xpath, true, 'xpath');

  return candidates;
}

/** The first entry of getLocatorCandidates. */
export function getBestLocator(info, testIdAttrs = TEST_ID_ATTRS) {
  const [best] = getLocatorCandidates(info, testIdAttrs);
  return best ? { locator: best.locator, warn: best.warn } : { locator: info.xpath, warn: true };
}
