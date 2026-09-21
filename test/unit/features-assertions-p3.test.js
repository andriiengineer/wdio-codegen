// test/unit/features-assertions-p3.test.js
// P3 assertions and flags:
// 1. toMatchScreenshot assertion
// 2. toBeInViewport assertion
// 3. --geolocation CLI flag
import { describe, it, expect } from 'vitest';
import { generateLine, getHumanLabel } from '../../src/codegen.js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const RECORDER_SRC = fs.readFileSync(
  path.join(__dirname, '../../src/recorder.content.js'), 'utf8'
);
const LAUNCHER_SRC = fs.readFileSync(
  path.join(__dirname, '../../src/launcher.js'), 'utf8'
);
const EMULATION_SRC = fs.readFileSync(
  path.join(__dirname, '../../src/launcher/emulation.js'), 'utf8'
);
const CLI_SRC = fs.readFileSync(
  path.join(__dirname, '../../bin/wdio-codegen.js'), 'utf8'
);

// ── 1. toMatchScreenshot ─────────────────────────────────────────────────────
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

// ── 2. toBeInViewport ────────────────────────────────────────────────────────
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

// ── 3. --geolocation CLI flag ────────────────────────────────────────────────
describe('--geolocation CLI flag', () => {
  it('bin/wdio-codegen.js has geolocation option', () => {
    expect(CLI_SRC).toMatch(/['"]geolocation['"]/);
  });

  it('help text mentions --geolocation', () => {
    expect(CLI_SRC).toMatch(/--geolocation/);
  });

  it('launcher.js accepts geolocation parameter', () => {
    expect(LAUNCHER_SRC).toMatch(/geolocation/i);
  });

  it('launcher parses lat,lng format', () => {
    // e.g. "37.7749,-122.4194" → { latitude: 37.7749, longitude: -122.4194 }
    expect(EMULATION_SRC).toMatch(/latitude|lat/i);
    expect(EMULATION_SRC).toMatch(/longitude|lng|lon/i);
  });

  it('launcher sets geolocation via CDP Emulation.setGeolocationOverride', () => {
    expect(EMULATION_SRC).toMatch(/setGeolocationOverride|Emulation.*[Gg]eolocation|overrideGeolocation/);
  });
});
