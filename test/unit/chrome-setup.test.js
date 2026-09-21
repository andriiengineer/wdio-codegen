// test/unit/chrome-setup.test.js
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SETUP_PATH = path.join(__dirname, '../../bin/chrome-setup.js');
const CLI_SRC = fs.readFileSync(path.join(__dirname, '../../bin/wdio-codegen.js'), 'utf8');

describe('bin/chrome-setup.js: module exists and exports', () => {
  it('chrome-setup.js file exists', () => {
    expect(fs.existsSync(SETUP_PATH)).toBe(true);
  });

  it('exports findChromeBin', async () => {
    const m = await import(SETUP_PATH);
    expect(typeof m.findChromeBin).toBe('function');
  });

  it('exports getScreenSize', async () => {
    const m = await import(SETUP_PATH);
    expect(typeof m.getScreenSize).toBe('function');
  });

  it('exports openCodeWindow', async () => {
    const m = await import(SETUP_PATH);
    expect(typeof m.openCodeWindow).toBe('function');
  });

  it('exports setCodeWindowDockIcon', async () => {
    const m = await import(SETUP_PATH);
    expect(typeof m.setCodeWindowDockIcon).toBe('function');
  });
});

describe('bin/wdio-codegen.js: imports from chrome-setup', () => {
  it('imports from ./chrome-setup.js', () => {
    expect(CLI_SRC).toMatch(/from ['"]\.\/chrome-setup\.js['"]/);
  });

  it('no longer defines findChromeBin locally', () => {
    expect(CLI_SRC).not.toMatch(/^function findChromeBin/m);
  });

  it('no longer defines getScreenSize locally', () => {
    expect(CLI_SRC).not.toMatch(/^function getScreenSize/m);
  });

  it('does not reference ensureChromeBinary at all: WDIO owns the bootstrap now', () => {
    expect(CLI_SRC).not.toContain('ensureChromeBinary');
  });

  it('no longer defines openCodeWindow locally', () => {
    expect(CLI_SRC).not.toMatch(/^function openCodeWindow/m);
  });

  it('no longer defines setCodeWindowDockIcon locally', () => {
    expect(CLI_SRC).not.toMatch(/^async function setCodeWindowDockIcon/m);
  });
});

// ── Browser bootstrap belongs to WebdriverIO ─────────────────────────────────
// Browser bootstrap is delegated to WebdriverIO: we ship no chromedriver dependency,
// read no path inside node_modules at runtime, and pin no Chrome version.
describe('no second browser bootstrap of our own', () => {
  const PKG = JSON.parse(fs.readFileSync(path.join(__dirname, '../../package.json'), 'utf8'));
  const SETUP_SRC = fs.readFileSync(SETUP_PATH, 'utf8');
  const LAUNCHER_SRC = fs.readFileSync(path.join(__dirname, '../../src/launcher.js'), 'utf8');

  it('chromedriver is not a dependency', () => {
    // WDIO fetches its own driver; the package only ever supplied a version string.
    expect(PKG.dependencies).not.toHaveProperty('chromedriver');
    expect(PKG.devDependencies ?? {}).not.toHaveProperty('chromedriver');
  });

  it('no code reads a path inside node_modules at runtime', () => {
    // Such paths resolve in the repo and vanish once npm hoists the dependency.
    for (const src of [SETUP_SRC, CLI_SRC, LAUNCHER_SRC]) {
      expect(src).not.toContain('node_modules');
    }
  });

  it('no Chrome version is pinned anywhere in our code', () => {
    // Version resolution is WDIO's job; a hardcoded major goes stale on its own.
    for (const src of [SETUP_SRC, CLI_SRC, LAUNCHER_SRC]) {
      expect(src).not.toMatch(/resolveBuildId|ChromeReleaseChannel/);
    }
  });

  it('the launcher points WDIO at a persistent cache directory', () => {
    // WDIO defaults its cacheDir to os.tmpdir(); a reboot would mean re-downloading ~150 MB.
    expect(LAUNCHER_SRC).toContain('cacheDir: BROWSER_CACHE_DIR');
    expect(LAUNCHER_SRC).toMatch(/BROWSER_CACHE_DIR\s*=/);
  });

  it('the cache directory is under the user home, not a temp dir', async () => {
    const { BROWSER_CACHE_DIR } = await import(path.join(__dirname, '../../src/launcher.js'));
    expect(BROWSER_CACHE_DIR.startsWith(os.tmpdir())).toBe(false);
    expect(BROWSER_CACHE_DIR).toContain('wdio-codegen');
  });

  it('the CI workaround for the chromedriver postinstall is gone', () => {
    const wf = fs.readFileSync(path.join(__dirname, '../../.github/workflows/test.yml'), 'utf8');
    expect(wf).not.toContain('CHROMEDRIVER_SKIP_DOWNLOAD');
  });
});
