#!/usr/bin/env node
// bin/wdio-codegen.js
import { parseArgs } from 'node:util';
import { readFileSync } from 'node:fs';
import { createServer } from '../src/server.js';
import { createLauncher } from '../src/launcher.js';
import { createFileWriter } from '../src/file-writer.js';
import { normalizeUrl } from '../src/normalize-url.js';
import net from 'node:net';
import cp from 'node:child_process';
import { findChromeBin, getScreenSize, openCodeWindow, setCodeWindowDockIcon } from './chrome-setup.js';

let values, positionals;
try {
  // parseArgs is strict: an unknown flag throws a raw Node error before main() runs.
  // Catch it so a typo prints a message instead of a stack trace.
  ({ values, positionals } = parseArgs({
  args: process.argv.slice(2),
  options: {
    version:            { type: 'boolean', short: 'V' },
    output:             { type: 'string',  short: 'o' },
    // hidden from --help, kept for backward compatibility
    browser:            { type: 'string',  short: 'b', default: 'chrome' },
    port:               { type: 'string',  default: '9323' },
    'test-id-attribute': { type: 'string' },
    'save-storage':     { type: 'string' },
    'load-storage':     { type: 'string' },
    'viewport-size':    { type: 'string' },
    device:             { type: 'string' },
    geolocation:        { type: 'string' },
    timezone:           { type: 'string' },
    lang:               { type: 'string' },
    'color-scheme':     { type: 'string' },
    'user-agent':       { type: 'string' },
    'proxy-server':     { type: 'string' },
    help:               { type: 'boolean', short: 'h' },
  },
  allowPositionals: true,
  }));
} catch (err) {
  console.error(`[wdio-codegen] Error: ${err.message.split('. To specify')[0]}`);
  console.error('[wdio-codegen] Run `wdio-codegen --help` to see the available options.');
  process.exit(1);
}

if (values.version) {
  const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
  console.log(pkg.version);
  process.exit(0);
}

if (values.help || positionals.length === 0) {
  console.log(`
Usage: npx wdio-codegen [options] <url>

Arguments:
  url                    URL to open in the browser (https:// assumed when omitted)

Options:
  -o, --output <file>              Save generated code to file (updated live)
  --port <number>                  Code window server port (default: 9323)
  --test-id-attribute <attr>       Custom test-id attribute (default: data-testid)
  --save-storage <file>            Save auth state (cookies + localStorage) to JSON on exit
  --load-storage <file>            Load auth state from JSON before navigation
  --viewport-size <WxH>            Set browser viewport size, e.g. 1280x720
  --device <name>                  Emulate device: "iPhone 12", "iPad", "Pixel 5", "Galaxy S21"
  --geolocation <lat,lng>          Override geolocation, e.g. 37.7749,-122.4194
  --timezone <zone>                Emulate timezone, e.g. "Europe/Rome"
  --lang <locale>                  Set language/locale, e.g. "fr-FR"
  --color-scheme <scheme>          Emulate color scheme: light or dark
  --user-agent <ua>                Override user agent string
  --proxy-server <url>             Use proxy server, e.g. "http://myproxy:8080"
  -h, --help                       Show help
  -V, --version                    Show version
  `.trim());
  process.exit(0);
}

const rawUrl = positionals[0];
const targetUrl = normalizeUrl(rawUrl);

if (values.browser && values.browser !== 'chrome') {
  console.error(`[wdio-codegen] Error: --browser "${values.browser}" is not supported. Only 'chrome' works (recording uses Puppeteer CDP).`);
  process.exit(1);
}

// Only http(s) is accepted: the value reaches `cp.spawn(chrome, ['--app=<url>', ...])`
// and `driver.url(url)`, and `javascript:` / `file:` URLs have no business there.
try {
  const parsed = new URL(targetUrl);
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error('protocol must be http or https');
  }
} catch (err) {
  console.error(`[wdio-codegen] Error: invalid URL "${rawUrl}": ${err.message}`);
  process.exit(1);
}

async function findFreePort(start) {
  for (let p = start; p < start + 10; p++) {
    const free = await new Promise(resolve => {
      const s = net.createServer();
      s.listen(p, () => { s.close(() => resolve(true)); });
      s.on('error', () => resolve(false));
    });
    if (free) return p;
  }
  throw new Error('No free port found in range ' + start + '-' + (start + 9));
}

let shuttingDown = false;

