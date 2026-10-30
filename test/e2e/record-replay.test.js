import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import http from 'node:http';
import { remote, Key } from 'webdriverio';
import { createLauncher, BROWSER_CACHE_DIR } from '../../src/launcher.js';
import { createServer } from '../../src/server.js';

const PAGES = {
  '/index.html': `<!doctype html><title>Home</title><body style="padding-top:80px">
    <a id="link" href="/page2.html">Page 2</a>
    <form method="post" action="/submit"><input id="user" name="user"><button id="send">Sign in</button></form>
    <button id="ask" onclick="out.textContent = confirm('Sure?') ? 'yes' : 'no'">Delete</button>
    <label id="terms-label"><input id="terms" type="checkbox"> Accept terms</label>
    <div class="card"><button data-qa="buy-1" onclick="out.textContent='buy-1'">Buy</button></div>
    <div class="card"><button data-qa="buy-2" onclick="out.textContent='buy-2'">Buy</button></div>
    <button id="next" onclick="history.pushState({}, '', '/wizard/step2'); out.textContent='step2'">Next</button>
    <div id="out"></div></body>`,
  '/page2.html': '<!doctype html><title>Page 2</title><body><h1>Two</h1></body>',
  '/done.html': '<!doctype html><title>Done</title><body><h1>Done</h1></body>',
};

const CHROME_ARGS = ['--headless=new', ...(process.env.CI ? ['--no-sandbox'] : [])];
let site, base, posts, rec, page, lines, replay;

beforeAll(async () => {
  site = http.createServer((req, res) => {
    if (req.method === 'POST') {
      posts++;
      req.resume();
      req.on('end', () => { res.writeHead(303, { Location: '/done.html' }); res.end(); });
      return;
    }
    const html = PAGES[req.url] ?? PAGES['/index.html'];
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(html);
  });
  await new Promise(r => site.listen(0, '127.0.0.1', r));
  base = `http://127.0.0.1:${site.address().port}`;

  const server = createServer({ port: 0 });
  lines = () => server.getLines().map(l => l.text).join('\n');
  rec = await createLauncher({
    url: `${base}/index.html`,
    testIdAttribute: 'data-qa',
    chromeArgs: CHROME_ARGS,
    addEvent: (e) => server.addEvent(e),
  });
  rec.clear = () => server.addEvent({ type: 'clear' });
  page = (await rec.driver.getPuppeteer().then(b => b.pages()))[0];
  page.on('dialog', d => d.accept());

  replay = await remote({
    logLevel: 'silent',
    cacheDir: BROWSER_CACHE_DIR,
    capabilities: { browserName: 'chrome', 'goog:chromeOptions': { args: CHROME_ARGS } },
  });
});

afterAll(async () => {
  await rec?.stop();
  await replay?.deleteSession();
  site?.close();
});

beforeEach(async () => {
  await rec.driver.url(`${base}/index.html`);
  await page.waitForFunction(() => window.__wdioRecorderActive);
  rec.clear();
  await rec.driver.url(`${base}/index.html`);
  await page.waitForFunction(() => window.__wdioRecorderActive);
});

const settle = () => new Promise(r => setTimeout(r, 600));

async function run() {
  const code = lines();
  const AsyncFn = Object.getPrototypeOf(async () => {}).constructor;
  await new AsyncFn('browser', '$', 'Key', code)(replay, replay.$.bind(replay), Key);
  return code;
}

describe('record → replay', () => {
  it('a click that navigates is recorded and replayed', async () => {
    await Promise.all([page.waitForNavigation(), page.click('#link')]);
    await settle();
    const code = await run();
    expect(code).toContain(`$('#link').click()`);
    expect(code).not.toContain('page2.html');
    expect(await replay.getTitle()).toBe('Page 2');
  });

  it('a form submit button is recorded and the form is posted on replay', async () => {
    await page.click('#user');
    await page.type('#user', 'bob');
    await Promise.all([page.waitForNavigation(), page.click('#send')]);
    await settle();
    posts = 0;
    await run();
    await replay.waitUntil(async () => (await replay.getTitle()) === 'Done');
    expect(posts).toBe(1);
  });

  it('a confirm answered by the user is replayed with the same answer', async () => {
    await page.click('#ask');
    await settle();
    const code = await run();
    expect(code.indexOf("browser.on('dialog'")).toBeLessThan(code.indexOf('.click()'));
    expect(await replay.$('#out').getText()).toBe('yes');
  });

  it('a click on a checkbox label is replayed once', async () => {
    await page.click('#terms-label');
    await settle();
    await run();
    expect(await replay.$('#terms').isSelected()).toBe(true);
  });

  it('--test-id-attribute picks the custom attribute', async () => {
    await page.click('[data-qa="buy-2"]');
    await settle();
    const code = await run();
    expect(code).toContain(`$('[data-qa="buy-2"]').click()`);
    expect(await replay.$('#out').getText()).toBe('buy-2');
  });

  it('an SPA route change does not reload the page on replay', async () => {
    await page.click('#next');
    await settle();
    const code = await run();
    expect(code).not.toContain('/wizard/step2');
    expect(await replay.$('#out').getText()).toBe('step2');
  });
});
