// src/launcher.js
import { remote } from 'webdriverio';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { applyViewport } from './launcher/viewport.js';
import { applyEmulation } from './launcher/emulation.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const RECORDER_PATH = path.join(__dirname, 'recorder.content.js');
const ICON_PATH = path.join(__dirname, '..', 'bin', 'wdio-icon.png');
// Where WebdriverIO keeps the Chrome for Testing build and the matching chromedriver.
// Same location the README documents; overridable for CI.
export const BROWSER_CACHE_DIR = process.env.WDIO_CODEGEN_CACHE_DIR
  || path.join(os.homedir(), '.cache', 'wdio-codegen');


export async function createLauncher({
  url,
  port,
  browser: browserName = 'chrome',
  testIdAttribute,
  saveStorage,
  loadStorage,
  viewportSize,
  device,
  geolocation,
  timezone,
  lang,
  colorScheme,
  userAgent,
  proxyServer,
  windowBounds,
  addEvent,
  onClosed,
} = {}) {
  const recorderScript = fs.readFileSync(RECORDER_PATH, 'utf8');

  const testIdPreamble = testIdAttribute
    ? `window.__wdioTestIdAttrs = ${JSON.stringify([testIdAttribute])};\n`
    : '';

  let tempProfileDir = fs.mkdtempSync(path.join(os.tmpdir(), 'wdio-codegen-profile-'));

  const capabilities = {
    browserName,
    ...(browserName === 'chrome' && {
      'goog:chromeOptions': {
        args: [
          `--user-data-dir=${tempProfileDir}`,
          '--use-mock-keychain',
          '--password-store=basic',
          '--disable-default-apps',
          '--disable-extensions',
          '--disable-background-networking',
          '--disable-background-timer-throttling',
          '--disable-backgrounding-occluded-windows',
          '--disable-back-forward-cache',
          '--disable-breakpad',
          '--disable-client-side-phishing-detection',
          '--disable-component-extensions-with-background-pages',
          '--disable-component-update',
          '--disable-dev-shm-usage',
          '--disable-field-trial-config',
          '--disable-hang-monitor',
          '--disable-infobars',
          '--disable-ipc-flooding-protection',
          '--disable-popup-blocking',
          '--disable-prompt-on-repost',
          '--disable-renderer-backgrounding',
          '--disable-search-engine-choice-screen',
          '--disable-sync',
          '--enable-automation',
          '--metrics-recording-only',
          '--no-default-browser-check',
          '--no-first-run',
          '--no-service-autorun',
          '--allow-pre-commit-input',
          '--unsafely-disable-devtools-self-xss-warnings',
          '--disable-features=PaintHolding,HttpsUpgrades,TranslateUI,GlobalMediaControls,MediaRouter,DialMediaRouteProvider',
          ...(lang ? [`--lang=${lang}`] : []),
          ...(proxyServer ? [`--proxy-server=${proxyServer}`] : []),
          ...(windowBounds ? [`--window-size=${windowBounds.width},${windowBounds.height}`] : []),
          ...(windowBounds ? [`--window-position=${windowBounds.x},${windowBounds.y}`] : []),
        ],
        prefs: {
          'profile.default_content_setting_values.notifications': 1,
          'profile.default_content_setting_values.geolocation': 1,
          'profile.default_content_setting_values.media_stream_camera': 1,
          'profile.default_content_setting_values.media_stream_mic': 1,
          'profile.default_content_setting_values.automatic_downloads': 1,
          'profile.default_content_setting_values.popups': 1,
          'profile.default_content_setting_values.clipboard': 1,
          'profile.default_content_setting_values.midi_sysex': 1,
          'credentials_enable_service': false,
          'profile.password_manager_enabled': false,
        },
      },
    }),
  };

  let driver;
  try {
    driver = await remote({
      capabilities,
      logLevel: 'silent',
      // WDIO's default browser cache is os.tmpdir(), which a reboot wipes; a persistent
      // directory keeps the ~150 MB Chrome for Testing download a one-time cost.
      cacheDir: BROWSER_CACHE_DIR,
    });
  } catch (err) {
    try { fs.rmSync(tempProfileDir, { recursive: true, force: true }); } catch {}
    throw new Error(`Failed to launch ${browserName}: ${err.message}`);
  }

  // Chrome ignores --window-size when launched via chromedriver. Apply the bounds
  // explicitly via WebDriver after the session is live so the browser actually
  // takes the requested area (browser left 65% × full height, code right 35% × 70%).
  if (windowBounds) {
    try {
      await driver.setWindowRect(windowBounds.x, windowBounds.y, windowBounds.width, windowBounds.height);
    } catch {}
  }

  try {
    await driver.cdp('Browser', 'grantPermissions', {
      permissions: [
        'geolocation', 'notifications', 'audioCapture', 'videoCapture',
        'backgroundSync', 'clipboardReadWrite', 'clipboardSanitizedWrite',
        'paymentHandler', 'wakeLockScreen',
      ],
    });
  } catch { /* CDP not available; prefs-based grant is the fallback */ }

  const pptr = await driver.getPuppeteer();

  function handleRecorderEvent(json) {
    try {
      const event = typeof json === 'string' ? JSON.parse(json) : json;
      addEvent?.(event);
    } catch {}
  }

  async function setupPage(page) {
    try {
      await page.exposeFunction('__wdioRecord', handleRecorderEvent);
    } catch {
      // Already exposed on this page (e.g. re-used context), safe to ignore
    }
    try {
      const fullScript = testIdPreamble + recorderScript;
      await page.evaluateOnNewDocument(fullScript);
      await page.evaluate(fullScript);
    } catch {}
  }

  const initialPage = (await pptr.pages())[0];
  await setupPage(initialPage);

  const deviceProfile = await applyViewport(initialPage, { device, viewportSize });

  await applyEmulation(initialPage, { geolocation, timezone, colorScheme, userAgent, deviceProfile });

  pptr.on('targetcreated', async (target) => {
    if (target.type() !== 'page') return;
    try {
      const page = await target.page();
      if (!page) return;
      await setupPage(page);
      // Wait for the new page to navigate so we have a real URL (not about:blank)
      await page.waitForNavigation({ timeout: 3000, waitUntil: 'domcontentloaded' }).catch(() => {});
      const newUrl = page.url();
      if (newUrl && newUrl !== 'about:blank') {
        addEvent?.({ type: 'openPage', url: newUrl });
      }
    } catch {}
  });

  if (loadStorage) {
    try {
      const storage = JSON.parse(fs.readFileSync(loadStorage, 'utf8'));
      if (storage.cookies?.length) {
        await driver.setCookies(storage.cookies);
      }
      if (storage.localStorage) {
        const page = (await pptr.pages())[0];
        // Navigate to origin first so localStorage.setItem is allowed (same-origin policy)
        const origin = new URL(url).origin;
        await driver.url(origin);
        await page.evaluate((ls) => {
          for (const [k, v] of Object.entries(ls)) localStorage.setItem(k, v);
        }, storage.localStorage);
      }
    } catch (err) {
      console.warn(`[wdio-codegen] Warning: could not load storage from ${loadStorage}: ${err.message}`);
    }
  }

  await driver.url(url);

  let stopped = false;
  let knownHandles = new Set(await driver.getWindowHandles());

  const pollInterval = setInterval(async () => {
    if (stopped) return;
    try {
      const currentHandles = await driver.getWindowHandles();

      for (const h of knownHandles) {
        if (!currentHandles.includes(h)) {
          knownHandles.delete(h);
          if (currentHandles.length > 0 && !stopped) {
            addEvent?.({ type: 'closePage' });
          }
        }
      }
      for (const h of currentHandles) knownHandles.add(h);
    } catch {
      if (stopped) return;
      stopped = true;
      clearInterval(pollInterval);
      onClosed?.();
    }
  }, 500);

  // Puppeteer fires 'disconnected' immediately on browser close, faster than waiting for the poll to error.
  pptr.on('disconnected', () => {
    if (stopped) return;
    stopped = true;
    clearInterval(pollInterval);
    onClosed?.();
  });

  async function highlight(selector) {
    try {
      const pages = await pptr.pages();
      for (const page of pages) {
        page.evaluate((sel) => window.__wdioHighlight?.(sel), selector).catch(() => {});
      }
    } catch {}
  }

  async function setMode(cmd) {
    try {
      const pages = await pptr.pages();
      for (const page of pages) {
        page.evaluate((c) => window.__wdioControl?.(c), cmd).catch(() => {});
      }
    } catch {}
  }

  async function saveStorageState() {
    if (!saveStorage) return;
    try {
      const pages = await pptr.pages();
      const page = pages[0];
      let cookies = [];
      let localStorageData = {};
      try { cookies = await driver.getCookies(); } catch {}
      try {
        localStorageData = await page.evaluate(() => {
          const out = {};
          for (let i = 0; i < localStorage.length; i++) {
            const k = localStorage.key(i);
            out[k] = localStorage.getItem(k);
          }
          return out;
        });
      } catch {}
      // mode 0600: this file holds live session cookies, so anyone who can read it is
      // logged in as the user. The default 0644 would expose it to every other account
      // on the machine.
      fs.writeFileSync(
        saveStorage,
        JSON.stringify({ cookies, localStorage: localStorageData }, null, 2),
        { encoding: 'utf8', mode: 0o600 },
      );
      // `mode` above only applies when the file is created. Re-running --save-storage
      // into an existing file would keep whatever permissions it already had, so tighten
      // them explicitly every time.
      fs.chmodSync(saveStorage, 0o600);
      console.log(`[wdio-codegen] Auth state saved: ${saveStorage}`);
    } catch (err) {
      console.warn(`[wdio-codegen] Warning: could not save storage to ${saveStorage}: ${err.message}`);
    }
  }

  async function stop() {
    stopped = true;
    clearInterval(pollInterval);
    await saveStorageState();
    try { await driver.deleteSession(); } catch { /* already closed */ }
    try { fs.rmSync(tempProfileDir, { recursive: true, force: true }); } catch {}
  }

  async function focusBrowserWindow() {
    try {
      const pages = await pptr.pages();
      if (pages[0]) await pages[0].bringToFront();
    } catch {}
  }

  return { driver, stop, highlight, setMode, focusBrowserWindow };
}
