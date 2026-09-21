// test/unit/recorder-highlight.test.js
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const HL_PATH = path.join(__dirname, '../../src/recorder-modules/highlight.js');
const RECORDER_SRC_PATH = path.join(__dirname, '../../src/recorder.source.js');

describe('src/recorder-modules/highlight.js: file structure', () => {
  it('highlight.js file exists', () => {
    expect(fs.existsSync(HL_PATH)).toBe(true);
  });

  it('exports createHighlight', () => {
    const src = fs.readFileSync(HL_PATH, 'utf8');
    expect(src).toMatch(/export function createHighlight/);
  });

  it('injects element with id __wdio_highlight_overlay__', () => {
    const src = fs.readFileSync(HL_PATH, 'utf8');
    expect(src).toMatch(/__wdio_highlight_overlay__/);
  });

  it('has showHover, clearHover, showQuery, clearQuery in returned API', () => {
    const src = fs.readFileSync(HL_PATH, 'utf8');
    expect(src).toMatch(/showHover/);
    expect(src).toMatch(/clearHover/);
    expect(src).toMatch(/showQuery/);
    expect(src).toMatch(/clearQuery/);
  });
});

describe('src/recorder.source.js: imports from recorder-modules/highlight', () => {
  it('imports createHighlight from recorder-modules/highlight.js', () => {
    const src = fs.readFileSync(RECORDER_SRC_PATH, 'utf8');
    expect(src).toMatch(/from ['"]\.\/recorder-modules\/highlight\.js['"]/);
  });

  it('no longer defines injectHighlight locally', () => {
    const src = fs.readFileSync(RECORDER_SRC_PATH, 'utf8');
    expect(src).not.toMatch(/^  function injectHighlight/m);
  });
});
