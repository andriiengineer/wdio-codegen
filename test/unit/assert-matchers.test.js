// test/unit/assert-matchers.test.js
// Assertion matchers: which ones the recorder context menu offers and codegen emits.
// 1. toBeChecked
// 2. not.* assertions
// 3. toMatchScreenshot must not be generated
// 4. toBeInViewport
import { describe, it, expect } from 'vitest';
import { generateLine, getHumanLabel } from '../../src/codegen.js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const RECORDER_SRC = fs.readFileSync(
  path.join(__dirname, '../../src/recorder.content.js'), 'utf8'
);

// ── 1. toBeChecked in recorder context menu ──────────────────────────────────
describe('toBeChecked in recorder context menu', () => {
  it('recorder context menu has "Is checked" or "toBeChecked" item', () => {
    expect(RECORDER_SRC).toMatch(/toBeChecked|is.checked/i);
  });

  it('recorder sends assert:toBeChecked event', () => {
    expect(RECORDER_SRC).toContain("assert:toBeChecked");
  });
});

// ── 2. not. assertions in recorder context menu ──────────────────────────────
describe('not. assertions in recorder context menu', () => {
  it('recorder has assert:not:toBeDisplayed event', () => {
    expect(RECORDER_SRC).toContain('assert:not:toBeDisplayed');
  });

  it('recorder context menu offers "not visible" / "hidden" option', () => {
    expect(RECORDER_SRC).toMatch(/not.visible|not.*displayed|is.hidden|hidden|not.toBeDisplayed/i);
  });
});

// ── 3. toMatchScreenshot ─────────────────────────────────────────────────────
// expect-webdriverio has no toMatchScreenshot matcher: visual comparison lives in the
// separate @wdio/visual-service package, which is not a dependency here.
describe('toMatchScreenshot must not be generated', () => {
  it('generateLine ignores the event type', () => {
    expect(generateLine({ type: 'assert:toMatchScreenshot', locator: '#hero' })).toBeNull();
  });

  it('context menu no longer offers a screenshot assertion', () => {
    expect(RECORDER_SRC).not.toMatch(/assert:toMatchScreenshot/);
  });
});

// ── 4. toBeInViewport ────────────────────────────────────────────────────────
describe('toBeInViewport: codegen', () => {
  it('generates toBeInViewport() for element', () => {
    const line = generateLine({ type: 'assert:toBeInViewport', locator: '.banner' });
    // event type keeps its internal name; the matcher must be the real WDIO one
    expect(line).toBe(`    await expect($('.banner')).toBeDisplayedInViewport();`);
  });

  it('generates toBeInViewport() with frame', () => {
    const line = generateLine({ type: 'assert:toBeInViewport', locator: '#el', _frame: 'iframe' });
    expect(line).toBe([
      `    await browser.switchFrame($('iframe'));`,
      `    await expect($('#el')).toBeDisplayedInViewport();`,
      `    await browser.switchFrame(null);`,
    ].join('\n'));
  });

  it('getHumanLabel returns viewport label', () => {
    const label = getHumanLabel({ type: 'assert:toBeInViewport', locator: '.banner' });
    expect(label).toMatch(/viewport/i);
    expect(label).toContain('.banner');
  });
});

describe('toBeInViewport: recorder context menu', () => {
  it('has "Element is in viewport" item in context menu', () => {
    expect(RECORDER_SRC).toMatch(/in.?viewport/i);
  });

  it('sends assert:toBeInViewport event type', () => {
    expect(RECORDER_SRC).toMatch(/assert:toBeInViewport/);
  });
});
