# wdio-codegen

[![test](https://github.com/andriiengineer/wdio-codegen/actions/workflows/test.yml/badge.svg)](https://github.com/andriiengineer/wdio-codegen/actions/workflows/test.yml)
[![license: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

**Codegen for [WebdriverIO](https://webdriver.io/).** Click through your app in a real browser and
watch the WDIO spec write itself, line by line, in a window next to it.

```bash
npx wdio-codegen https://example.com
```

Nothing to install and nothing to configure: if you already have Google Chrome, it is used as is;
otherwise **Google Chrome for Testing** is downloaded (~150 MB). A matching chromedriver is fetched
either way. Everything is cached in `~/.cache/wdio-codegen` (override with
`WDIO_CODEGEN_CACHE_DIR`), so later runs start instantly.

**Requirements:** Node.js ≥ 20.19. Developed and tested on macOS; Linux and Windows are supported.

---

## What gets recorded

### Interactions

| Action | Generated code |
|---|---|
| Click | `await $('#el').click()` |
| Double-click | `await $('#el').doubleClick()` |
| Right-click | `await $('#el').click({ button: 'right' })` |
| Hover | `await $('#el').moveTo()` |
| Type text | `await $('#el').setValue('text')` |
| Clear input | `await $('#el').clearValue()` |
| Drag & drop | `await $('#src').dragAndDrop($('#dst'))` |

### Form controls

| Action | Generated code |
|---|---|
| Check / uncheck | `await $('#el').click()`. WebdriverIO has no `check()`/`uncheck()`; a click toggles the box |
| Select option (by text) | `await $('#el').selectByVisibleText('Option')` |
| Select option (by value) | `await $('#el').selectByAttribute('value', 'opt-1')`. Preferred when the option has a stable, non-numeric `value` attribute that differs from its visible text (more resilient to localization) |

### Keyboard

| Action | Generated code |
|---|---|
| Single key | `await browser.keys('Enter')` |
| Modifier combo | `await browser.keys([Key.Ctrl, 'a'])`. `Control` / `Meta` / `Alt` / `Shift` map to cross-platform `Key.*` constants |

### Navigation & windows

| Action | Generated code |
|---|---|
| Navigate | `await browser.url('https://...')` |
| New tab / window | `await browser.switchWindow('https://...')` |
| Close tab / window | `await browser.closeWindow()` |
| Action inside an iframe | `await browser.switchFrame($('iframe'))` … `await browser.switchFrame(null)`. The action is wrapped in a frame switch, because `$('iframe').$('#el')` does not cross the document boundary |

### Dialogs

| Action | Generated code |
|---|---|
| Alert / confirm OK | `await browser.acceptAlert()` |
| Confirm cancel | `await browser.dismissAlert()` |
| Prompt with text | `await browser.sendAlertText('...'); await browser.acceptAlert()` |

### Files

| Action | Generated code |
|---|---|
| Upload | `await $('#input').setValue(await browser.uploadFile('/path/to/file.pdf'))`. Emitted with a `⚠ replace with an absolute path on the test runner` comment |
| Download | `// download: file.pdf` + `await $('#el').click()` |

### Assertions

Right-click an element in the browser window and pick an assertion from the context menu. The
floating toolbar carries only the three most common ones; the full set below lives in that menu.

| Assertion | Generated code |
|---|---|
| Visible | `await expect($('#el')).toBeDisplayed()` |
| Has text | `await expect($('#el')).toHaveText('...')` |
| Contains text | `await expect($('#el')).toHaveText('...', { containing: true })` |
| Has value | `await expect($('#el')).toHaveValue('...')` |
| Has attribute | `await expect($('#el')).toHaveAttr('attr', 'val')` |
| Enabled | `await expect($('#el')).toBeEnabled()` |
| Checked | `await expect($('#el')).toBeChecked()` |
| In viewport | `await expect($('#el')).toBeDisplayedInViewport()` |
| URL | `await expect(browser).toHaveUrl('https://...')` |
| Page title | `await expect(browser).toHaveTitle('...')` |

Each positive assertion has a negative `not.*` form (`not.toBeDisplayed`, `not.toHaveText`, `not.toHaveValue`, `not.toBeEnabled`, `not.toBeChecked`), selectable from the same menu via the "NOT" variant.

---

## Locator strategy

Locators are chosen in priority order:

1. `[data-testid]`, `[data-test]`, `[data-cy]`, `[data-pw]`: test IDs (most stable)
2. `#id`: unique, non-generated IDs
3. `aria/Label`: ARIA labels
4. `input[placeholder]`, `img[alt]`, `[name]`: semantic attributes
5. `button=Text`, `a=Link text`: visible text for interactive elements
6. XPath: last resort (marked with ⚠ warning)

---

## Usage

```bash
# Basic recording
npx wdio-codegen https://example.com
npx wdio-codegen example.com
npx wdio-codegen localhost:3000

# Save generated test to a file
npx wdio-codegen https://example.com --output test/specs/my-test.js

# TypeScript output
npx wdio-codegen https://example.com --output test/specs/my-test.ts
```

### Options

| Flag | Description | Example |
|---|---|---|
| `-o, --output <file>` | Save generated code to file (auto-detects JS/TS) | `--output test/login.js` |
| `--browser <name>` | Browser to use (`chrome`) | `--browser chrome` |
| `--port <number>` | Code window server port (default: 9323) | `--port 9400` |
| `--viewport-size <WxH>` | Set browser viewport | `--viewport-size 1280x720` |
| `--device <name>` | Emulate a mobile device | `--device "iPhone 12"` |
| `--test-id-attribute <attr>` | Custom test ID attribute | `--test-id-attribute data-cy` |
| `--geolocation <lat,lng>` | Override geolocation | `--geolocation 51.5,-0.1` |
| `--timezone <id>` | Override timezone | `--timezone America/New_York` |
| `--lang <locale>` | Override browser language | `--lang fr-FR` |
| `--color-scheme <scheme>` | Override color scheme | `--color-scheme dark` |
| `--user-agent <ua>` | Override user agent string | `--user-agent "Mozilla/5.0..."` |
| `--proxy-server <url>` | Use a proxy | `--proxy-server http://proxy:8080` |
| `--save-storage <file>` | Save cookies/localStorage on exit | `--save-storage auth.json` |
| `--load-storage <file>` | Load cookies/localStorage on start | `--load-storage auth.json` |
| `-h, --help` | Show help | `--help` |
| `-V, --version` | Print the installed version | `--version` |

### Device profiles

Built-in devices for `--device`:

| Device | Viewport | UA |
|---|---|---|
| `iPhone 12` | 390×844 | Mobile Safari |
| `iPhone SE` | 375×667 | Mobile Safari |
| `iPad` | 768×1024 | Mobile Safari |
| `Pixel 5` | 393×851 | Chrome Android |
| `Galaxy S21` | 360×800 | Chrome Android |

---

## Window layout

When recording starts, two windows open side by side:

```
┌─────────────────────────┬──────────────┐
│   Browser window        │  Code window │
│   (your website)        │  (WDIO code) │
│   65% of screen         │  35% / 70%h  │
└─────────────────────────┴──────────────┘
```

- **Browser window**: your installed Chrome, or Chrome for Testing if you have none
- **Code window**: live-generated WebdriverIO test with CodeMirror editor

The floating toolbar on the page lets you pause, pick locators, and add assertions without switching windows.

The code window uses a Chromium-based browser already on the system (Chrome, Chromium, Brave,
Edge). Without one, the code UI opens as an ordinary tab in your default browser.

---

## Running the generated test

The recorder writes a Mocha spec for a WebdriverIO project: a `describe`/`it` block that imports
`browser`, `$` and `expect` from `@wdio/globals`.

```js
import { browser, $ } from '@wdio/globals';

describe('Recorded flow', () => {
  it('should complete the flow', async () => {
    await browser.url('https://example.com/');
    await $('#login').click();
  });
});
```

Record straight into your specs directory and run it with the WDIO test runner:

```bash
npx wdio-codegen https://example.com --output test/specs/recorded.js
npx wdio run wdio.conf.js
```

```
[chrome] » test/specs/recorded.js
[chrome] Recorded flow
[chrome]    ✓ should complete the flow

Spec Files:  1 passed, 1 total
```

<details>
<summary><b>No WDIO project yet? Full setup from scratch</b></summary>

**1. Create an ESM project and install the runner**

```bash
mkdir my-e2e && cd my-e2e
npm init -y
npm pkg set type=module
npm install --save-dev @wdio/cli @wdio/local-runner @wdio/mocha-framework @wdio/spec-reporter
```

`type: "module"` matters because the generated file uses `import`, which a CommonJS project rejects.

**2. Add `wdio.conf.js`**

```js
export const config = {
  runner: 'local',
  specs: ['./test/specs/**/*.js'],
  capabilities: [{ browserName: 'chrome' }],
  framework: 'mocha',
  reporters: ['spec'],
  logLevel: 'error',
  mochaOpts: { ui: 'bdd', timeout: 60000 },
};
```

**3. Record into the specs directory and run**

```bash
npx wdio-codegen https://example.com --output test/specs/recorded.js
npx wdio run wdio.conf.js
```

</details>

### Notes

- **`@wdio/globals` needs no separate install.** It ships as a dependency of `@wdio/cli`, so
  npm hoists it and the import resolves. Under strict layouts (pnpm, Yarn PnP) add it
  explicitly: `npm install --save-dev @wdio/globals`.
- **The recorded run and the replayed run are separate browsers.** Recording uses its own
  temporary profile; `wdio run` starts a clean one. If your flow only worked because you were
  already logged in while recording, the replay will not be: record the login steps too, or set
  the session up in your WDIO config.
- **TypeScript output** (`--output ...ts`) expects a WDIO project configured for TypeScript.

---

## Authentication

```bash
# Record login once, save session
npx wdio-codegen https://app.example.com --save-storage auth.json

# Reuse saved session for subsequent recordings
npx wdio-codegen https://app.example.com/dashboard --load-storage auth.json
```

> ⚠️ `auth.json` holds **live cookies and localStorage**, session tokens included. Keep it local,
> add it to `.gitignore`, and delete it once you are done generating tests. Anyone who gets the
> file is logged in as you.

`--save-storage` / `--load-storage` reuse a session between **recordings**; they do not carry it
into `wdio run`.

---

## Privacy

Everything happens on your machine. No telemetry, no analytics, no account: the recorder talks to
a server bound to `127.0.0.1`, and nothing about your session is sent anywhere.

Two things are worth knowing before you point it at a real application:

- **What you type ends up in the test file, verbatim.** Values are written as string literals,
  passwords, card numbers and one-time codes included. Review the generated file before committing
  it, and replace secrets with `process.env.*`.
- **The recorded page is granted permissions up front** — geolocation, notifications, camera,
  microphone, clipboard — so that flows depending on them can be captured without a dialog
  interrupting the recording. This applies only to the temporary recording profile, created fresh
  for each run and deleted when the run ends; your normal browser profile is never touched.

To report a security issue, see [SECURITY.md](SECURITY.md).

---

## License

MIT

---

## Trademark Disclaimer

WebdriverIO™ is a trademark of the OpenJS Foundation.

This project is an independent community-developed tool designed to work with WebdriverIO. It is not affiliated with, endorsed by, sponsored by, or officially associated with the OpenJS Foundation, the WebdriverIO project, or any of their maintainers.

The use of the name "WebdriverIO" is for descriptive and compatibility purposes only. All trademarks, service marks, and registered trademarks mentioned in this project are the property of their respective owners.