async function main() {
  const rawPort = Number(values.port);
  if (!Number.isInteger(rawPort) || rawPort < 1 || rawPort > 65535) {
    console.error(`[wdio-codegen] Error: invalid port "${values.port}"`);
    process.exit(1);
  }
  const port = await findFreePort(rawPort);
  const fileWriter = values.output ? createFileWriter(values.output) : null;

  let launcher;
  // Kept so shutdown can still clean up when Ctrl+C lands *during* start-up: at that
  // point `launcher` is undefined, but chromedriver and the temp profile already exist
  // inside the pending call. Awaiting the promise gives us the object that owns them.
  let launcherPromise = null;
  let codeWindowPid = null;

  const server = createServer({
    port,
    onEvent: (_event, _entry) => {
      if (fileWriter) fileWriter.write(server.getLines());
    },
    onHighlight: (selector) => launcher?.highlight(selector),
    onSetMode: (cmd) => launcher?.setMode(cmd),
  });

  await server.start();
  console.log(`[wdio-codegen] Recording: ${targetUrl}`);
  console.log(`[wdio-codegen] Code window: localhost:${port}`);
  if (values.output) {
    console.log(`[wdio-codegen] Output: ${values.output}`);
  } else {
    console.log('[wdio-codegen] No --output given: the code lives in the code window only;');
    console.log('[wdio-codegen] use its Copy button, or restart with --output <file>.');
  }
  // "may": WDIO reuses a locally installed Chrome when there is one and fetches only
  // chromedriver (~18 MB); the 150 MB download happens when there is none.
  console.log('[wdio-codegen] Starting browser… first run may download Chrome for Testing (~150 MB).');

  function killCodeWindow() {
    if (!codeWindowPid) return;
    try {
      if (process.platform === 'win32') {
        cp.spawnSync('taskkill', ['/pid', String(codeWindowPid), '/T', '/F'], { stdio: 'ignore' });
      } else {
        // Negative PID kills the entire process group (Chrome + all helpers)
        process.kill(-codeWindowPid, 'SIGTERM');
      }
    } catch {}
    codeWindowPid = null;
  }

  async function shutdown(silent = false) {
    if (shuttingDown) return;
    shuttingDown = true;
    if (!silent) process.stdout.write('\n[wdio-codegen] Stopping...\n');
    // Already-started case is instant; mid-start-up we wait for createLauncher to settle,
    // capped so a Ctrl+C during the ~150 MB Chrome download still exits promptly.
    const active = launcher ?? await Promise.race([
      launcherPromise?.catch(() => null) ?? Promise.resolve(null),
      new Promise(resolve => setTimeout(() => resolve(null), 5000)),
    ]);
    await active?.stop();
    if (fileWriter) {
      fileWriter.write(server.getLines());
      if (!silent && fileWriter.path) process.stdout.write(`[wdio-codegen] Saved: ${fileWriter.path}\n`);
    }
    server.broadcastShutdown();
    killCodeWindow();
    await new Promise(r => setTimeout(r, 200));
    await server.stop();
    process.exit(0);
  }

  // Registered before the browser starts: Ctrl+C during the first-run Chrome download
  // must still clean up chromedriver, Chrome and the temp profile.
  process.on('SIGINT', () => shutdown(false));
  process.on('SIGTERM', () => shutdown(false));

  // Side-by-side layout: browser (left 65%) + code window (right 35%).
  // Code window height: 70%, leaves room in the dock.
  const { width: screenW, height: screenH } = getScreenSize();
  const codeW      = Math.round(screenW * 0.35);
  const codeH      = Math.round(screenH * 0.70);
  const browserW   = screenW - codeW;
  const browserWindowBounds = { x: 0, y: 0, width: browserW, height: screenH };

  try {
    launcherPromise = createLauncher({
      url: targetUrl,
      browser: values.browser,
      testIdAttribute: values['test-id-attribute'],
      saveStorage: values['save-storage'],
      loadStorage: values['load-storage'],
      viewportSize: values['viewport-size'],
      device: values['device'],
      geolocation: values['geolocation'],
      timezone: values['timezone'],
      lang: values['lang'],
      colorScheme: values['color-scheme'],
      userAgent: values['user-agent'],
      proxyServer: values['proxy-server'],
      windowBounds: browserWindowBounds,
      addEvent: (event) => server.addEvent(event),
      onClosed: () => shutdown(true),
    });
    launcher = await launcherPromise;
  } catch (err) {
    console.error(`[wdio-codegen] Error: ${err.message}`);
    await server.stop();
    process.exit(1);
  }

  // The token authenticates the code window to the local server; it travels over loopback only.
  const codeWindowUrl = `http://localhost:${port}?port=${port}&token=${server.token}${values.output ? `&output=${encodeURIComponent(values.output)}` : ''}`;
  const inspectorDebugPort = await findFreePort(port + 1);
  codeWindowPid = openCodeWindow(codeWindowUrl, inspectorDebugPort, {
    codeX: browserW,
    codeY: 0,
    codeW,
    codeH,
  });

  // Small delay lets the code window process finish opening before we steal focus back.
  setTimeout(() => launcher?.focusBrowserWindow?.().catch(() => {}), 800);

  // Ctrl+C during start-up sets this; without the guard the line prints after
  // "Stopping...", telling the user the recorder is ready as it exits.
  if (!shuttingDown) {
    console.log('[wdio-codegen] Ready. Interact with the page, press Ctrl+C to stop and save.');
  }

}

main().catch((err) => {
  console.error(`[wdio-codegen] Error: ${err.message}`);
  process.exit(1);
});
