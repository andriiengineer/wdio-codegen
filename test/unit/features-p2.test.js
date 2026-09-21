/**
 * Content-based smoke tests.
 * Verify source files contain the expected patterns without running the full UI.
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const read = (rel) => fs.readFileSync(path.join(__dirname, '../..', rel), 'utf8');

const RECORDER  = read('src/recorder.content.js');
const TOOLBAR   = read('ui-src/components/Toolbar.tsx');
const SIDEBAR   = read('ui-src/components/Sidebar.tsx');
const CODE_PANEL = read('ui-src/components/CodePanel.tsx');
const BIN       = read('bin/wdio-codegen.js');
const LAUNCHER  = read('src/launcher.js');

// ── toBeChecked in recorder context menu ──────────────────────────────────────
describe('toBeChecked in recorder context menu', () => {
  it('recorder context menu has "Is checked" or "toBeChecked" item', () => {
    expect(RECORDER).toMatch(/toBeChecked|is.checked/i);
  });

  it('recorder sends assert:toBeChecked event', () => {
    expect(RECORDER).toContain("assert:toBeChecked");
  });
});

// ── not. assertions in recorder context menu ─────────────────────────────────
describe('not. assertions in recorder context menu', () => {
  it('recorder has assert:not:toBeDisplayed event', () => {
    expect(RECORDER).toContain('assert:not:toBeDisplayed');
  });

  it('recorder context menu offers "not visible" / "hidden" option', () => {
    expect(RECORDER).toMatch(/not.visible|not.*displayed|is.hidden|hidden|not.toBeDisplayed/i);
  });
});

// ── --test-id-attribute CLI flag ─────────────────────────────────────────────
describe('--test-id-attribute CLI flag', () => {
  it('bin/wdio-codegen.js has test-id-attribute option', () => {
    expect(BIN).toContain('test-id-attribute');
  });

  it('CLI help text mentions --test-id-attribute', () => {
    expect(BIN).toContain('--test-id-attribute');
  });
});

// ── P2: Auth state persistence ────────────────────────────────────────────────
describe('Auth state persistence (--save-storage / --load-storage)', () => {
  it('bin/wdio-codegen.js has save-storage option', () => {
    expect(BIN).toContain('save-storage');
  });

  it('bin/wdio-codegen.js has load-storage option', () => {
    expect(BIN).toContain('load-storage');
  });

  it('launcher.js implements saveStorage logic', () => {
    expect(LAUNCHER).toContain('saveStorage');
  });

  it('launcher.js implements loadStorage logic', () => {
    expect(LAUNCHER).toContain('loadStorage');
  });
});

// ── P2: Editable CodeMirror ───────────────────────────────────────────────────
describe('Editable CodeMirror', () => {
  it('CodePanel is editable (editable={true})', () => {
    // Must NOT have editable={false} without a condition
    expect(CODE_PANEL).not.toContain('editable={false}');
  });

  it('CodePanel has onChange handler for locator extraction', () => {
    expect(CODE_PANEL).toContain('onChange');
  });
});

// ── P2: Locator candidates in Sidebar ────────────────────────────────────────
describe('Alternative locator candidates in Sidebar', () => {
  it('Sidebar imports getLocatorCandidates or receives candidates prop', () => {
    expect(SIDEBAR).toMatch(/candidates|getLocatorCandidates|alternativ/i);
  });

  it('Sidebar renders locator candidates list', () => {
    expect(SIDEBAR).toMatch(/candidates\.map|candidateList|alt.*locator/i);
  });
});

// ── P2: Semantic Log tab ──────────────────────────────────────────────────────
describe('Semantic Log tab (human-readable labels)', () => {
  it('Sidebar LogTab uses label field (not just raw code text)', () => {
    expect(SIDEBAR).toMatch(/\.label|humanLabel|l\.label/);
  });

  it('LineEntry type has label field', () => {
    const TYPES = read('ui-src/types.ts');
    expect(TYPES).toContain('label');
  });
});
