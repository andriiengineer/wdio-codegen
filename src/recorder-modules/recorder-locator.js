// src/recorder-modules/recorder-locator.js
// Locator engine helpers used by recorder.source.js.
// These functions run in the browser context (bundled by esbuild into recorder.content.js).
import { getLocatorCandidates, TEST_ID_ATTRS, cssAttr, wdioXPathBranches, isWdioImageSelector } from '../locator-engine.js';
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
    c.length > 2 && !_SKIP_CLASS_RE.test(c) && !/^\d/.test(c) && !isUnstableClass(c) && !isWdioImageSelector(`.${c}`)
  );
  if (stableCls.length > 0) return `${tag}.${CSS.escape(stableCls[0])}`;
  for (const a of TEST_ID_ATTRS) {
    const v = node.getAttribute(a);
    if (v) return `[${a}="${cssAttr(v)}"]`;
  }
  const al = node.getAttribute('aria-label');
  if (al) return `${tag}[aria-label="${cssAttr(al)}"]`;
  const parent = node.parentElement;
  if (parent) {
    const sameTag = [...parent.children].filter(c => c.tagName === node.tagName);
    if (sameTag.length === 1) return tag;
    const pos = [...parent.children].indexOf(node) + 1; // 1-based
    return `${tag}:nth-child(${pos})`;
  }
  return tag;
}

// Returns the root el lives in: its ShadowRoot, or document.
function _queryRoot(el) {
  const root = el.getRootNode();
  return (root instanceof ShadowRoot) ? root : document;
}

// WebdriverIO v9 searches the document and every open shadow root, so uniqueness is checked across all of them.
function _searchRoots() {
  const roots = [document];
  for (let i = 0; i < roots.length; i++) {
    for (const node of roots[i].querySelectorAll('*')) if (node.shadowRoot) roots.push(node.shadowRoot);
  }
  return roots;
}

let _roots = null;

// WDIO's XPath re-runs an absolute sub-query per node (seconds on big pages); run it once and inline the ids.
const _LABEL_REF_RE = /^\.\/\/(\*|input|textarea)\[@([\w-]+) ?= ?\((.+)\/@(id|for)\)\]$/;

