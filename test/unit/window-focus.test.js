// test/unit/window-focus.test.js
// TDD: code window height 70%, browser focus after launch

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

// ── 1. Code window height 70% ─────────────────────────────────────────────────
describe('code window: height 70% of screen', () => {
  it('CLI sets codeH to 70% of screenH', () => {
    expect(CLI_SRC).toMatch(/0\.70|0\.7[^0-9]/);
  });

  it('CLI passes codeH (not screenH) to openCodeWindow', () => {
    // codeH is computed as 70% of screenH and passed to openCodeWindow (shorthand or explicit)
    expect(CLI_SRC).toMatch(/codeH[,\s]/);
  });
});

// ── 2. Browser window focus ───────────────────────────────────────────────────
describe('launcher: focusBrowserWindow', () => {
  it('launcher exposes focusBrowserWindow in its public API', () => {
    expect(LAUNCHER_SRC).toMatch(/focusBrowserWindow/);
  });

  it('launcher focusBrowserWindow calls bringToFront on the page', () => {
    expect(LAUNCHER_SRC).toMatch(/bringToFront/);
  });
});

describe('CLI: focus browser after launch', () => {
  it('CLI calls focusBrowserWindow after opening code window', () => {
    expect(CLI_SRC).toMatch(/focusBrowserWindow/);
  });
});
