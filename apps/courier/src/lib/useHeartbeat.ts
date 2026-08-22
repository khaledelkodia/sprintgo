import { useEffect } from 'react';
import { sendHeartbeat } from './courier';
import { connectRealtime, useOrderRoom } from './realtime';

/** One GPS read serves both the dispatch heartbeat and the customer's map. */
const EVERY_MS = 15_000;

/**
 * Report where the courier is while they are working.
 *
 * Two consumers, one reading:
 *  - REST `PATCH /courier/heartbeat` stores it, which is what makes "أقرب مندوب"
 *    rank on reality instead of on where the courier was seeded;
 *  - a `courier:ping` on the socket relays it straight to whoever is watching
 *    that order, so the customer's map moves without anyone polling.
 *
 * Silent by design: a courier who denied location still gets offers, just ranked
 * without distance.
 */
export function useHeartbeat(active: boolean, orderId?: string): void {
  // being in the order room is what authorises the ping relay
  useOrderRoom(active ? orderId : undefined);

  useEffect(() => {
    if (!active || !('geolocation' in navigator)) return;

    let alive = true;
    const report = () =>
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          if (!alive) return;
          const { latitude: lat, longitude: lng } = pos.coords;
          void sendHeartbeat(lat, lng).catch(() => {});
          if (orderId) connectRealtime()?.emit('courier:ping', { orderId, lat, lng });
        },
        () => {},
        { enableHighAccuracy: true, timeout: 10_000, maximumAge: 10_000 },
      );

    report();
    const timer = setInterval(report, EVERY_MS);
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, [active, orderId]);
}
