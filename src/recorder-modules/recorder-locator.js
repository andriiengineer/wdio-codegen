// src/recorder-modules/recorder-locator.js
// Locator engine helpers used by recorder.source.js.
// These functions run in the browser context (bundled by esbuild into recorder.content.js).
import { getBestLocator, TEST_ID_ATTRS, DYNAMIC_TEXT_RE, INTERACTIVE_TAGS, isGeneratedId } from '../locator-engine.js';
import { isUnstableClass } from '../class-filter.js';

// State/utility class prefixes that change dynamically and must not be used as stable locators.
// Used in both _bestCSSSegment (CSS path builder) and getUniqueLocator (class scoring).
const _SKIP_CLASS_RE = /^(active|selected|hover|focus|focused|disabled|hidden|visible|open|closed|loading|error|success|is-|has-|js-|ng-|v-|_)/;

// Returns the best single CSS segment for one DOM node (no ancestry context).
// Prefers stable class names, falls back to :nth-child().
function _bestCSSSegment(node) {
  const tag = node.tagName.toLowerCase();
  // Stable class names: exclude state classes, numeric classes, and framework-generated classes
  const stableCls = [...node.classList].filter(c =>
    c.length > 2 && !_SKIP_CLASS_RE.test(c) && !/^\d/.test(c) && !isUnstableClass(c)
  );
  if (stableCls.length > 0) return `${tag}.${CSS.escape(stableCls[0])}`;
  for (const a of TEST_ID_ATTRS) {
    const v = node.getAttribute(a);
    if (v) return `[${a}="${v}"]`;
  }
  const al = node.getAttribute('aria-label');
  if (al) return `${tag}[aria-label="${al}"]`;
  const parent = node.parentElement;
  if (parent) {
    const sameTag = [...parent.children].filter(c => c.tagName === node.tagName);
    if (sameTag.length === 1) return tag;
    const pos = [...parent.children].indexOf(node) + 1; // 1-based
    return `${tag}:nth-child(${pos})`;
  }
  return tag;
}

// Returns the correct query root for el.
// Elements inside a Shadow DOM must be queried from their ShadowRoot, not from document,
// because document.querySelectorAll() does not pierce shadow boundaries.
// WebdriverIO v9+ auto-pierces at runtime, so a path scoped to the shadow root is correct.
function _queryRoot(el) {
  const root = el.getRootNode();
  return (root instanceof ShadowRoot) ? root : document;
}

// Build a scoped CSS selector from anchorEl to targetEl, anchored with anchorSelector.
// Returns CSS string or null if uniqueness can't be verified.
function _buildScopedCSS(anchorSelector, anchorEl, targetEl) {
  const segs = [];
  let node = targetEl;
  while (node && node !== anchorEl) {
    segs.unshift(_bestCSSSegment(node));
    node = node.parentElement;
  }
  if (!segs.length) return null;
  const qRoot = _queryRoot(targetEl);
  // Try progressively less specific paths (full → drop non-positional middle segments)
  const candidates = [
    `${anchorSelector} ${segs.join(' > ')}`,           // exact chain with >
    `${anchorSelector} ${segs.slice(-2).join(' > ')}`, // last 2 segments
    `${anchorSelector} ${segs[segs.length - 1]}`,      // just the leaf segment
  ];
  for (const c of candidates) {
    try {
      if (qRoot.querySelectorAll(c).length === 1) return c;
    } catch {}
  }
  // Uniqueness failed: return the most specific CSS anyway (warn=true will be set by caller)
  return `${anchorSelector} ${segs.join(' > ')}`;
}

function buildFallbackSelector(el) {
  const qRoot = _queryRoot(el);

  if (el.id && qRoot.querySelectorAll(`#${CSS.escape(el.id)}`).length === 1)
    return `#${CSS.escape(el.id)}`;

  // Find nearest ancestor with a unique id or testid, then build scoped CSS from there.
  // Traversal naturally stops at the shadow root boundary (parentElement → null),
  // so an anchor outside the shadow root is never used with qRoot queries.
  let anchor = el.parentElement;
  let depth = 0;
  const docRoot = qRoot === document ? document.documentElement : qRoot;
  while (anchor && anchor !== docRoot && depth < 8) {
    let anchorSel = null;
    if (anchor.id && qRoot.querySelectorAll(`#${CSS.escape(anchor.id)}`).length === 1) {
      anchorSel = `#${CSS.escape(anchor.id)}`;
    } else {
      for (const a of TEST_ID_ATTRS) {
        const v = anchor.getAttribute(a);
        if (v) { anchorSel = `[${a}="${v}"]`; break; }
      }
    }
    if (anchorSel) {
      const css = _buildScopedCSS(anchorSel, anchor, el);
      if (css) return css;
    }
    anchor = anchor.parentElement;
    depth++;
  }

  // Full CSS path with :nth-child, the last resort when no stable anchor is found.
  const segs = [];
  let node = el;
  while (node && node.nodeType === Node.ELEMENT_NODE && node !== docRoot) {
    segs.unshift(_bestCSSSegment(node));
    node = node.parentElement;
  }
  return segs.join(' > ');
}

