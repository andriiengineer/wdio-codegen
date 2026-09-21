// src/launcher/emulation.js

/**
 * Applies CDP-based browser emulation overrides: geolocation, timezone, color scheme,
 * and user-agent (skipped if a device profile already set it).
 *
 * @param {import('puppeteer-core').Page} page
 * @param {{ geolocation?: string, timezone?: string, colorScheme?: string, userAgent?: string, deviceProfile?: object|null }} opts
 */
export async function applyEmulation(page, { geolocation, timezone, colorScheme, userAgent, deviceProfile } = {}) {
  if (geolocation) {
    try {
      const [latStr, lngStr, altStr] = geolocation.split(',');
      const latitude  = parseFloat(latStr);
      const longitude = parseFloat(lngStr);
      const altitude  = altStr ? parseFloat(altStr) : 0;
      if (!isNaN(latitude) && !isNaN(longitude)) {
        const cdpSession = await page.target().createCDPSession();
        await cdpSession.send('Emulation.setGeolocationOverride', { latitude, longitude, altitude, accuracy: 100 });
      }
    } catch (e) {
      if (process.env.WDIO_DEBUG) console.error('[wdio-codegen] setGeolocationOverride failed:', e.message);
    }
  }

  if (timezone) {
    try {
      const cdpSession = await page.target().createCDPSession();
      await cdpSession.send('Emulation.setTimezoneOverride', { timezoneId: timezone });
    } catch (e) {
      if (process.env.WDIO_DEBUG) console.error('[wdio-codegen] setTimezoneOverride failed:', e.message);
    }
  }

  if (colorScheme) {
    try {
      const cdpSession = await page.target().createCDPSession();
      await cdpSession.send('Emulation.setEmulatedMedia', {
        features: [{ name: 'prefers-color-scheme', value: colorScheme }],
      });
    } catch (e) {
      if (process.env.WDIO_DEBUG) console.error('[wdio-codegen] setEmulatedMedia failed:', e.message);
    }
  }

  // Skip user-agent if a device profile already set it via applyViewport
  if (userAgent && !deviceProfile) {
    try {
      await page.setUserAgent(userAgent);
    } catch (e) {
      if (process.env.WDIO_DEBUG) console.error('[wdio-codegen] setUserAgent failed:', e.message);
    }
  }
}
