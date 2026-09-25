// Every locator the recorder generates must be found by WebdriverIO itself.
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { build } from 'esbuild';
import { remote } from 'webdriverio';
import { BROWSER_CACHE_DIR } from '../../src/launcher.js';
import { toWdioXPath } from '../../src/locator-engine.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '../..');

let browser;

beforeAll(async () => {
  const { outputFiles } = await build({
    entryPoints: [path.join(ROOT, 'src/recorder-modules/recorder-locator.js')],
    bundle: true,
    format: 'iife',
    globalName: '__wdioLocator',
    footer: { js: 'globalThis.__wdioLocator = __wdioLocator;' },
    write: false,
  });
  browser = await remote({
    logLevel: 'silent',
    cacheDir: BROWSER_CACHE_DIR,
    capabilities: {
      browserName: 'chrome',
      'goog:chromeOptions': { args: ['--headless=new', ...(process.env.CI ? ['--no-sandbox'] : [])] },
    },
  });
  await browser.url(pathToFileURL(path.join(__dirname, 'fixture.html')).href);
  await browser.execute(outputFiles[0].text);
});

afterAll(async () => {
  await browser?.deleteSession();
});

function recordLocator(probe) {
  return browser.execute((p) => {
    const find = (root) => {
      const hit = root.querySelector(`[data-probe="${p}"]`);
      if (hit) return hit;
      for (const el of root.querySelectorAll('*')) {
        const inner = el.shadowRoot && find(el.shadowRoot);
        if (inner) return inner;
      }
      return null;
    };
    return window.__wdioLocator.getUniqueLocator(find(document));
  }, probe);
}

async function probeFoundBy(locator) {
  const el = await browser.$(locator);
  return (await el.isExisting()) ? el.getAttribute('data-probe') : null;
}

describe('recorded locators resolve to the recorded element in WebdriverIO', () => {
  it.each([
    'submit-value',
    'aria-quote',
    'text-quote',
    'placeholder-quote',
    'dotted-id',
    'digit-id',
    'plain-text',
    'aria-label',
    'labelledby',
    'label-for',
    'label-for-generated-id',
    'shadow-solo',
    'type-dup',
    'role-dup',
    'svg-class',
    'png-id',
    'aria-vs-labelledby',
  ])('%s', async (probe) => {
    const { locator } = await recordLocator(probe);
    expect(await probeFoundBy(locator), locator).toBe(probe);
  });

  it.each([
    'submit-value', 'aria-quote', 'placeholder-quote', 'dotted-id', 'digit-id', 'plain-text', 'shadow-solo',
    'png-id', 'label-for-generated-id',
  ])('%s gets a stable locator (no fallback warning)', async (probe) => {
    const { locator, warn } = await recordLocator(probe);
    expect(warn, locator).toBe(false);
  });

  it('warns for an element repeated across shadow roots (A2)', async () => {
    const { locator, warn } = await recordLocator('shadow-dup-2');
    expect(warn, locator).toBe(true);
  });
});

describe('toWdioXPath matches what the installed WebdriverIO finds', () => {
  it.each(['aria/Send', 'aria/Close dialog', 'aria/Card', 'aria/Card2', 'aria/Email', 'aria/Nickname', 'button=Save', 'button=Buy', 'a=Nothing'])(
    '%s', async (locator) => {
      const ours = await browser.execute((xp) =>
        document.evaluate(xp, document, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null).snapshotLength,
      toWdioXPath(locator));
      expect(ours).toBe((await browser.$$(locator)).length);
    });
});

describe('performance on a large page', () => {
  it('picks an aria/ locator in well under a hover frame budget with 3,000 extra elements', async () => {
    const ms = await browser.execute(() => {
      const bulk = document.createElement('div');
      bulk.id = 'bulk';
      bulk.innerHTML = '<div><span>row</span></div>'.repeat(1000) + '<input>'.repeat(1000);
      document.body.append(bulk);
      const el = document.querySelector('[data-probe="aria-label"]');
      const t0 = performance.now();
      window.__wdioLocator.getUniqueLocator(el);
      const elapsed = performance.now() - t0;
      bulk.remove();
      return elapsed;
    });
    expect(ms).toBeLessThan(100);
  });
});

describe('shipped recorder bundle records real clicks', () => {
  beforeAll(async () => {
    await browser.execute(() => {
      window.__events = [];
      window.__errors = [];
      window.__wdioRecord = (json) => window.__events.push(JSON.parse(json));
      window.addEventListener('error', (e) => window.__errors.push(e.message));
    });
    await browser.execute(fs.readFileSync(path.join(ROOT, 'src/recorder.content.js'), 'utf8'));
  });

  it.each([
    ['[data-testid="solo"]', '[data-testid="solo"]'],
    ['input[type="submit"][value="Send"]', 'input[type="submit"][value="Send"]'],
    ['[data-probe="aria-quote"]', 'button=x'],
    ['x-icon', 'aria/Favorite'],
    ['#buy-btn', '#buy-btn'],
    ['#sell-btn span', '#sell-btn span'],
    ['#agree', '#agree'],
  ])('click on %s is recorded as %s', async (target, expected) => {
    const before = await browser.execute(() => window.__events.filter(e => e.type === 'click').length);
    await browser.$(target).click();
    await browser.waitUntil(
      () => browser.execute((n) => window.__events.filter(e => e.type === 'click').length > n, before),
      { timeout: 3000, timeoutMsg: 'no click event recorded' },
    );
    const last = await browser.execute(() => window.__events.filter(e => e.type === 'click').at(-1));
    expect(last.locator).toBe(expected);
    expect(await browser.execute(() => window.__errors)).toEqual([]);
  });

  it('does not record an app-shell host for a small item inside it', async () => {
    await browser.pause(400);
    const before = await browser.execute(() => window.__events.filter(e => e.type === 'click').length);
    await browser.$('[data-probe="app-menu-item"]').click();
    await browser.waitUntil(
      () => browser.execute((n) => window.__events.filter(e => e.type === 'click').length > n, before),
      { timeout: 3000, timeoutMsg: 'no click event recorded' },
    );
    const last = await browser.execute(() => window.__events.filter(e => e.type === 'click').at(-1));
    expect(last.locator).not.toBe('#app');
    expect(last._warn).toBe(true);
  });
});
