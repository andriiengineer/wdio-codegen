// src/recorder-modules/recorder-helpers.js
// Stateless helper functions used by recorder.source.js.
// These functions run in the browser context (bundled by esbuild into recorder.content.js).
import { getBestLocator } from '../locator-engine.js';
import { buildFallbackSelector, extractInfo } from './recorder-locator.js';

// Auto-detect frame selector (for iframes injected by Puppeteer addInitScript).
// Priority: #id > iframe[name] > iframe[src] > iframe:nth-of-type (last resort).
export function getFrameSelector() {
  if (window === window.top) return '';
  const iframe = window.frameElement;
  if (!iframe) return ''; // cross-origin iframe: frameElement is null

  // P1: unique id
  if (iframe.id) return `#${CSS.escape(iframe.id)}`;

  // P2: name attribute
  if (iframe.name) return `iframe[name="${CSS.escape(iframe.name)}"]`;

  // P3: src attribute, more stable than a positional index.
  // Only used for same-origin URLs; cross-origin src is not a reliable WDIO locator.
  // Normalized to a relative path (mirrors href treatment in extractInfo).
  // Uniqueness is checked by resolved URL (attribute may be absolute or relative).
  try {
    const rawSrc = iframe.getAttribute('src') || '';
    const url = new URL(rawSrc, window.parent.location.href);
    if (url.origin === window.parent.location.origin) {
      const normSrc = url.pathname + url.search; // relative, no hash
      const allIframes = window.parent.document.querySelectorAll('iframe');
      const sameUrl = [...allIframes].filter(f => {
        try {
          const fu = new URL(f.getAttribute('src') || '', window.parent.location.href);
          return fu.pathname + fu.search === normSrc;
        } catch { return false; }
      });
      if (sameUrl.length === 1) return `iframe[src="${normSrc}"]`;
    }
  } catch {}

  // P4: positional fallback, fragile and used only when no stable attribute exists.
  // :nth-of-type counts among same-tag siblings of the same parent, so we must
  // count within iframe.parentElement, not across the whole document.
  try {
    const parent = iframe.parentElement;
    if (parent) {
      const iframeSiblings = [...parent.children].filter(c => c.tagName === 'IFRAME');
      const pos = iframeSiblings.indexOf(iframe) + 1;
      if (pos > 0) return `iframe:nth-of-type(${pos})`;
    }
  } catch {}

  return '';
}

// Resolves the best locator for a text assertion, avoiding tautology.
// When the locator is already tag=text and matches the assertion text, re-extract
// without text priority so the locator and assertion value don't mirror each other.
export function resolveTextAssertLocator(el, locator, warn, text) {
  const textSelMatch = locator.match(/^(\w+)=(.+)$/);
  if (textSelMatch && textSelMatch[2] === text) {
    const infoNoText = extractInfo(el);
    infoNoText.text = '';
    const reExtracted = getBestLocator(infoNoText);
    let assertLocator = reExtracted.locator;
    let assertWarn = reExtracted.warn;
    if (assertLocator.match(/^\w+=.+$/)) {
      assertLocator = buildFallbackSelector(el);
      assertWarn = true;
    }
    return { locator: assertLocator, warn: assertWarn };
  }
  return { locator, warn };
}
