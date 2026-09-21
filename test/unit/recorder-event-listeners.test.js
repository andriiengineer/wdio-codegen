// test/unit/recorder-event-listeners.test.js
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const EL_PATH = path.join(__dirname, '../../src/recorder-modules/event-listeners.js');
const RECORDER_SRC_PATH = path.join(__dirname, '../../src/recorder.source.js');

describe('src/recorder-modules/event-listeners.js: file structure', () => {
  it('event-listeners.js file exists', () => {
    expect(fs.existsSync(EL_PATH)).toBe(true);
  });

  it('exports attachEventListeners', () => {
    const src = fs.readFileSync(EL_PATH, 'utf8');
    expect(src).toMatch(/export function attachEventListeners/);
  });

  it('registers click event listener', () => {
    const src = fs.readFileSync(EL_PATH, 'utf8');
    expect(src).toMatch(/'click'/);
  });

  it('registers keydown event listener', () => {
    const src = fs.readFileSync(EL_PATH, 'utf8');
    expect(src).toMatch(/'keydown'/);
  });

  it('registers dragstart and drop event listeners', () => {
    const src = fs.readFileSync(EL_PATH, 'utf8');
    expect(src).toMatch(/'dragstart'/);
    expect(src).toMatch(/'drop'/);
  });
});

describe('src/recorder.source.js: imports from recorder-modules/event-listeners', () => {
  it('imports attachEventListeners from recorder-modules/event-listeners.js', () => {
    const src = fs.readFileSync(RECORDER_SRC_PATH, 'utf8');
    expect(src).toMatch(/from ['"]\.\/recorder-modules\/event-listeners\.js['"]/);
  });

  it('no longer has inline click event listener', () => {
    const src = fs.readFileSync(RECORDER_SRC_PATH, 'utf8');
    expect(src).not.toMatch(/document\.addEventListener\('click',\s*\(e\) =>/);
  });
});

describe('Assert URL records a stable path', () => {
  // location.search carries session ids and utm_* tags that differ on every run.
  // Recording them made the assertion pass once and fail on every replay, so the
  // context menu is given the path only.
  it('does not put location.search into the URL assertion', () => {
    const src = fs.readFileSync(EL_PATH, 'utf8');
    const line = src.split('\n').find(l => l.includes('currentUrl:'));
    expect(line).toBeDefined();
    expect(line).toContain('location.pathname');
    expect(line).not.toContain('location.search');
  });
});
