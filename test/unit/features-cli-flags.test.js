// test/unit/features-cli-flags.test.js
// CLI flags:
// 1. --timezone "Europe/Rome"
// 2. --lang "fr-FR"
// 3. --color-scheme light/dark
// 4. --user-agent "..."
// 5. --proxy-server "http://proxy:8080"
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CLI_SRC = fs.readFileSync(path.join(__dirname, '../../bin/wdio-codegen.js'), 'utf8');
const LAUNCHER_SRC = fs.readFileSync(path.join(__dirname, '../../src/launcher.js'), 'utf8');
const EMULATION_SRC = fs.readFileSync(path.join(__dirname, '../../src/launcher/emulation.js'), 'utf8');

// ── 1. --timezone ─────────────────────────────────────────────────────────────
describe('--timezone flag', () => {
  it('bin has timezone option', () => {
    expect(CLI_SRC).toMatch(/['"]timezone['"]/);
  });
  it('help text mentions --timezone', () => {
    expect(CLI_SRC).toMatch(/--timezone/);
  });
  it('launcher accepts timezone param', () => {
    expect(LAUNCHER_SRC).toMatch(/timezone/i);
  });
  it('launcher applies timezone via CDP Emulation.setTimezoneOverride', () => {
    expect(EMULATION_SRC).toMatch(/setTimezoneOverride/);
  });
});

// ── 2. --lang ─────────────────────────────────────────────────────────────────
describe('--lang flag', () => {
  it('bin has lang option', () => {
    expect(CLI_SRC).toMatch(/['"]lang['"]/);
  });
  it('help text mentions --lang', () => {
    expect(CLI_SRC).toMatch(/--lang/);
  });
  it('launcher accepts lang param', () => {
    expect(LAUNCHER_SRC).toMatch(/\blang\b/);
  });
  it('launcher passes --lang to Chrome args', () => {
    expect(LAUNCHER_SRC).toMatch(/--lang=/);
  });
});

// ── 3. --color-scheme ─────────────────────────────────────────────────────────
describe('--color-scheme flag', () => {
  it('bin has color-scheme option', () => {
    expect(CLI_SRC).toMatch(/['"]color-scheme['"]/);
  });
  it('help text mentions --color-scheme', () => {
    expect(CLI_SRC).toMatch(/--color-scheme/);
  });
  it('launcher accepts colorScheme param', () => {
    expect(LAUNCHER_SRC).toMatch(/colorScheme/);
  });
  it('launcher applies color scheme via CDP Emulation.setEmulatedMedia', () => {
    expect(EMULATION_SRC).toMatch(/setEmulatedMedia/);
  });
});

// ── 4. --user-agent ───────────────────────────────────────────────────────────
describe('--user-agent flag', () => {
  it('bin has user-agent option', () => {
    expect(CLI_SRC).toMatch(/['"]user-agent['"]/);
  });
  it('help text mentions --user-agent', () => {
    expect(CLI_SRC).toMatch(/--user-agent/);
  });
  it('launcher accepts userAgent param', () => {
    expect(LAUNCHER_SRC).toMatch(/userAgent/);
  });
  it('launcher applies user agent via page.setUserAgent', () => {
    expect(EMULATION_SRC).toMatch(/setUserAgent/);
  });
});

// ── 5. --proxy-server ─────────────────────────────────────────────────────────
describe('--proxy-server flag', () => {
  it('bin has proxy-server option', () => {
    expect(CLI_SRC).toMatch(/['"]proxy-server['"]/);
  });
  it('help text mentions --proxy-server', () => {
    expect(CLI_SRC).toMatch(/--proxy-server/);
  });
  it('launcher accepts proxyServer param', () => {
    expect(LAUNCHER_SRC).toMatch(/proxyServer/);
  });
  it('launcher passes --proxy-server to Chrome args', () => {
    expect(LAUNCHER_SRC).toMatch(/--proxy-server=/);
  });
});

// ── 6. --version and argument-parsing errors ─────────────────────────────────
// parseArgs runs in strict mode at module top level, so an unknown flag throws
// ERR_PARSE_ARGS_UNKNOWN_OPTION before main() is reached; these guards catch it.
describe('--version flag', () => {
  it('bin declares a version option with -V short form', () => {
    expect(CLI_SRC).toMatch(/version:\s*\{\s*type:\s*'boolean',\s*short:\s*'V'\s*\}/);
  });
  it('help text mentions --version', () => {
    expect(CLI_SRC).toMatch(/--version/);
  });
  it('version is read from package.json, not hardcoded', () => {
    expect(CLI_SRC).toMatch(/readFileSync\(new URL\('\.\.\/package\.json'/);
  });
});

describe('argument parsing errors stay readable', () => {
  it('parseArgs is wrapped in try/catch', () => {
    expect(CLI_SRC).toMatch(/try\s*\{[\s\S]*?parseArgs\(\{[\s\S]*?\}\s*catch\s*\(/);
  });
  it('unknown flags print a prefixed message, not a stack trace', () => {
    expect(CLI_SRC).toMatch(/\[wdio-codegen\] Error: \$\{err\.message/);
    expect(CLI_SRC).toMatch(/--help` to see the available options/);
  });
  it('main() has a catch so start-up failures are not unhandled rejections', () => {
    expect(CLI_SRC).toMatch(/main\(\)\.catch\(/);
  });
});

// ── 7. Hardening and first-run UX ────────────────────────────────────────────
describe('auth state file permissions', () => {
  it('auth.json is written with mode 0600', () => {
    expect(LAUNCHER_SRC).toMatch(/mode:\s*0o600/);
  });
  it('permissions are also tightened on rewrite', () => {
    // writeFileSync's `mode` only applies when the file is created; re-running
    // --save-storage into an existing file would otherwise keep 0644.
    expect(LAUNCHER_SRC).toMatch(/chmodSync\(saveStorage,\s*0o600\)/);
  });
});

describe('signal handlers are installed before the slow start-up', () => {
  it('SIGINT is registered before createLauncher is called', () => {
    const sig = CLI_SRC.indexOf("process.on('SIGINT'");
    const launcher = CLI_SRC.indexOf('createLauncher(');
    expect(sig).toBeGreaterThan(-1);
    expect(launcher).toBeGreaterThan(-1);
    // The first run downloads ~150 MB of Chrome; a Ctrl+C during that window used to
    // kill node outright and leave chromedriver, Chrome and the temp profile behind.
    expect(sig).toBeLessThan(launcher);
  });
  it('SIGTERM is registered in the same place', () => {
    expect(CLI_SRC.indexOf("process.on('SIGTERM'")).toBeLessThan(CLI_SRC.indexOf('createLauncher('));
  });
  it('shutdown can clean up a launcher that is still starting', () => {
    // Registering the handler early is not enough: mid-start-up `launcher` is still
    // undefined while chromedriver and the temp profile already exist inside the pending
    // createLauncher call. shutdown awaits that promise to get the object that owns them.
    expect(CLI_SRC).toMatch(/launcherPromise\s*=\s*createLauncher\(/);
    expect(CLI_SRC).toMatch(/launcher \?\? await Promise\.race\(/);
  });
});

describe('start-up tells the user what is happening', () => {
  it('announces what is being recorded', () => {
    expect(CLI_SRC).toMatch(/Recording: \$\{targetUrl\}/);
  });
  it('announces the code window port', () => {
    expect(CLI_SRC).toMatch(/Code window: localhost:\$\{port\}/);
  });
  it('explains where the code is when --output is absent', () => {
    expect(CLI_SRC).toMatch(/No --output given/);
  });
  it('warns that the first run downloads Chrome', () => {
    expect(CLI_SRC).toMatch(/first run may download Chrome for Testing/);
  });
  it('says how to stop once recording is live', () => {
    expect(CLI_SRC).toMatch(/Ctrl\+C to stop and save/);
  });
  it('does not announce "Ready" when a shutdown is already under way', () => {
    // Ctrl+C during start-up otherwise prints "Ready" after "Stopping...".
    expect(CLI_SRC).toMatch(/if \(!shuttingDown\) \{[\s\S]*?Ready\./);
  });
  it('the code window URL with the token is never printed', () => {
    // The token authenticates the code window; printing the full URL would put a live
    // credential into terminal scrollback and shell history.
    expect(CLI_SRC).not.toMatch(/console\.log\([^)]*codeWindowUrl/);
  });
});
