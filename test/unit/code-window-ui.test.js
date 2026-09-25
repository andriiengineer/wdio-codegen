// test/unit/code-window-ui.test.js
// Code window (ui-src) source checks:
// 1. read-only CodeMirror
// 2. alternative locator candidates in Sidebar
// 3. Semantic Log tab
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const read = (rel) => fs.readFileSync(path.join(__dirname, '../..', rel), 'utf8');

const SIDEBAR   = read('ui-src/components/Sidebar.tsx');
const CODE_PANEL = read('ui-src/components/CodePanel.tsx');

// ── 1. Read-only CodeMirror ──────────────────────────────────────────────────
// The code is rebuilt from recorded lines on every action, and Copy/Save take those
// lines too, so anything typed into the editor would silently vanish.
describe('Read-only CodeMirror', () => {
  it('CodePanel is read-only (editable={false})', () => {
    expect(CODE_PANEL).toContain('editable={false}');
  });

  it('CodePanel has no onChange handler and no onLocatorEdit prop', () => {
    expect(CODE_PANEL).not.toContain('onChange');
    expect(CODE_PANEL).not.toContain('onLocatorEdit');
  });
});

// ── 2. Locator candidates in Sidebar ─────────────────────────────────────────
describe('Alternative locator candidates in Sidebar', () => {
  it('Sidebar imports getLocatorCandidates or receives candidates prop', () => {
    expect(SIDEBAR).toMatch(/candidates|getLocatorCandidates|alternativ/i);
  });

  it('Sidebar renders locator candidates list', () => {
    expect(SIDEBAR).toMatch(/candidates\.map|candidateList|alt.*locator/i);
  });
});

// ── 3. Semantic Log tab ──────────────────────────────────────────────────────
describe('Semantic Log tab (human-readable labels)', () => {
  it('Sidebar LogTab uses label field (not just raw code text)', () => {
    expect(SIDEBAR).toMatch(/\.label|humanLabel|l\.label/);
  });

  it('LineEntry type has label field', () => {
    const TYPES = read('ui-src/types.ts');
    expect(TYPES).toContain('label');
  });
});
