import { Logger } from '@nestjs/common';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { JwtService } from '@nestjs/jwt';
import type { Server, Socket } from 'socket.io';
import type { Role } from '@sprintgo/shared';
import { rtRooms } from '@sprintgo/shared';
import { PrismaService } from '../prisma/prisma.service';
import { corsOrigins } from '../config/cors';
import { parseCookie } from './cookie.util';

interface SocketData {
  userId: string;
  roles: Role[];
}

/**
 * Read-only realtime hints (docs/architecture/06). Clients only manage room
 * membership here; all business writes stay on REST.
 *
 * Two kinds of client authenticate here: the web dashboard rides its `sg_at`
 * cookie (same origin, ADR-003), while the packaged apps send a Bearer token in
 * the handshake — a WebView cannot rely on a cross-origin httpOnly cookie.
 */
@WebSocketGateway({ namespace: '/rt', cors: { origin: corsOrigins(), credentials: true } })
export class RealtimeGateway implements OnGatewayConnection {
  private readonly logger = new Logger('Realtime');

  @WebSocketServer()
  server!: Server;

  constructor(
    private readonly jwt: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  /** Handshake token: app Bearer first, then the browser's cookie. */
  private tokenFrom(client: Socket): string | null {
    const auth = client.handshake.auth as { token?: string } | undefined;
    if (auth?.token) return auth.token;
    const header = client.handshake.headers.authorization;
    if (header?.startsWith('Bearer ')) return header.slice(7);
    return parseCookie(client.handshake.headers.cookie, 'sg_at');
  }

  async handleConnection(client: Socket): Promise<void> {
    const token = this.tokenFrom(client);
    if (!token) return this.reject(client);

    let payload: { sub: string; roles?: Role[] };
    try {
      payload = this.jwt.verify(token);
    } catch {
      return this.reject(client);
    }

    const roles = payload.roles ?? [];
    (client.data as SocketData) = { userId: payload.sub, roles };

    // auto-join the rooms this principal is always allowed in
    client.join(rtRooms.user(payload.sub));
    if (roles.includes('COURIER')) client.join(rtRooms.courier(payload.sub));
    if (roles.includes('ADMIN') || roles.includes('SUPER_ADMIN')) client.join(rtRooms.admin);
    if (roles.includes('MERCHANT')) {
      const store = await this.prisma.store.findFirst({
        where: { ownerId: payload.sub, deletedAt: null },
        select: { id: true },
      });
      if (store) client.join(rtRooms.store(store.id));
    }
  }

  private reject(client: Socket): void {
    client.disconnect(true);
  }

  /** Join an order room — only the parties of that order may listen. */
  @SubscribeMessage('join')
  async onJoin(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { room?: string },
  ): Promise<{ ok: boolean }> {
    const data = client.data as SocketData;
    const room = body?.room ?? '';
    const match = /^order:(.+)$/.exec(room);
    if (!match || !data?.userId) return { ok: false };

    const orderId = match[1]!;
    if (await this.mayViewOrder(orderId, data)) {
      client.join(room);
      return { ok: true };
    }
    return { ok: false };
  }

  @SubscribeMessage('leave')
  onLeave(@ConnectedSocket() client: Socket, @MessageBody() body: { room?: string }): void {
    if (body?.room) client.leave(body.room);
  }

  /**
   * Courier GPS ping → relayed to the order room (docs/architecture/06 §5).
   * Ephemeral (never persisted). Authorization is implicit: the courier must
   * already be joined to the order room, which required an active assignment.
   */
  @SubscribeMessage('courier:ping')
  onCourierPing(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { orderId?: string; lat?: number; lng?: number },
  ): void {
    const data = client.data as SocketData;
    const { orderId, lat, lng } = body ?? {};
    if (!orderId || typeof lat !== 'number' || typeof lng !== 'number') return;
    if (!data?.roles?.includes('COURIER')) return;

    const room = rtRooms.order(orderId);
    if (!client.rooms.has(room)) return; // must have joined (been authorized for) the room

    // relay to everyone in the room except the courier who sent it
    client.to(room).emit('courier:location', { orderId, lat, lng, at: Date.now() });
  }

  private async mayViewOrder(orderId: string, data: SocketData): Promise<boolean> {
    if (data.roles.includes('ADMIN') || data.roles.includes('SUPER_ADMIN')) return true;
    const order = await this.prisma.order.findFirst({
      where: {
        id: orderId,
        OR: [
          { customerId: data.userId },
          { store: { ownerId: data.userId } },
          { assignments: { some: { courierId: data.userId, status: { in: ['ASSIGNED', 'PICKED_UP'] } } } },
        ],
      },
      select: { id: true },
    });
    return order !== null;
  }
}
