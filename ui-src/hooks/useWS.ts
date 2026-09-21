import { useCallback, useEffect, useRef } from 'react';
import type { WsMessage } from '../types';

// A rejected upgrade (bad or missing token) closes immediately, so unbounded retries would
// mean reconnecting forever against a server that will never accept us.
const MAX_RETRIES = 12;

export function useWS(port: string, token: string, onMessage: (msg: WsMessage) => void) {
  const wsRef = useRef<WebSocket | null>(null);
  const retriesRef = useRef(0);
  const onMessageRef = useRef(onMessage);
  onMessageRef.current = onMessage;

  const send = useCallback((payload: object) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(payload));
    }
  }, []);

  useEffect(() => {
    let destroyed = false;

    function connect() {
      if (destroyed) return;
      // Browsers cannot set headers on a WebSocket handshake, so the session token
      // travels in the query string. The server rejects the upgrade without it.
      const ws = new WebSocket(`ws://localhost:${port}/?token=${encodeURIComponent(token)}`);
      wsRef.current = ws;

      ws.onmessage = (e) => {
        try {
          onMessageRef.current(JSON.parse(e.data) as WsMessage);
        } catch {}
      };

      ws.onopen = () => { retriesRef.current = 0; };

      ws.onclose = () => {
        if (destroyed || retriesRef.current >= MAX_RETRIES) return;
        const delay = Math.min(1000 * 2 ** retriesRef.current, 8000);
        retriesRef.current++;
        setTimeout(connect, delay);
      };
    }

    connect();
    return () => { destroyed = true; wsRef.current?.close(); };
  }, [port, token]);

  return { send };
}