function _wdioXPath(locator) {
  const branches = wdioXPathBranches(locator);
  if (!branches) return null;
  return branches.flatMap((branch) => {
    const m = branch.match(_LABEL_REF_RE);
    if (!m) return [branch];
    const [, tag, attr, subQuery, refAttr] = m;
    const r = document.evaluate(`${subQuery}/@${refAttr}`, document, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
    const ids = Array.from({ length: r.snapshotLength }, (_, i) => r.snapshotItem(i).value);
    if (ids.some(id => id.includes('"'))) return [branch];
    return ids.length ? [`.//${tag}[${ids.map(id => `@${attr}="${id}"`).join(' or ')}]`] : [];
  }).join(' | ');
}

// Everything WebdriverIO would match. XPath cannot run inside a ShadowRoot, so aria/ and text only see the light DOM.
function _deepMatches(locator) {
  if (isWdioImageSelector(locator)) return [];
  const xpath = _wdioXPath(locator);
  const hits = [];
  for (const root of _roots ?? _searchRoots()) {
    if (!xpath) { hits.push(...root.querySelectorAll(locator)); continue; }
    if (root !== document) continue;
    const r = document.evaluate(xpath, root, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
    for (let i = 0; i < r.snapshotLength; i++) hits.push(r.snapshotItem(i));
  }
  return hits;
}

function _isUnique(locator) {
  try { return _deepMatches(locator).length === 1; } catch { return false; }
}

function _resolvesOnlyTo(locator, el) {
  try {
    const hits = _deepMatches(locator);
    return hits.length === 1 && hits[0] === el;
  } catch {
    return false;
  }
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
  // Try progressively less specific paths (full → drop non-positional middle segments)
  const candidates = [
    `${anchorSelector} ${segs.join(' > ')}`,           // exact chain with >
    `${anchorSelector} ${segs.slice(-2).join(' > ')}`, // last 2 segments
    `${anchorSelector} ${segs[segs.length - 1]}`,      // just the leaf segment
  ];
  for (const c of candidates) {
    try {
      if (_isUnique(c)) return c;
    } catch {}
  }
  // Uniqueness failed: return the most specific CSS anyway (warn=true will be set by caller)
  return `${anchorSelector} ${segs.join(' > ')}`;
}

function buildFallbackSelector(el) {
  const qRoot = _queryRoot(el);

  if (el.id && _isUnique(`#${CSS.escape(el.id)}`))
    return `#${CSS.escape(el.id)}`;

  // Find nearest ancestor with a unique id or testid, then build scoped CSS from there.
  // Traversal naturally stops at the shadow root boundary (parentElement → null).
  let anchor = el.parentElement;
  let depth = 0;
  const docRoot = qRoot === document ? document.documentElement : qRoot;
  while (anchor && anchor !== docRoot && depth < 8) {
    let anchorSel = null;
    if (anchor.id && _isUnique(`#${CSS.escape(anchor.id)}`)) {
      anchorSel = `#${CSS.escape(anchor.id)}`;
    } else {
      for (const a of TEST_ID_ATTRS) {
        const v = anchor.getAttribute(a);
        if (v) { anchorSel = `[${a}="${cssAttr(v)}"]`; break; }
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
  const idUnique = id ? _isUnique(`[id="${cssAttr(id)}"]`) : false;
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

  if (['input', 'textarea', 'select'].includes(tag) && !ariaLabel) {
    let labelEl = el.labels && el.labels[0];
    if (!labelEl && el.id) labelEl = document.querySelector(`label[for="${CSS.escape(el.id)}"]`);
    if (labelEl) ariaLabel = ariaLabel || labelEl.textContent.trim().replace(/\s+/g, ' ');
  }

  const xpath = buildFallbackSelector(el);
  return { tag, text, ariaLabel, id, idUnique, attrs, xpath };
}

// First candidate that WebdriverIO resolves to el alone; else a narrowed CSS candidate; else a CSS path with warn.
function getUniqueLocator(el, info) {
  _roots = _searchRoots();
  try {
    info ??= extractInfo(el);
    const candidates = getLocatorCandidates(info);
    const stable = candidates.filter(c => !c.warn);
    for (const { locator } of stable) {
      if (_resolvesOnlyTo(locator, el)) return { locator, warn: false };
    }

    const cssBase = stable.find(c => !wdioXPathBranches(c.locator))?.locator;
    const narrowed = cssBase && _narrow(cssBase, el);
    if (narrowed) return { locator: narrowed, warn: false };

    const weak = candidates.find(c => c.warn && _resolvesOnlyTo(c.locator, el));
    return { locator: weak?.locator ?? info.xpath, warn: true };
  } finally {
    _roots = null;
  }
}

function _narrow(locator, el) {
  // 1. Append a stable class name (exclude state, framework-generated, and utility classes).
  const classes = [...el.classList].filter(c => !_SKIP_CLASS_RE.test(c) && c.length > 2 && !isUnstableClass(c));
  for (const cls of classes.slice(0, 4)) {
    const candidate = `${locator}.${CSS.escape(cls)}`;
    if (_resolvesOnlyTo(candidate, el)) return candidate;
  }
  if (classes.length >= 2) {
    const candidate = `${locator}${classes.slice(0, 2).map(c => `.${CSS.escape(c)}`).join('')}`;
    if (_resolvesOnlyTo(candidate, el)) return candidate;
  }

  // 2. [aria-label] CSS attribute selector
  const ariaAttr = el.getAttribute('aria-label');
  if (ariaAttr) {
    const candidate = `[aria-label="${cssAttr(ariaAttr)}"]`;
    if (_resolvesOnlyTo(candidate, el)) return candidate;
  }

  // 3. Scope with nearest ancestor that has a unique id or test-id.
  let ancestor = el.parentElement;
  for (let depth = 0; ancestor && depth < 5; depth++, ancestor = ancestor.parentElement) {
    let ancLoc = null;
    if (ancestor.id && _isUnique(`#${CSS.escape(ancestor.id)}`)) {
      ancLoc = `#${CSS.escape(ancestor.id)}`;
    } else {
      for (const attr of TEST_ID_ATTRS) {
        const val = ancestor.getAttribute(attr);
        if (val) { ancLoc = `[${attr}="${cssAttr(val)}"]`; break; }
      }
    }
    if (ancLoc) {
      const candidate = `${ancLoc} ${locator}`;
      if (_resolvesOnlyTo(candidate, el)) return candidate;
    }
  }
  return null;
}

export { buildFallbackSelector, extractInfo, getUniqueLocator };
