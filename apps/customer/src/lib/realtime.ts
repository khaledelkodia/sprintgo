import { useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import type { Socket } from 'socket.io-client';
import { getToken } from './api';

const API_BASE = import.meta.env.VITE_API_BASE ?? '/api/v1';

/**
 * The socket lives beside `/api/v1`, not under it. In dev the base is a relative
 * path and Vite proxies `/socket.io` to the API; in the packaged app the base is
 * absolute, so we take its origin.
 */
function origin(): string | undefined {
  if (API_BASE.startsWith('/')) return undefined; // same origin as the page
  try {
    return new URL(API_BASE).origin;
  } catch {
    return undefined;
  }
}

let socket: Socket | null = null;
/** Order rooms we are in, so a reconnect can restore them. */
const rooms = new Set<string>();

/**
 * One socket for the whole app. This is what replaced polling: the server pushes
 * order and offer events, and the screens refetch REST truth when one lands
 * (ADR-008 — sockets are hints, REST is the source of truth).
 *
 * socket.io falls back to HTTP long-polling on its own when a proxy blocks
 * WebSocket, so a hostile network degrades the transport, not the feature.
 */
export function connectRealtime(): Socket | null {
  const token = getToken();
  if (!token) return null;
  if (socket?.connected || socket?.active) return socket;

  socket = io(`${origin() ?? ''}/rt`, {
    path: '/socket.io',
    // the WebView has no cross-origin cookie, so the token rides the handshake
    auth: { token },
    withCredentials: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 8000,
  });

  socket.on('connect', () => {
    // rejoin whatever we were watching before the drop
    for (const room of rooms) socket?.emit('join', { room });
  });
  return socket;
}

export function disconnectRealtime(): void {
  rooms.clear();
  socket?.disconnect();
  socket = null;
}

/** Keep one live socket while the user is signed in. */
export function useRealtime(signedIn: boolean): void {
  useEffect(() => {
    if (!signedIn) {
      disconnectRealtime();
      return;
    }
    connectRealtime();
  }, [signedIn]);
}

/**
 * Subscribe to a server event. The handler is kept in a ref so a screen can pass
 * an inline arrow function without re-binding the listener on every render.
 */
export function useRealtimeEvent(event: string, handler: (payload: unknown) => void): void {
  const ref = useRef(handler);
  ref.current = handler;

  useEffect(() => {
    const s = connectRealtime();
    if (!s) return;
    const fn = (payload: unknown) => ref.current(payload);
    s.on(event, fn);
    return () => {
      s.off(event, fn);
    };
  }, [event]);
}

/** Watch one order's room — this is what carries the courier's live position. */
export function useOrderRoom(orderId: string | undefined): void {
  useEffect(() => {
    if (!orderId) return;
    const room = `order:${orderId}`;
    const s = connectRealtime();
    rooms.add(room);
    s?.emit('join', { room });
    return () => {
      rooms.delete(room);
      s?.emit('leave', { room });
    };
  }, [orderId]);
}
