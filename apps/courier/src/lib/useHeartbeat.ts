import { useEffect } from 'react';
import { sendHeartbeat } from './courier';

/** How often the phone reports where it is. Frequent enough for a live map,
 *  rare enough not to eat the battery on a full shift. */
const EVERY_MS = 20_000;

/**
 * Push the courier's GPS to the backend while they are working. This is what
 * makes "أقرب مندوب" real and what the customer's tracking map draws — without
 * it the platform only ever knows where the courier was when they were seeded.
 * Silent by design: a courier who denied location still gets offers, just
 * ranked without distance.
 */
export function useHeartbeat(active: boolean): void {
  useEffect(() => {
    if (!active || !('geolocation' in navigator)) return;

    let alive = true;
    const report = () =>
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          if (alive) void sendHeartbeat(pos.coords.latitude, pos.coords.longitude).catch(() => {});
        },
        () => {},
        { enableHighAccuracy: true, timeout: 10_000, maximumAge: 15_000 },
      );

    report();
    const timer = setInterval(report, EVERY_MS);
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, [active]);
}
