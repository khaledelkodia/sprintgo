import { RT_EVENTS } from '@sprintgo/shared';
import { useRealtime } from '~/composables/useRealtime';

/**
 * While the courier is out for delivery, ping their GPS to each active order's
 * room every 5s (docs/architecture/06 §5). GPS cadence is decoupled from the
 * emit cadence so we never flood the socket. Ephemeral — nothing is persisted.
 */
export function useCourierTracking() {
  const rt = useRealtime();
  let geoWatch: number | null = null;
  let timer: ReturnType<typeof setInterval> | null = null;
  let last: { lat: number; lng: number } | null = null;
  let orderIds: string[] = [];

  function setActive(ids: string[]) {
    // join any newly-active order rooms so relays reach the customer
    for (const id of ids) if (!orderIds.includes(id)) rt.joinOrder(id);
    orderIds = ids;
    if (ids.length > 0) start();
    else stop();
  }

  function start() {
    if (!import.meta.client || !navigator.geolocation) return;
    if (geoWatch === null) {
      geoWatch = navigator.geolocation.watchPosition(
        (pos) => {
          last = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        },
        () => {
          /* permission denied / unavailable — degrade silently */
        },
        { enableHighAccuracy: true, maximumAge: 4000, timeout: 10000 },
      );
    }
    if (timer === null) {
      timer = setInterval(() => {
        if (!last) return;
        for (const id of orderIds) {
          rt.emit(RT_EVENTS.courierPing, { orderId: id, lat: last.lat, lng: last.lng });
        }
      }, 5000);
    }
  }

  function stop() {
    if (geoWatch !== null && import.meta.client) {
      navigator.geolocation.clearWatch(geoWatch);
      geoWatch = null;
    }
    if (timer !== null) {
      clearInterval(timer);
      timer = null;
    }
  }

  return { setActive, stop };
}
