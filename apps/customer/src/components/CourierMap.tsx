import 'leaflet/dist/leaflet.css';
import * as LeafletNS from 'leaflet';
import { useEffect, useRef } from 'react';

// Leaflet ships a UMD default; normalise so `L` is the namespace either way.
const L = ((LeafletNS as unknown as { default?: typeof LeafletNS }).default ?? LeafletNS) as typeof LeafletNS;

/** The moving dot: the courier's last reported position. */
const courierPin = L.divIcon({
  className: '',
  iconSize: [40, 40],
  iconAnchor: [20, 20],
  html:
    '<div style="width:40px;height:40px;border-radius:50%;background:#2563EB;display:flex;' +
    'align-items:center;justify-content:center;box-shadow:0 4px 14px rgba(37,99,235,.45);' +
    'border:3px solid #fff">' +
    '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" ' +
    'stroke-linecap="round" stroke-linejoin="round"><circle cx="18.5" cy="17.5" r="3.5"/>' +
    '<circle cx="5.5" cy="17.5" r="3.5"/><circle cx="15" cy="5" r="1"/>' +
    '<path d="M12 17.5V14l-3-3 4-3 2 3h2"/></svg></div>',
});

/** Where the order is going. */
const dropPin = L.divIcon({
  className: '',
  iconSize: [32, 32],
  iconAnchor: [16, 30],
  html:
    '<div style="width:32px;height:32px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);' +
    'background:#EA580C;box-shadow:0 3px 10px rgba(234,88,12,.4);border:3px solid #fff"></div>',
});

/**
 * The customer's live map: where the courier is, and where it is heading. Fed by
 * the courier's GPS heartbeat, so it only appears once a position has arrived —
 * an empty map would just make the customer wonder what is broken.
 */
export function CourierMap({
  lat,
  lng,
  dropLat,
  dropLng,
}: {
  lat: number;
  lng: number;
  dropLat?: number | null;
  dropLng?: number | null;
}) {
  const el = useRef<HTMLDivElement | null>(null);
  const map = useRef<L.Map | null>(null);
  const courier = useRef<L.Marker | null>(null);

  // build once
  useEffect(() => {
    if (!el.current || map.current) return;
    try {
      map.current = L.map(el.current, { zoomControl: false, attributionControl: false }).setView([lat, lng], 15);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(map.current);
      courier.current = L.marker([lat, lng], { icon: courierPin }).addTo(map.current);
      if (dropLat != null && dropLng != null) {
        L.marker([dropLat, dropLng], { icon: dropPin }).addTo(map.current);
        // frame both ends so the customer sees the whole trip, not a blind close-up
        map.current.fitBounds(
          L.latLngBounds([lat, lng], [dropLat, dropLng]).pad(0.35),
          { maxZoom: 16 },
        );
      }
      // the container is often still settling its size on first paint
      setTimeout(() => map.current?.invalidateSize(), 120);
    } catch {
      /* a map is an enhancement — the address text above it still does the job */
    }
    return () => {
      map.current?.remove();
      map.current = null;
      courier.current = null;
    };
    // built once on mount; movement is handled by the effect below
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // follow the courier as new positions arrive
  useEffect(() => {
    if (!map.current || !courier.current) return;
    courier.current.setLatLng([lat, lng]);
    map.current.panTo([lat, lng]);
  }, [lat, lng]);

  return (
    <div
      ref={el}
      style={{
        height: 220,
        width: '100%',
        borderRadius: 22,
        overflow: 'hidden',
        border: '1.5px solid #E2E8F0',
        background: '#F1F5F9',
      }}
    />
  );
}
