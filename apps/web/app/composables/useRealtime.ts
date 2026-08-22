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
  if (!socket) {
    // In dev we connect STRAIGHT to the API rather than through Nuxt: Nitro's
    // websocket forwarding aborts mid-write and takes the whole dev server down
    // (write ECONNABORTED). Both are localhost, so the sg_at cookie is same-site
    // and still rides along. In a real build the socket is same-origin.
    const base = import.meta.dev ? 'http://localhost:4000' : '';
    socket = io(`${base}/rt`, {
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
