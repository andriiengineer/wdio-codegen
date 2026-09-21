// test/unit/build-step.test.js
// TDD: build step eliminates locator engine duplication
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '../..');
const RECORDER_SOURCE_PATH = path.join(ROOT, 'src/recorder.source.js');
const RECORDER_BUNDLE_PATH = path.join(ROOT, 'src/recorder.content.js');
const PKG_PATH = path.join(ROOT, 'package.json');

const SRC    = fs.existsSync(RECORDER_SOURCE_PATH) ? fs.readFileSync(RECORDER_SOURCE_PATH, 'utf8') : '';
const BUNDLE = fs.readFileSync(RECORDER_BUNDLE_PATH, 'utf8');
const PKG    = JSON.parse(fs.readFileSync(PKG_PATH, 'utf8'));

// ── 1. recorder.source.js is the single source of truth ───────────────────
describe('recorder.source.js: source file with imports', () => {
  it('recorder.source.js exists', () => {
    expect(fs.existsSync(RECORDER_SOURCE_PATH)).toBe(true);
  });

  it('imports getBestLocator from locator-engine.js (directly or via recorder-modules)', () => {
    const locatorModule = fs.readFileSync(path.join(ROOT, 'src/recorder-modules/recorder-locator.js'), 'utf8');
    const helpersModule = fs.existsSync(path.join(ROOT, 'src/recorder-modules/recorder-helpers.js'))
      ? fs.readFileSync(path.join(ROOT, 'src/recorder-modules/recorder-helpers.js'), 'utf8') : '';
    const hasImport = SRC.match(/import[^;]+getBestLocator[^;]+locator-engine/) ||
      locatorModule.match(/import[^;]+getBestLocator[^;]+locator-engine/) ||
      helpersModule.match(/import[^;]+getBestLocator[^;]+locator-engine/);
    expect(hasImport).toBeTruthy();
  });

  it('imports isUnstableClass from class-filter.js (directly or via recorder-locator)', () => {
    const locatorModule = fs.readFileSync(path.join(ROOT, 'src/recorder-modules/recorder-locator.js'), 'utf8');
    const hasImport = SRC.match(/import[^;]+isUnstableClass[^;]+class-filter/) ||
      locatorModule.match(/import[^;]+isUnstableClass[^;]+class-filter/);
    expect(hasImport).toBeTruthy();
  });

  it('does NOT contain inline isUnstableClass function definition', () => {
    expect(SRC).not.toMatch(/function isUnstableClass/);
  });

  it('does NOT contain inline getBestLocator function definition', () => {
    expect(SRC).not.toMatch(/function getBestLocator/);
  });

  it('does NOT contain inline isGeneratedId function definition', () => {
    expect(SRC).not.toMatch(/function isGeneratedId/);
  });

  it('does NOT contain "keep in sync" duplication comments', () => {
    expect(SRC).not.toMatch(/keep in sync/i);
  });

  it('does NOT contain "mirrors src/locator-engine" comment', () => {
    expect(SRC).not.toMatch(/mirrors src\/locator-engine/);
  });

  it('does NOT contain "mirrors src/class-filter" comment', () => {
    expect(SRC).not.toMatch(/mirrors src\/class-filter/);
  });
});

// ── 2. package.json build script ──────────────────────────────────────────
describe('package.json build script', () => {
  it('has a build script', () => {
    expect(PKG.scripts).toHaveProperty('build');
  });

  it('build script uses esbuild', () => {
    expect(PKG.scripts.build).toMatch(/esbuild/);
  });

  it('build script bundles recorder.source.js', () => {
    expect(PKG.scripts.build).toMatch(/recorder\.source\.js/);
  });

  it('build output is recorder.content.js', () => {
    expect(PKG.scripts.build).toMatch(/recorder\.content\.js/);
  });
});

// ── recorder.source.js is a thin entry point ──────────────────────────────
describe('recorder.source.js: thin entry point', () => {
  it('recorder.source.js is under 200 lines after refactoring', () => {
    const src = fs.readFileSync(path.join(__dirname, '../../src/recorder.source.js'), 'utf8');
    const lineCount = src.split('\n').length;
    expect(lineCount).toBeLessThan(200);
  });

  it('recorder.source.js imports from all five recorder-modules', () => {
    const src = fs.readFileSync(path.join(__dirname, '../../src/recorder.source.js'), 'utf8');
    expect(src).toMatch(/recorder-modules\/toolbar\.js/);
    expect(src).toMatch(/recorder-modules\/highlight\.js/);
    expect(src).toMatch(/recorder-modules\/context-menu\.js/);
    expect(src).toMatch(/recorder-modules\/assert-forms\.js/);
    expect(src).toMatch(/recorder-modules\/event-listeners\.js/);
  });
});

// ── 3. recorder.content.js (bundle) still contains everything ─────────────
describe('recorder.content.js (bundle): still complete', () => {
  it('bundle contains getBestLocator logic', () => {
    expect(BUNDLE).toMatch(/getBestLocator/);
  });

  it('bundle contains isUnstableClass logic', () => {
    expect(BUNDLE).toMatch(/isUnstableClass/);
  });

  it('bundle contains isGeneratedId logic', () => {
    expect(BUNDLE).toMatch(/isGeneratedId/);
  });

  it('bundle is valid IIFE (double-injection guard)', () => {
    expect(BUNDLE).toMatch(/__wdioRecorderActive/);
  });
});
