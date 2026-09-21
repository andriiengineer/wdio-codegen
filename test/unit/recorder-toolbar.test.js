// test/unit/recorder-toolbar.test.js
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TOOLBAR_PATH = path.join(__dirname, '../../src/recorder-modules/toolbar.js');
const RECORDER_SRC_PATH = path.join(__dirname, '../../src/recorder.source.js');

describe('src/recorder-modules/toolbar.js: file structure', () => {
  it('toolbar.js file exists', () => {
    expect(fs.existsSync(TOOLBAR_PATH)).toBe(true);
  });

  it('exports createToolbar', () => {
    const src = fs.readFileSync(TOOLBAR_PATH, 'utf8');
    expect(src).toMatch(/export function createToolbar/);
  });

  it('createToolbar accepts onPause, onResume, onClear, onPick, onAssertMode callbacks', () => {
    const src = fs.readFileSync(TOOLBAR_PATH, 'utf8');
    expect(src).toMatch(/onPause/);
    expect(src).toMatch(/onResume/);
    expect(src).toMatch(/onClear/);
    expect(src).toMatch(/onPick/);
    expect(src).toMatch(/onAssertMode/);
  });

  it('toolbar injects element with id __wdio_toolbar__', () => {
    const src = fs.readFileSync(TOOLBAR_PATH, 'utf8');
    expect(src).toMatch(/__wdio_toolbar__/);
  });

  it('toolbar has drag-and-drop support', () => {
    const src = fs.readFileSync(TOOLBAR_PATH, 'utf8');
    expect(src).toMatch(/mousedown/);
    expect(src).toMatch(/mousemove/);
    expect(src).toMatch(/mouseup/);
  });
});

describe('src/recorder.source.js: imports from recorder-modules/toolbar', () => {
  it('imports createToolbar from recorder-modules/toolbar.js', () => {
    const src = fs.readFileSync(RECORDER_SRC_PATH, 'utf8');
    expect(src).toMatch(/from ['"]\.\/recorder-modules\/toolbar\.js['"]/);
  });

  it('no longer defines injectToolbar locally', () => {
    const src = fs.readFileSync(RECORDER_SRC_PATH, 'utf8');
    expect(src).not.toMatch(/^  function injectToolbar/m);
  });
});
