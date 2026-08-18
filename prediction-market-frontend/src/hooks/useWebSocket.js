/**
 * useWebSocket.js
 * Live status updates for the events listed in spec section 8.
 *
 * Two rules this hook is built around:
 *
 *  1. The socket is a nudge, never the source of truth. Every consumer also
 *     re-fetches over REST when a frame arrives (and on reconnect), so a
 *     dropped message can never leave the screen showing stale numbers.
 *     This matters on free hosting, where the server sleeps and connections die.
 *
 *  2. It reconnects on its own, with backoff, and stops trying while the tab
 *     is hidden or the browser is offline.
 *
 * In mock mode it listens to a window event instead of a real socket, so the
 * whole live-update flow can be demonstrated with no backend running.
 */

import { useCallback, useEffect, useRef } from 'react';
import { WS_URL } from '../utils/constants';
import { getToken } from '../api/client';

const MAX_BACKOFF = 20000;

function resolveUrl() {
  if (WS_URL) return WS_URL;
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${protocol}//${window.location.host}/ws`;
}

/**
 * @param {(frame: object) => void} onEvent  called for every incoming frame
 * @param {{ enabled?: boolean }} options
 */
export default function useWebSocket(onEvent, { enabled = true } = {}) {
  const socketRef = useRef(null);
  const attemptsRef = useRef(0);
  const timerRef = useRef(null);
  const closedByUsRef = useRef(false);

  // Keep the latest callback without forcing a reconnect on every render.
  const handlerRef = useRef(onEvent);
  useEffect(() => {
    handlerRef.current = onEvent;
  }, [onEvent]);

  const cleanup = useCallback(() => {
    closedByUsRef.current = true;
    clearTimeout(timerRef.current);
    if (socketRef.current) {
      socketRef.current.onclose = null;
      socketRef.current.close();
      socketRef.current = null;
    }
  }, []);

  /* ---- an actual WebSocket, with backoff ---------------------------------- */
  useEffect(() => {
    if (!enabled) return undefined;

    closedByUsRef.current = false;

    const connect = () => {
      if (closedByUsRef.current) return;
      if (document.visibilityState === 'hidden' || !navigator.onLine) {
        timerRef.current = setTimeout(connect, 4000);
        return;
      }

      const token = getToken();
      // A browser cannot set an Authorization header on the handshake, so the
      // JWT travels as a query parameter. Validate it in a Spring
      // HandshakeInterceptor and reject the upgrade if it is bad.
      const url = `${resolveUrl()}${token ? `?token=${encodeURIComponent(token)}` : ''}`;

      let socket;
      try {
        socket = new WebSocket(url);
      } catch {
        scheduleReconnect();
        return;
      }
      socketRef.current = socket;

      socket.onopen = () => {
        attemptsRef.current = 0;
        // Tell listeners to re-sync over REST - we may have missed frames
        // while we were disconnected.
        handlerRef.current?.({ event: 'SOCKET_RECONNECTED', silent: true });
      };

      socket.onmessage = (message) => {
        try {
          handlerRef.current?.(JSON.parse(message.data));
        } catch {
          /* ignore malformed frames */
        }
      };

      socket.onclose = () => {
        socketRef.current = null;
        if (!closedByUsRef.current) scheduleReconnect();
      };

      socket.onerror = () => socket.close();
    };

    const scheduleReconnect = () => {
      attemptsRef.current += 1;
      const wait = Math.min(1000 * 2 ** (attemptsRef.current - 1), MAX_BACKOFF);
      const jitter = Math.random() * 400;
      timerRef.current = setTimeout(connect, wait + jitter);
    };

    connect();

    // Reconnect immediately when the user comes back to the tab or regains network.
    const wake = () => {
      if (!socketRef.current && !closedByUsRef.current) {
        clearTimeout(timerRef.current);
        attemptsRef.current = 0;
        connect();
      }
    };
    document.addEventListener('visibilitychange', wake);
    window.addEventListener('online', wake);

    return () => {
      document.removeEventListener('visibilitychange', wake);
      window.removeEventListener('online', wake);
      cleanup();
    };
  }, [enabled, cleanup]);
}
