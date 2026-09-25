// bin/chrome-setup.js
import cp from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';
import { BROWSER_CACHE_DIR } from '../src/launcher.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ICON_PATH = path.join(__dirname, 'wdio-icon.png');

export function findChromeBin() {
  if (process.platform === 'darwin') {
    const candidates = [
      '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
      '/Applications/Chromium.app/Contents/MacOS/Chromium',
      '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser',
      '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
    ];
    return candidates.find(p => fs.existsSync(p)) ?? null;
  }
  if (process.platform === 'win32') {
    const candidates = [
      `${process.env.LOCALAPPDATA}\\Google\\Chrome\\Application\\chrome.exe`,
      `${process.env.PROGRAMFILES}\\Google\\Chrome\\Application\\chrome.exe`,
      `${process.env['PROGRAMFILES(X86)']}\\Google\\Chrome\\Application\\chrome.exe`,
    ];
    return candidates.find(p => p && fs.existsSync(p)) ?? null;
  }
  // Linux: check PATH
  for (const name of ['google-chrome', 'chromium', 'chromium-browser', 'brave-browser']) {
    const r = cp.spawnSync('which', [name], { encoding: 'utf8' });
    if (r.status === 0) return r.stdout.trim();
  }
  return null;
}

export function getScreenSize() {
  try {
    if (process.platform === 'darwin') {
      const r = cp.spawnSync('osascript', ['-e', 'tell application "Finder" to get bounds of window of desktop'], { encoding: 'utf8' });
      const parts = r.stdout.trim().split(',').map(n => parseInt(n.trim()));
      if (parts.length === 4 && parts[2] > 0) return { width: parts[2], height: parts[3] };
    }
    if (process.platform === 'linux') {
      const r = cp.spawnSync('bash', ['-c', "xrandr | grep ' connected' | grep -o '[0-9]*x[0-9]*+0+0' | head -1"], { encoding: 'utf8' });
      const [w, h] = r.stdout.trim().split('x').map(Number);
      if (w && h) return { width: w, height: h };
    }
    if (process.platform === 'win32') {
      const r = cp.spawnSync('powershell', ['-command', '[System.Windows.Forms.Screen]::PrimaryScreen.Bounds | Select Width,Height | ConvertTo-Json'], { encoding: 'utf8' });
      const { Width, Height } = JSON.parse(r.stdout.trim());
      if (Width) return { width: Width, height: Height };
    }
  } catch {}
  return { width: 1920, height: 1080 };
}

// Chrome and chromedriver bootstrap is WebdriverIO's job (@wdio/utils); the cache
// location is set via the `cacheDir` option in src/launcher.js.

export function openCodeWindow(url, debugPort, { codeX, codeY, codeW, codeH } = {}) {
  const bin = findChromeBin();
  const { width: screenW, height: screenH } = getScreenSize();
  // Right panel: ~35% of screen width, full height, side-by-side with the recorded browser
  const winW = codeW ?? Math.round(screenW * 0.35);
  const winH = codeH ?? screenH;
  const winX = codeX ?? (screenW - winW);
  const winY = codeY ?? 0;

  if (bin) {
    // Persistent profile → Chrome caches the favicon so the icon appears reliably
    const inspectorProfile = path.join(BROWSER_CACHE_DIR, 'inspector-profile');
    fs.mkdirSync(inspectorProfile, { recursive: true });

    // Force-disable translate in the Chrome profile's Preferences file.
    // The command-line flag alone is overridden by saved profile settings.
    const defaultDir = path.join(inspectorProfile, 'Default');
    fs.mkdirSync(defaultDir, { recursive: true });
    const prefsFile = path.join(defaultDir, 'Preferences');
    try {
      let prefs = {};
      try { prefs = JSON.parse(fs.readFileSync(prefsFile, 'utf8')); } catch {}
      prefs.translate = { ...(prefs.translate ?? {}), enabled: false };
      fs.writeFileSync(prefsFile, JSON.stringify(prefs));
    } catch {}

    const proc = cp.spawn(bin, [
      `--app=${url}`,
      `--user-data-dir=${inspectorProfile}`,
      `--window-size=${winW},${winH}`,
      `--window-position=${winX},${winY}`,
      '--no-first-run',
      '--test-type=',
      `--remote-debugging-port=${debugPort}`,
      '--disable-features=Translate,TranslateUI',
    ], { detached: true, stdio: 'ignore' });
    proc.unref();

    setCodeWindowDockIcon(debugPort).catch(() => {});

    return proc.pid ?? null;
  } else if (process.platform === 'darwin') {
    cp.spawn('open', [url], { detached: true, stdio: 'ignore' }).unref();
  } else if (process.platform === 'win32') {
    cp.spawn('cmd.exe', ['/c', 'start', '', url], { detached: true, stdio: 'ignore' }).unref();
  } else {
    cp.spawn('xdg-open', [url], { detached: true, stdio: 'ignore' }).unref();
  }
  return null;
}

export async function setCodeWindowDockIcon(debugPort) {
  let iconPng;
  try { iconPng = fs.readFileSync(ICON_PATH); } catch { return; }

  for (let i = 0; i < 6; i++) {
    await new Promise(r => setTimeout(r, 500));
    try {
      const browser = await puppeteer.connect({
        browserURL: `http://127.0.0.1:${debugPort}`,
        defaultViewport: null,
      });
      const session = await browser.target().createCDPSession();
      await session.send('Browser.setDockTile', { image: iconPng.toString('base64') });
      browser.disconnect();
      return;
    } catch {}
  }
}
