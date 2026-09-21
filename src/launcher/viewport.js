// src/launcher/viewport.js

// Known device profiles for --device flag emulation.
// Each profile: { width, height, deviceScaleFactor, mobile, hasTouch, userAgent }
export const DEVICES = {
  'iPhone 12': {
    width: 390, height: 844, deviceScaleFactor: 3, mobile: true, hasTouch: true,
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1',
  },
  'iPhone SE': {
    width: 375, height: 667, deviceScaleFactor: 2, mobile: true, hasTouch: true,
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1',
  },
  'iPad': {
    width: 768, height: 1024, deviceScaleFactor: 2, mobile: true, hasTouch: true,
    userAgent: 'Mozilla/5.0 (iPad; CPU OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1',
  },
  'Pixel 5': {
    width: 393, height: 851, deviceScaleFactor: 2.75, mobile: true, hasTouch: true,
    userAgent: 'Mozilla/5.0 (Linux; Android 12; Pixel 5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/98.0.4758.87 Mobile Safari/537.36',
  },
  'Galaxy S21': {
    width: 360, height: 800, deviceScaleFactor: 3, mobile: true, hasTouch: true,
    userAgent: 'Mozilla/5.0 (Linux; Android 12; SM-G991B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/98.0.4758.87 Mobile Safari/537.36',
  },
};

/**
 * Applies viewport size and user-agent for device emulation or explicit viewport-size flag.
 * Returns the resolved deviceProfile (needed by applyEmulation to skip a redundant UA override).
 *
 * @param {import('puppeteer-core').Page} page
 * @param {{ device?: string, viewportSize?: string }} opts
 * @returns {Promise<object|null>} deviceProfile or null
 */
export async function applyViewport(page, { device, viewportSize } = {}) {
  const deviceProfile = device ? DEVICES[device] ?? null : null;

  if (deviceProfile) {
    try {
      await page.setViewport({
        width: deviceProfile.width,
        height: deviceProfile.height,
        deviceScaleFactor: deviceProfile.deviceScaleFactor ?? 1,
        isMobile: deviceProfile.mobile ?? false,
        hasTouch: deviceProfile.hasTouch ?? false,
      });
      await page.setUserAgent(deviceProfile.userAgent);
    } catch (e) {
      if (process.env.WDIO_DEBUG) console.error('[wdio-codegen] device emulation failed:', e.message);
    }
  } else if (viewportSize) {
    try {
      const [w, h] = viewportSize.split('x').map(Number);
      if (w && h) await page.setViewport({ width: w, height: h, deviceScaleFactor: 1 });
    } catch (e) {
      if (process.env.WDIO_DEBUG) console.error('[wdio-codegen] setViewport failed:', e.message);
    }
  }

  return deviceProfile;
}
