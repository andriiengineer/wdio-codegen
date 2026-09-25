// test/unit/right-click-new-tab.test.js
// Recorded actions:
// 1. rightClick recording (context menu + codegen)
// 2. openPage / switchWindow (new tab → browser.switchWindow())
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
