// test/unit/features-ux-p3.test.js
// P3 UX features:
// 1. rightClick recording (context menu + codegen)
// 2. openPage / switchWindow (new tab → browser.switchWindow())
// 3. --viewport-size CLI flag
// 4. --device CLI flag + device profiles
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
const VIEWPORT_SRC = fs.existsSync(path.join(__dirname, '../../src/launcher/viewport.js'))
  ? fs.readFileSync(path.join(__dirname, '../../src/launcher/viewport.js'), 'utf8')
  : '';
const CLI_SRC = fs.readFileSync(
  path.join(__dirname, '../../bin/wdio-codegen.js'), 'utf8'
);

// ── 1. rightClick ────────────────────────────────────────────────────────────
describe('rightClick: codegen', () => {
  it('generates click({ button: right }) for rightClick event', () => {
    const line = generateLine({ type: 'rightClick', locator: '#ctx-menu-trigger' });
    expect(line).toBe(`    await $('#ctx-menu-trigger').click({ button: 'right' });`);
  });

  it('generates rightClick with frame selector', () => {
    const line = generateLine({ type: 'rightClick', locator: '#btn', _frame: 'iframe.app' });
    expect(line).toBe([
      `    await browser.switchFrame($('iframe.app'));`,
      `    await $('#btn').click({ button: 'right' });`,
      `    await browser.switchFrame(null);`,
    ].join('\n'));
  });

  it('getHumanLabel returns emoji label for rightClick', () => {
    expect(getHumanLabel({ type: 'rightClick', locator: '#btn' }))
      .toMatch(/right.?click/i);
  });
});

describe('rightClick: recorder context menu', () => {
  it('has "Record right-click" item in context menu items list', () => {
    expect(RECORDER_SRC).toMatch(/Record right.?click/i);
  });

  it('sends rightClick event type from context menu', () => {
    expect(RECORDER_SRC).toMatch(/type:\s*["']rightClick["']/);
  });
});

// ── 2. openPage / switchWindow ───────────────────────────────────────────────
describe('openPage: codegen', () => {
  it('generates browser.switchWindow() for openPage event', () => {
    const line = generateLine({ type: 'openPage', url: 'https://example.com/new' });
    expect(line).toBe(`    await browser.switchWindow('https://example.com/new');`);
  });

  it('escapes quotes in url for switchWindow', () => {
    const line = generateLine({ type: 'openPage', url: "https://ex.com/path?q=it's" });
    expect(line).toBe(`    await browser.switchWindow('https://ex.com/path?q=it\\'s');`);
  });

  it('getHumanLabel returns emoji label for openPage', () => {
    const label = getHumanLabel({ type: 'openPage', url: 'https://example.com' });
    expect(label).toMatch(/tab|window|switch/i);
    expect(label).toContain('example.com');
  });
});

describe('openPage: launcher emits event on new tab', () => {
  it('launcher.js emits openPage event when new tab opens (targetcreated)', () => {
    // launcher.js calls addEvent({ type: 'openPage', url: ... }) from
    // pptr.on('targetcreated') when a new page is created.
    expect(LAUNCHER_SRC).toMatch(/openPage/);
  });

  it('launcher emits openPage after setupPage in targetcreated handler', () => {
    // openPage must come after setupPage so the recorder is already injected.
    const setupIdx = LAUNCHER_SRC.indexOf('await setupPage(page)');
    const openPageIdx = LAUNCHER_SRC.indexOf("type: 'openPage'");
    expect(setupIdx).toBeGreaterThan(-1);
    expect(openPageIdx).toBeGreaterThan(-1);
    expect(openPageIdx).toBeGreaterThan(setupIdx);
  });
});

// ── 3. --viewport-size CLI flag ───────────────────────────────────────────────
describe('--viewport-size CLI flag', () => {
  it('bin/wdio-codegen.js has viewport-size option', () => {
    expect(CLI_SRC).toMatch(/['"]viewport-size['"]/);
  });

  it('launcher.js accepts viewportSize parameter', () => {
    expect(LAUNCHER_SRC).toMatch(/viewportSize/);
  });

  it('launcher applies viewport via Puppeteer page.setViewport when viewportSize provided', () => {
    expect(LAUNCHER_SRC + VIEWPORT_SRC).toMatch(/setViewport/);
  });

  it('viewport-size format WxH is parsed to width and height', () => {
    // The CLI or launcher must parse "1280x720" → { width: 1280, height: 720 }
    expect(LAUNCHER_SRC).toMatch(/split.*x|width.*height|(\d+).*x.*(\d+)/i);
  });

  it('help text mentions --viewport-size', () => {
    expect(CLI_SRC).toMatch(/viewport-size/);
  });
});

// ── 4. --device CLI flag ──────────────────────────────────────────────────────
describe('--device CLI flag', () => {
  it('bin/wdio-codegen.js has device option', () => {
    expect(CLI_SRC).toMatch(/['"]device['"]/);
  });

  it('launcher.js accepts device parameter', () => {
    expect(LAUNCHER_SRC).toMatch(/device/i);
  });

  it('launcher has DEVICES map with iPhone profile', () => {
    expect(LAUNCHER_SRC + VIEWPORT_SRC).toMatch(/iPhone/i);
  });

  it('launcher has DEVICES map with iPad profile', () => {
    expect(LAUNCHER_SRC + VIEWPORT_SRC).toMatch(/iPad/i);
  });

  it('launcher has DEVICES map with Pixel profile', () => {
    expect(LAUNCHER_SRC + VIEWPORT_SRC).toMatch(/Pixel/i);
  });

  it('device profile includes width, height fields', () => {
    expect(LAUNCHER_SRC).toMatch(/width.*height|height.*width/);
  });

  it('device profile includes userAgent field', () => {
    expect(LAUNCHER_SRC).toMatch(/userAgent/);
  });

  it('launcher applies device emulation via setViewport + setUserAgent', () => {
    expect(LAUNCHER_SRC + VIEWPORT_SRC).toMatch(/setViewport/);
    expect(LAUNCHER_SRC + VIEWPORT_SRC).toMatch(/setUserAgent/);
  });

  it('help text mentions --device', () => {
    expect(CLI_SRC).toMatch(/--device/);
  });
});