function extractInfo(el) {
  const tag = el.tagName.toLowerCase();
  const text = (el.innerText || el.textContent || '').trim().split('\n')[0].trim();
  // Resolve aria-label / aria-labelledby → human-readable label string.
  // aria-labelledby may reference multiple space-separated IDs; concatenate their text.
  // Use _queryRoot so IDs inside a Shadow DOM are resolved within the right root.
  let ariaLabel = el.getAttribute('aria-label') || '';
  if (!ariaLabel) {
    const labelledBy = el.getAttribute('aria-labelledby');
    if (labelledBy) {
      const root = _queryRoot(el);
      ariaLabel = labelledBy.trim().split(/\s+/)
        .map(refId => {
          const labelEl = root.querySelector(`#${CSS.escape(refId)}`);
          return labelEl ? labelEl.textContent.replace(/\s+/g, ' ').trim() : '';
        })
        .filter(Boolean)
        .join(' ');
    }
  }
  const id = el.id || '';
  const idUnique = id ? _queryRoot(el).querySelectorAll(`#${CSS.escape(id)}`).length === 1 : false;
  const attrs = {};
  for (const attr of [...TEST_ID_ATTRS, 'type', 'name', 'role', 'href', 'placeholder', 'value'])
    if (el.hasAttribute(attr)) attrs[attr] = el.getAttribute(attr);

  if (tag === 'img') attrs.alt = el.getAttribute('alt') || '';

  // Normalize href: hash-only → drop, cross-origin → drop, same-origin → pathname only.
  // Search params and hash are frequently dynamic and break stability across runs.
  if (attrs.href) {
    if (attrs.href.startsWith('#')) {
      delete attrs.href;
    } else {
      try {
        const url = new URL(attrs.href, location.href);
        if (url.origin === location.origin) {
          attrs.href = url.pathname;
        } else {
          delete attrs.href;
        }
      } catch {
        delete attrs.href; // unparseable (mailto:, javascript:, etc.)
      }
    }
  }

  if (!ariaLabel && el.getAttribute('title')) ariaLabel = el.getAttribute('title').trim();

  if (tag === 'input' && (attrs.type === 'submit' || attrs.type === 'button') && !ariaLabel && el.value) {
    ariaLabel = el.value;
  }

  if (['input', 'textarea', 'select'].includes(tag) && !ariaLabel) {
    let labelEl = el.labels && el.labels[0];
    if (!labelEl && el.id) labelEl = document.querySelector(`label[for="${CSS.escape(el.id)}"]`);
    if (labelEl) ariaLabel = ariaLabel || labelEl.textContent.trim().replace(/\s+/g, ' ');
  }

  const xpath = buildFallbackSelector(el);
  return { tag, text, ariaLabel, id, idUnique, attrs, xpath };
}

function getUniqueLocator(el) {
  const info = extractInfo(el);
  let { locator, warn } = getBestLocator(info);

  // warn=true (xpath/type/role) is already last resort, return as-is
  if (warn) return { locator, warn };

  // aria/ and XPath selectors are not valid CSS, so skip the querySelectorAll uniqueness check.
  if (locator.startsWith('aria/') || locator.startsWith('/') || locator.startsWith('(')) {
    return { locator, warn: false };
  }

  const textSel = locator.match(/^(\w+)=(.+)$/);
  if (textSel) {
    const [, sTag, sTxt] = textSel;
    try {
      const matchCount = Array.from(document.querySelectorAll(sTag)).filter(e =>
        (e.innerText || e.textContent || '').trim().split('\n')[0].trim() === sTxt
      ).length;
      return { locator, warn: matchCount !== 1 };
    } catch {}
    return { locator, warn: true };
  }

  let count;
  try { count = document.querySelectorAll(locator).length; } catch { return { locator: info.xpath, warn: true }; }
  if (count === 1) return { locator, warn: false };

  // Not unique: try progressively broader strategies to narrow it down.

  // 1. Append a stable class name (exclude state, framework-generated, and utility classes).
  const classes = [...el.classList].filter(c => !_SKIP_CLASS_RE.test(c) && c.length > 2 && !isUnstableClass(c));
  for (const cls of classes.slice(0, 4)) {
    const candidate = `${locator}.${CSS.escape(cls)}`;
    try { if (document.querySelectorAll(candidate).length === 1) return { locator: candidate, warn: false }; } catch {}
  }
  if (classes.length >= 2) {
    const candidate = `${locator}${classes.slice(0, 2).map(c => `.${CSS.escape(c)}`).join('')}`;
    try { if (document.querySelectorAll(candidate).length === 1) return { locator: candidate, warn: false }; } catch {}
  }

  // 2. [aria-label] CSS attribute selector
  const ariaAttr = el.getAttribute('aria-label');
  if (ariaAttr) {
    const candidate = `[aria-label="${ariaAttr}"]`;
    try { if (document.querySelectorAll(candidate).length === 1) return { locator: candidate, warn: false }; } catch {}
  }

  // 3. Scope with nearest ancestor that has a unique id or test-id.
  let ancestor = el.parentElement;
  for (let depth = 0; ancestor && depth < 5; depth++, ancestor = ancestor.parentElement) {
    let ancLoc = null;
    if (ancestor.id && document.querySelectorAll(`#${CSS.escape(ancestor.id)}`).length === 1) {
      ancLoc = `#${CSS.escape(ancestor.id)}`;
    } else {
      for (const attr of TEST_ID_ATTRS) {
        const val = ancestor.getAttribute(attr);
        if (val) { ancLoc = `[${attr}="${val}"]`; break; }
      }
    }
    if (ancLoc) {
      const candidate = `${ancLoc} ${locator}`;
      try { if (document.querySelectorAll(candidate).length === 1) return { locator: candidate, warn: false }; } catch {}
    }
  }

  // 4. Fall back to full CSS path (xpath field).
  return { locator: info.xpath, warn: true };
}

export { buildFallbackSelector, extractInfo, getUniqueLocator };
