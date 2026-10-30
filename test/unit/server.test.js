import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createServer } from '../../src/server.js';
import WebSocket from 'ws';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TOOLBAR_SRC = fs.readFileSync(path.join(__dirname, '../../ui-src/components/Toolbar.tsx'), 'utf8');

let portSeq = 9400;
const nextPort = () => portSeq++;

/** Opens an authenticated WS connection the way the code window does. */
function connect(port, token, origin = `http://localhost:${port}`) {
  return new WebSocket(`ws://localhost:${port}/?token=${token}`, { origin });
}

// Guards the fix above. A fixed port sneaking back in would reintroduce an EADDRINUSE
// flake that only shows up on a fast CI runner — the kind of failure nobody can reproduce
// locally, so catch it as a source check rather than by waiting for red CI.
describe('this file binds no fixed ports', () => {
  const SELF = fs.readFileSync(fileURLToPath(import.meta.url), 'utf8');

  it('every createServer call takes nextPort()', () => {
    const calls = SELF.match(/createServer\(\{[^}]*\}/g) ?? [];
    expect(calls.length).toBeGreaterThan(0);
    const fixed = calls.filter(c => /port:\s*\d/.test(c));
    expect(fixed).toEqual([]);
  });

  it('no port literal is used for a URL', () => {
    // Allow the seed on the portSeq line; anything else is a hardcoded port.
    const offenders = SELF.split('\n')
      .filter(l => !l.includes('let portSeq'))
      .filter(l => /localhost:9\d{3}|connect\(9\d{3}/.test(l));
    expect(offenders).toEqual([]);
  });
});

describe('server WS messages', () => {
  let server;

  afterEach(async () => {
    if (server) await server.stop();
  });

  it('calls onSetMode when client sends set-mode message', async () => {
    const onSetMode = vi.fn();
    const port = nextPort();
    server = createServer({ port, onSetMode });
    await server.start();

    const ws = connect(port, server.token);
    await new Promise(r => ws.on('open', r));
    ws.send(JSON.stringify({ type: 'set-mode', mode: 'assertText' }));
    await new Promise(r => setTimeout(r, 50));

    expect(onSetMode).toHaveBeenCalledWith('assertText');
    ws.close();
  });

  it('broadcasts clear when client sends clear message', async () => {
    const port = nextPort();
    server = createServer({ port });
    server.addEvent({ type: 'click', locator: '#btn' }); // add a line first
    await server.start();

    const ws = connect(port, server.token);
    const messages = [];
    ws.on('message', d => messages.push(JSON.parse(d.toString())));
    await new Promise(r => ws.on('open', r));
    await new Promise(r => setTimeout(r, 20)); // receive init

    ws.send(JSON.stringify({ type: 'clear' }));
    await new Promise(r => setTimeout(r, 50));

    expect(messages.some(m => m.type === 'clear')).toBe(true);
    expect(server.getLines()).toHaveLength(0);
    ws.close();
  });
});

// CodePanel highlights entry i at line header + i + 1, which holds only while every
// entry is exactly one line of code.
describe('multi-line events become one entry per line', () => {
  it('an iframe assertion yields three single-line assert entries', () => {
    const srv = createServer({ port: nextPort() });
    srv.addEvent({ type: 'assert:toBeDisplayed', locator: '#el', _frame: 'iframe' });
    const lines = srv.getLines();
    expect(lines).toHaveLength(3);
    expect(lines.every(l => !l.text.includes('\n') && l.isAssert)).toBe(true);
  });
});

// ── browserName in init WS message ───────────────────────────────────────────
// Loopback is not a trust boundary: WebSocket is not covered by the same-origin policy.
describe('transport authentication', () => {
  let srv;
  let PORT, ORIGIN;

  /** Resolves to 'open' or 'rejected'; never hangs. */
  const tryConnect = (url, opts) => new Promise((resolve) => {
    const ws = new WebSocket(url, opts);
    ws.on('open', () => { ws.close(); resolve('open'); });
    ws.on('error', () => resolve('rejected'));
  });

  beforeEach(async () => {
    PORT = nextPort();
    ORIGIN = `http://localhost:${PORT}`;
    srv = createServer({ port: PORT });
    await srv.start();
  });
  afterEach(async () => {
    await srv?.stop();
  });

  it('issues a token that is not guessable', () => {
    expect(srv.token).toMatch(/^[0-9a-f]{64}$/);
  });

  it('accepts a token supplied by the caller (test seam)', async () => {
    const s = createServer({ port: nextPort(), token: 'fixed-token' });
    expect(s.token).toBe('fixed-token');
    await s.stop();
  });

  // ── WebSocket upgrade ──
  it('rejects a WS upgrade without a token', async () => {
    expect(await tryConnect(`ws://localhost:${PORT}`, { origin: ORIGIN })).toBe('rejected');
  });

  it('rejects a WS upgrade with a wrong token', async () => {
    expect(await tryConnect(`ws://localhost:${PORT}/?token=nope`, { origin: ORIGIN }))
      .toBe('rejected');
  });

  it('rejects a WS upgrade from a foreign origin', async () => {
    expect(await tryConnect(`ws://localhost:${PORT}/?token=${srv.token}`,
      { origin: 'http://evil.example' })).toBe('rejected');
  });

  it('accepts a WS upgrade with a valid token and allowed origin', async () => {
    expect(await tryConnect(`ws://localhost:${PORT}/?token=${srv.token}`, { origin: ORIGIN }))
      .toBe('open');
  });

  it('an unauthenticated client cannot wipe the recording', async () => {
    srv.addEvent({ type: 'click', locator: '#btn' });
    expect(srv.getLines()).toHaveLength(1);
    await tryConnect(`ws://localhost:${PORT}`, { origin: ORIGIN });
    await new Promise(r => setTimeout(r, 50));
    expect(srv.getLines()).toHaveLength(1);
  });

  // ── UI plumbing: the token must reach both channels, or the tool talks to nothing ──
  it('the UI sends the token on the WS channel', () => {
    const MAIN_SRC = fs.readFileSync(path.join(__dirname, '../../ui-src/main.tsx'), 'utf8');
    const WS_SRC = fs.readFileSync(path.join(__dirname, '../../ui-src/hooks/useWS.ts'), 'utf8');
    expect(MAIN_SRC).toContain("params.get('token')");
    expect(WS_SRC).toContain('token=');
  });

  it('the CLI puts the token in the code window URL', () => {
    const CLI_SRC = fs.readFileSync(path.join(__dirname, '../../bin/wdio-codegen.js'), 'utf8');
    expect(CLI_SRC).toContain('token=${server.token}');
  });
});

// ── End-to-end token wiring ──────────────────────────────────────────────────
// The tests above use a locally built client and source-string greps, both of which stay
// green while CLI URL -> main.tsx -> useWS/App is broken. This drives the whole chain
// with the exact URL shapes the CLI and useWS produce.
describe('end-to-end token wiring', () => {
  let PORT, srv;

  afterEach(async () => { await srv?.stop(); });

  it('the token survives the CLI URL → code window → WS round trip', async () => {
    PORT = nextPort();
    srv = createServer({ port: PORT });
    await srv.start();

    // Exactly as bin/wdio-codegen.js builds it (note: no "/" before "?").
    const codeWindowUrl = `http://localhost:${PORT}?port=${PORT}&token=${srv.token}&output=${encodeURIComponent('out.spec.js')}`;

    // 1. The code window loads, query string and all.
    const page = await fetch(codeWindowUrl);
    expect(page.status).toBe(200);
    expect(await page.text()).toContain('<div id="root">');

    // 2. main.tsx reads the params off location.search.
    const params = new URLSearchParams(new URL(codeWindowUrl).search);
    expect(params.get('token')).toBe(srv.token);
    expect(params.get('port')).toBe(String(PORT));
    expect(params.get('output')).toBe('out.spec.js');

    // 3. useWS.ts opens the socket with that token; the server must accept and greet it.
    const token = params.get('token');
    const ws = new WebSocket(`ws://localhost:${PORT}/?token=${encodeURIComponent(token)}`,
      { origin: `http://localhost:${PORT}` });
    const init = await new Promise((resolve, reject) => {
      ws.on('message', d => {
        const msg = JSON.parse(d.toString());
        if (msg.type === 'init') resolve(msg);
      });
      ws.on('error', reject);
      setTimeout(() => reject(new Error('no init within 2s')), 2000);
    });
    ws.close();
    expect(init.type).toBe('init');
  });

  it('the built UI bundle carries the token wiring, not just the source', () => {
    const indexHtml = fs.readFileSync(path.join(__dirname, '../../ui/index.html'), 'utf8');
    const asset = indexHtml.match(/assets\/(index-[A-Za-z0-9_-]+\.js)/)?.[1];
    expect(asset, 'ui/index.html must reference a built bundle').toBeTruthy();
    const bundlePath = path.join(__dirname, '../../ui/assets', asset);
    expect(fs.existsSync(bundlePath), `${asset} referenced but missing on disk`).toBe(true);
    const bundle = fs.readFileSync(bundlePath, 'utf8');
    expect(bundle).toContain('token=');
  });
});
