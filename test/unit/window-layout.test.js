// test/unit/window-layout.test.js
// Side-by-side layout: browser (left) + code window (right)

import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LAUNCHER_SRC = fs.readFileSync(
  path.join(__dirname, '../../src/launcher.js'), 'utf8'
);
const CLI_SRC = fs.readFileSync(
  path.join(__dirname, '../../bin/wdio-codegen.js'), 'utf8'
);

// ── 1. launcher.js accepts windowBounds ───────────────────────────────────────
describe('launcher: windowBounds param', () => {
  it('launcher accepts windowBounds parameter', () => {
    expect(LAUNCHER_SRC).toMatch(/windowBounds/);
  });

  it('launcher adds --window-size Chrome arg from windowBounds', () => {
    expect(LAUNCHER_SRC).toMatch(/window-size/);
  });

  it('launcher adds --window-position Chrome arg from windowBounds', () => {
    expect(LAUNCHER_SRC).toMatch(/window-position/);
  });
});

// ── 2. CLI: side-by-side layout (browser left, code window right) ─────────────
describe('CLI: side-by-side window layout', () => {
  it('CLI passes windowBounds to launcher', () => {
    expect(CLI_SRC).toMatch(/windowBounds/);
  });

  it('CLI computes browserW as left portion of screen width', () => {
    expect(CLI_SRC).toMatch(/browserW\s*=|browserWidth\s*=/);
  });

  it('CLI computes codeW as right portion of screen width', () => {
    expect(CLI_SRC).toMatch(/codeW\s*=|codeWidth\s*=/);
  });

  it('browser window starts at x=0 (left edge)', () => {
    expect(CLI_SRC).toMatch(/x:\s*0.*browserW|browserWindowBounds.*x:\s*0/);
  });

  it('code window starts at x=browserW (right of browser)', () => {
    expect(CLI_SRC).toMatch(/codeX:\s*browserW/);
  });

  it('both windows start at y=0 (full height, side-by-side)', () => {
    expect(CLI_SRC).toMatch(/codeY:\s*0/);
  });
});
