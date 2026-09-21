// src/server.js
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import crypto from 'node:crypto';
import { WebSocketServer } from 'ws';
import { generateLine, getHumanLabel } from './codegen.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UI_DIR = path.join(__dirname, '..', 'ui');

/** Constant-time compare that tolerates length mismatch (timingSafeEqual throws on it). */
function safeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ba.length !== bb.length) return false;
  return crypto.timingSafeEqual(ba, bb);
}

export function createServer({ port = 9323, browserName = 'chrome', token, onEvent, onHighlight, onSetMode } = {}) {
  const lines = [];

  // SECURITY: loopback is not a trust boundary. Any local page can POST here, and
  // WebSocket is not covered by the same-origin policy, so the token is required.
  const authToken = token ?? crypto.randomBytes(32).toString('hex');

  // The code window is served by this very server, so its Origin is fixed and known.
  const ALLOWED_ORIGINS = new Set([
    `http://localhost:${port}`,
    `http://127.0.0.1:${port}`,
  ]);

  // A missing Origin is rejected, not allowed: browsers always send one on POST and on
  // WS upgrade, so the gap would only serve a non-browser client.
  const originAllowed = (origin) => typeof origin === 'string' && ALLOWED_ORIGINS.has(origin);

  const httpServer = http.createServer((req, res) => {
    if (req.method === 'POST' && req.url === '/save') {
      // Token first: a missing token is 401 regardless of Origin.
      if (!safeEqual(req.headers['x-wdio-token'], authToken)) {
        res.writeHead(401, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Unauthorized' }));
        req.resume();
        return;
      }
      if (!originAllowed(req.headers.origin)) {
        res.writeHead(403, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Forbidden origin' }));
        req.resume();
        return;
      }
      let body = '';
      req.on('data', d => body += d);
      req.on('end', () => {
        try {
          const { code, path: filePath } = JSON.parse(body);
          if (filePath) {
            const resolved = path.resolve(filePath);
            if (!resolved.startsWith(process.cwd() + path.sep) && resolved !== process.cwd()) {
              res.writeHead(403, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: 'Path outside working directory' }));
              return;
            }
            fs.writeFileSync(resolved, code, 'utf8');
          }
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ ok: true }));
        } catch (err) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: err.message }));
        }
      });
      return;
    }

    const pathname = new URL(req.url, 'http://localhost').pathname;
    const urlPath = pathname === '/' ? '/index.html' : pathname;
    // path.resolve normalises any "../" segments; reject anything that escapes UI_DIR.
    // Without this check a request like /../../etc/passwd would read files outside ui/.
    const filePath = path.resolve(path.join(UI_DIR, urlPath));
    if (filePath !== UI_DIR && !filePath.startsWith(UI_DIR + path.sep)) {
      res.writeHead(403);
      res.end('Forbidden');
      return;
    }
    try {
      const data = fs.readFileSync(filePath);
      const ext = path.extname(filePath);
      const mime = {
        '.html': 'text/html',
        '.css': 'text/css',
        '.js': 'application/javascript',
        '.png': 'image/png',
        '.svg': 'image/svg+xml',
      };
      res.writeHead(200, { 'Content-Type': mime[ext] || 'text/plain' });
      res.end(data);
    } catch {
      res.writeHead(404);
      res.end('Not found');
    }
  });

  // noServer + a manual upgrade handler: `verifyClient` is discouraged by `ws` and gives no
  // clean way to answer a rejected upgrade. Browsers cannot set headers on `new WebSocket()`,
  // so the token has to travel in the query string, which is acceptable on loopback.
  const wss = new WebSocketServer({ noServer: true });
  const codewindows = new Set();

  httpServer.on('upgrade', (req, socket, head) => {
    const reject = (status, reason) => {
      socket.write(`HTTP/1.1 ${status} ${reason}\r\nConnection: close\r\n\r\n`);
      socket.destroy();
    };
    const url = new URL(req.url, `http://localhost:${port}`);
    if (!safeEqual(url.searchParams.get('token'), authToken)) return reject(401, 'Unauthorized');
    if (!originAllowed(req.headers.origin)) return reject(403, 'Forbidden');
    wss.handleUpgrade(req, socket, head, (ws) => wss.emit('connection', ws, req));
  });

  wss.on('connection', (ws, req) => {
    codewindows.add(ws);
    // Send current state to newly connected code window
    broadcast({ type: 'init', lines, browserName });
    ws.on('message', (raw) => {
      let msg;
      try { msg = JSON.parse(raw); } catch { return; }
      if (msg.type === 'highlight') onHighlight?.(msg.selector);
      if (msg.type === 'set-mode') onSetMode?.(msg.mode);
      if (msg.type === 'clear') {
        lines.length = 0;
        broadcast({ type: 'clear' });
      }
    });
    ws.on('close', () => codewindows.delete(ws));
  });

  function broadcast(payload) {
    const msg = JSON.stringify(payload);
    for (const client of codewindows) {
      if (client.readyState === 1) client.send(msg);
    }
  }

  function addEvent(event) {
    if (event.type === 'clear') {
      lines.length = 0;
      broadcast({ type: 'clear' });
      return;
    }

    if (event.type === 'pick') {
      broadcast({ type: 'pick', locator: event.locator });
      return;
    }

    // Browser toolbar pause/resume: keep code window in sync with browser state.
    // The browser sends 'control:pause' / 'control:resume' when the user clicks the
    // in-page toolbar button (which cannot go through the normal set-mode WS path).
    if (event.type === 'control:pause') {
      broadcast({ type: 'mode', mode: 'standby' });
      return;
    }
    if (event.type === 'control:resume') {
      broadcast({ type: 'mode', mode: 'recording' });
      return;
    }

    const line = generateLine(event);
    if (!line) return;

    const label = getHumanLabel(event);
    const lineTexts = line.split('\n');
    lineTexts.forEach((text, idx) => {
      const entry = {
        text,
        warn: event._warn || false,
        isAssert: event.type?.startsWith('assert:') || false,
        // label only on first line of multi-line events (e.g. dialog:prompt)
        label: idx === 0 ? label : '',
      };
      lines.push(entry);
      broadcast({ type: 'line', entry });
      onEvent?.(event, entry);
    });
  }

  function start() {
    return new Promise((resolve, reject) => {
      httpServer.listen(port, '127.0.0.1', () => resolve(port));
      httpServer.on('error', reject);
    });
  }

  function stop() {
    return new Promise((resolve) => {
      wss.close();
      httpServer.close(resolve);
    });
  }

  function getLines() { return lines; }

  function broadcastShutdown() {
    broadcast({ type: 'shutdown' });
  }

  return { start, stop, getLines, broadcastShutdown, addEvent, token: authToken };
}
