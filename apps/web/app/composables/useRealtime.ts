import { io, type Socket } from 'socket.io-client';

/**
 * Read-only realtime hints (docs/architecture/06). One shared socket per tab,
 * authenticated by the same-origin sg_at cookie. The server auto-joins the
 * principal's rooms (user/store/courier/admin); order rooms are joined on demand
 * and re-joined after reconnects. Handlers should refetch REST truth, not trust
 * the payload — sockets never carry authoritative state.
 */
let socket: Socket | null = null;
const joinedRooms = new Set<string>();

function ensure(): Socket | null {
  if (!import.meta.client) return null;
  // The Nuxt dev proxy's websocket forwarding can abort mid-write and crash the
  // whole dev server (write ECONNABORTED) — which knocked the dashboard offline
  // right after login. Realtime is a read-only enhancement and the app already
  // falls back to REST + 15s polling, so we skip the socket in dev and connect
  // only in real builds, where there's no dev proxy in the websocket path.
  if (import.meta.dev) return null;
  if (!socket) {
    // default transports: connect via polling (works through the dev proxy) then
    // upgrade to websocket. Forcing websocket-first fails silently behind the proxy.
    socket = io('/rt', {
      path: '/socket.io',
      withCredentials: true,
    });
    // rejoin any order rooms after a reconnect
    socket.on('connect', () => {
      for (const room of joinedRooms) socket?.emit('join', { room });
    });
  }
  return socket;
}

export function useRealtime() {
  function on(event: string, handler: (payload: unknown) => void): () => void {
    const s = ensure();
    s?.on(event, handler);
    return () => s?.off(event, handler);
  }

  function emit(event: string, payload: unknown) {
    ensure()?.emit(event, payload);
  }

  function joinOrder(orderId: string) {
    const room = `order:${orderId}`;
    joinedRooms.add(room);
    ensure()?.emit('join', { room });
  }

  function leaveOrder(orderId: string) {
    const room = `order:${orderId}`;
    joinedRooms.delete(room);
    ensure()?.emit('leave', { room });
  }

  function disconnect() {
    socket?.disconnect();
    socket = null;
    joinedRooms.clear();
  }

  return { on, emit, joinOrder, leaveOrder, disconnect };
}
