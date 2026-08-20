import { defineStore } from 'pinia';
import type { ApiSuccess, ZoneView } from '@sprintgo/shared';
import { useApi } from '~/composables/useApi';

/** Selected delivery zone — remembered so the returning user never re-picks it. */
export const useLocationStore = defineStore('location', () => {
  const api = useApi();
  const zones = ref<ZoneView[]>([]);
  const selectedZoneId = useLocalStorage<string | null>('sg-zone', null);
  const loaded = ref(false);

  const selectedZone = computed(() => zones.value.find((z) => z.id === selectedZoneId.value) ?? null);
  const needsZone = computed(() => loaded.value && !selectedZone.value);

  async function loadZones() {
    if (zones.value.length) return;
    try {
      const res = await api<ApiSuccess<ZoneView[]>>('/zones');
      zones.value = res.data;
    } finally {
      loaded.value = true;
    }
  }

  function selectZone(id: string) {
    selectedZoneId.value = id;
  }

  return { zones, selectedZoneId, selectedZone, needsZone, loaded, loadZones, selectZone };
});
