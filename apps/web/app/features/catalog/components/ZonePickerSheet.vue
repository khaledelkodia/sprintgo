<script setup lang="ts">
import { useLocationStore } from '../stores/location.store';

const open = defineModel<boolean>('open', { default: false });
const location = useLocationStore();

function pick(id: string) {
  location.selectZone(id);
  open.value = false;
}
</script>

<template>
  <SgSheet v-model:open="open" title="نوصّلك فين؟">
    <p class="mb-4 text-base text-ink-soft">اختار منطقتك عشان نوريك المحلات اللي بتوصّلها.</p>
    <div class="flex flex-col gap-2">
      <button
        v-for="zone in location.zones"
        :key="zone.id"
        type="button"
        class="flex items-center justify-between rounded-lg border p-4 text-start text-lg"
        :class="location.selectedZoneId === zone.id ? 'border-primary-600 bg-primary-50 font-bold' : 'border-line'"
        @click="pick(zone.id)"
      >
        <span class="flex items-center gap-2">
          <SgIcon name="map-pin" :size="20" class="text-primary-600" /> {{ zone.nameAr }}
        </span>
        <span class="text-sm text-ink-soft">{{ zone.city }}</span>
      </button>
    </div>
  </SgSheet>
</template>
