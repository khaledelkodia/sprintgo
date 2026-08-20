import { Injectable, Logger } from '@nestjs/common';
import { RealtimeGateway } from './realtime.gateway';

/**
 * Thin façade services use to push hints without touching socket internals.
 * Fire-and-forget: a realtime failure must never break a REST write, so every
 * emit is guarded and swallowed.
 */
@Injectable()
export class RealtimeService {
  private readonly logger = new Logger('Realtime');

  constructor(private readonly gateway: RealtimeGateway) {}

  emit(room: string, event: string, payload: unknown): void {
    try {
      this.gateway.server?.to(room).emit(event, payload);
    } catch (err) {
      this.logger.warn(`emit ${event} → ${room} failed: ${String(err)}`);
    }
  }

  /** Emit the same event to several rooms at once (deduped by socket.io). */
  emitMany(rooms: string[], event: string, payload: unknown): void {
    for (const room of rooms) this.emit(room, event, payload);
  }
}
