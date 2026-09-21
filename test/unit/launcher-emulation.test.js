// test/unit/launcher-emulation.test.js
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const EM_PATH = path.join(__dirname, '../../src/launcher/emulation.js');
const LAUNCHER_SRC = fs.readFileSync(path.join(__dirname, '../../src/launcher.js'), 'utf8');

describe('src/launcher/emulation.js: module exists and exports', () => {
  it('emulation.js file exists', () => {
    expect(fs.existsSync(EM_PATH)).toBe(true);
  });

  it('exports applyEmulation function', async () => {
    const m = await import(EM_PATH);
    expect(typeof m.applyEmulation).toBe('function');
  });
});

describe('src/launcher/emulation.js: CDP calls present in source', () => {
  it('applies geolocation via Emulation.setGeolocationOverride', () => {
    const src = fs.readFileSync(EM_PATH, 'utf8');
    expect(src).toMatch(/setGeolocationOverride/);
  });

  it('applies timezone via Emulation.setTimezoneOverride', () => {
    const src = fs.readFileSync(EM_PATH, 'utf8');
    expect(src).toMatch(/setTimezoneOverride/);
  });

  it('applies color scheme via Emulation.setEmulatedMedia', () => {
    const src = fs.readFileSync(EM_PATH, 'utf8');
    expect(src).toMatch(/setEmulatedMedia/);
  });
});

describe('src/launcher.js: imports emulation from sub-module', () => {
  it('imports applyEmulation from ./launcher/emulation.js', () => {
    expect(LAUNCHER_SRC).toMatch(/from ['"]\.\/launcher\/emulation\.js['"]/);
  });

  it('no longer defines geolocation CDP inline', () => {
    expect(LAUNCHER_SRC).not.toMatch(/setGeolocationOverride/);
  });

  it('no longer defines timezone CDP inline', () => {
    expect(LAUNCHER_SRC).not.toMatch(/setTimezoneOverride/);
  });
});
