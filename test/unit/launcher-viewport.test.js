// test/unit/launcher-viewport.test.js
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const VP_PATH = path.join(__dirname, '../../src/launcher/viewport.js');
const LAUNCHER_SRC = fs.readFileSync(path.join(__dirname, '../../src/launcher.js'), 'utf8');

describe('src/launcher/viewport.js: module exists and exports', () => {
  it('viewport.js file exists', () => {
    expect(fs.existsSync(VP_PATH)).toBe(true);
  });

  it('exports DEVICES map', async () => {
    const m = await import(VP_PATH);
    expect(m.DEVICES).toBeDefined();
    expect(typeof m.DEVICES).toBe('object');
  });

  it('DEVICES includes iPhone 12', async () => {
    const { DEVICES } = await import(VP_PATH);
    expect(DEVICES['iPhone 12']).toBeDefined();
    expect(DEVICES['iPhone 12'].width).toBe(390);
  });

  it('exports applyViewport function', async () => {
    const m = await import(VP_PATH);
    expect(typeof m.applyViewport).toBe('function');
  });
});

describe('src/launcher.js: imports viewport from sub-module', () => {
  it('imports DEVICES or applyViewport from ./launcher/viewport.js', () => {
    expect(LAUNCHER_SRC).toMatch(/from ['"]\.\/launcher\/viewport\.js['"]/);
  });

  it('no longer defines DEVICES locally', () => {
    expect(LAUNCHER_SRC).not.toMatch(/^const DEVICES\s*=/m);
  });
});
