// test/unit/recorder-context-menu.test.js
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CM_PATH = path.join(__dirname, '../../src/recorder-modules/context-menu.js');
const RECORDER_SRC_PATH = path.join(__dirname, '../../src/recorder.source.js');

describe('src/recorder-modules/context-menu.js: file structure', () => {
  it('context-menu.js file exists', () => {
    expect(fs.existsSync(CM_PATH)).toBe(true);
  });

  it('exports showContextMenu', () => {
    const src = fs.readFileSync(CM_PATH, 'utf8');
    expect(src).toMatch(/export function showContextMenu/);
  });

  it('creates menu element with id __wdio_assert_menu__', () => {
    const src = fs.readFileSync(CM_PATH, 'utf8');
    expect(src).toMatch(/__wdio_assert_menu__/);
  });

  it('has ADD ASSERTION header text', () => {
    const src = fs.readFileSync(CM_PATH, 'utf8');
    expect(src).toMatch(/ADD ASSERTION/);
  });
});

describe('src/recorder.source.js: imports from recorder-modules/context-menu', () => {
  it('imports showContextMenu from recorder-modules/context-menu.js', () => {
    const src = fs.readFileSync(RECORDER_SRC_PATH, 'utf8');
    expect(src).toMatch(/from ['"]\.\/recorder-modules\/context-menu\.js['"]/);
  });

  it('no longer defines removeMenu locally', () => {
    const src = fs.readFileSync(RECORDER_SRC_PATH, 'utf8');
    expect(src).not.toMatch(/^  function removeMenu/m);
  });
});
