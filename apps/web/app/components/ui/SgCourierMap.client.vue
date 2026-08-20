<script setup lang="ts">
import 'leaflet/dist/leaflet.css';
import * as LeafletNS from 'leaflet';

// Leaflet ships a UMD default; normalize so `L` is the namespace either way.
const L = ((LeafletNS as unknown as { default?: typeof LeafletNS }).default ??
  LeafletNS) as typeof LeafletNS;

// Live courier position map (docs/architecture/06 §5). Client-only — needs `window`.
const props = defineProps<{ lat: number; lng: number }>();

const el = ref<HTMLElement | null>(null);
let map: import('leaflet').Map | null = null;
let marker: import('leaflet').Marker | null = null;

const pin = L.divIcon({
  className: '',
  iconSize: [38, 38],
  iconAnchor: [19, 19],
  html:
    '<div style="width:38px;height:38px;border-radius:50%;background:#059669;display:flex;' +
    'align-items:center;justify-content:center;box-shadow:0 2px 8px rgba(0,0,0,.35)">' +
    '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" ' +
    'stroke-linecap="round" stroke-linejoin="round"><circle cx="18.5" cy="17.5" r="3.5"/>' +
    '<circle cx="5.5" cy="17.5" r="3.5"/><circle cx="15" cy="5" r="1"/>' +
    '<path d="M12 17.5V14l-3-3 4-3 2 3h2"/></svg></div>',
});

onMounted(async () => {
  await nextTick(); // ensure the client-only container is in the DOM
  if (!el.value || map) return;
  try {
    map = L.map(el.value, { zoomControl: false, attributionControl: false }).setView(
      [props.lat, props.lng],
      15,
    );
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(map);
    marker = L.marker([props.lat, props.lng], { icon: pin }).addTo(map);
    // the container may still be settling its size on first paint
    setTimeout(() => map?.invalidateSize(), 100);
  } catch (err) {
    console.error('[SgCourierMap] init failed', err);
  }
});

watch(
  () => [props.lat, props.lng] as const,
  ([lat, lng]) => {
    if (map && marker) {
      marker.setLatLng([lat, lng]);
      map.panTo([lat, lng]);
    }
  },
);

onUnmounted(() => {
  map?.remove();
  map = null;
  marker = null;
});
</script>

<template>
  <div ref="el" class="h-56 w-full overflow-hidden rounded-xl border border-line" />
</template>
