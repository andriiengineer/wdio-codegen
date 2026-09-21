// Reads the method names out of the generator and checks them against what WebdriverIO
// actually exposes. String-to-string codegen tests cannot catch a method that does not
// exist at runtime.
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '../..');
const CODEGEN_RAW = fs.readFileSync(path.join(ROOT, 'src/codegen.js'), 'utf8');

const stripComments = (src) => src
  .split('\n')
  .filter(l => !/^\s*(\/\/|\/\*|\*)/.test(l))
  .join('\n');

const CODEGEN_SRC = stripComments(CODEGEN_RAW);

const dirNames = (rel) =>
  new Set(
    fs.readdirSync(path.join(ROOT, 'node_modules/webdriverio/build/commands', rel))
      .filter(f => f.endsWith('.d.ts') && !f.endsWith('.d.ts.map'))
      .map(f => f.replace(/\.d\.ts$/, ''))
  );

// Commands that live in the WebDriver protocol rather than in commands/browser/.
const PROTOCOL_COMMANDS = new Set([
  'closeWindow', 'acceptAlert', 'dismissAlert', 'sendAlertText',
  'getWindowHandles', 'switchToWindow', 'setCookies', 'getCookies',
]);

/** Method names called on an element locator: `${L(...)}.name(` */
function elementCallsIn(src) {
  return new Set([...src.matchAll(/\$\{L\([^)]*\)\}\.(\w+)\(/g)].map(m => m[1]));
}
/** Method names called on browser: `browser.name(` */
function browserCallsIn(src) {
  return new Set([...src.matchAll(/\bbrowser\.(\w+)\(/g)].map(m => m[1]));
}
/**
 * Matchers. Matching on `expect(...)` first does not work: the argument itself contains
 * parentheses (`expect(${L(event.locator)})`), so the group stops in the wrong place.
 * Every expect-webdriverio matcher starts with `to` + uppercase, and no element or browser
 * command does, so that shape is enough to find them and cannot collide.
 */
function matchersIn(src) {
  const out = new Set();
  for (const line of src.split('\n')) {
    // Only lines that actually build an assertion, which keeps `charCodeAt(0).toString(16)`
    // in escapeStr from being mistaken for a matcher.
    if (!line.includes('expect(')) continue;
    for (const m of line.matchAll(/\.(to[A-Z]\w*)\(/g)) out.add(m[1]);
  }
  return out;
}

describe('generated code uses real WebdriverIO API', () => {
  it('every element command exists in webdriverio', () => {
    const real = dirNames('element');
    const used = elementCallsIn(CODEGEN_SRC);
    expect(used.size).toBeGreaterThan(0);
    expect([...used].filter(c => !real.has(c))).toEqual([]);
  });

  it('every browser command exists in webdriverio or the WebDriver protocol', () => {
    const real = dirNames('browser');
    const used = browserCallsIn(CODEGEN_SRC);
    expect(used.size).toBeGreaterThan(0);
    expect([...used].filter(c => !real.has(c) && !PROTOCOL_COMMANDS.has(c))).toEqual([]);
  });

  it('every matcher exists in expect-webdriverio', async () => {
    const { matchers } = await import('expect-webdriverio');
    const real = new Set(matchers.keys());
    const used = matchersIn(CODEGEN_SRC);
    expect(used.size).toBeGreaterThan(0);
    expect([...used].filter(m => !real.has(m))).toEqual([]);
  });

  it('catches a regression: the four methods that shipped broken are gone', () => {
    for (const dead of ['dblclick', 'toBeInViewport', 'toMatchScreenshot']) {
      expect(CODEGEN_SRC).not.toMatch(new RegExp(`\\.${dead}\\(\\)`));
    }
    expect(CODEGEN_SRC).not.toMatch(/\}\.(check|uncheck)\(\)/);
  });
});
