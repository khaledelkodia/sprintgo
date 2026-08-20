<script setup lang="ts">
import { formatMoney } from '@sprintgo/shared';
import type { CourierOfferView } from '@sprintgo/shared';

const props = defineProps<{ offer: CourierOfferView; busy?: boolean }>();
defineEmits<{ accept: []; reject: [] }>();

// live countdown until the offer expires
const now = ref(Date.now());
let timer: ReturnType<typeof setInterval> | undefined;
onMounted(() => {
  timer = setInterval(() => (now.value = Date.now()), 500);
});
onUnmounted(() => clearInterval(timer));

const secondsLeft = computed(() =>
  Math.max(0, Math.ceil((new Date(props.offer.expiresAt).getTime() - now.value) / 1000)),
);
const pct = computed(() => Math.min(100, (secondsLeft.value / 30) * 100));
</script>

<template>
  <div class="shadow-sheet flex flex-col gap-4 rounded-2xl border-2 border-primary-600 bg-primary-50 p-5">
    <div class="flex items-center justify-between">
      <span class="flex items-center gap-2 text-lg font-bold text-primary-700">
        <SgIcon name="bike" :size="22" /> طلب توصيل جديد
      </span>
      <span class="flex size-12 items-center justify-center rounded-full bg-primary-600 text-xl font-bold text-white tabular-nums">
        {{ secondsLeft }}
      </span>
    </div>

    <!-- countdown bar -->
    <div class="h-1.5 overflow-hidden rounded-full bg-primary-600/20">
      <div class="h-full bg-primary-600 transition-[width] duration-500" :style="{ width: `${pct}%` }" />
    </div>

    <div class="flex flex-col gap-2 rounded-xl bg-surface p-3">
      <div class="flex items-center justify-between">
        <span class="text-base font-bold text-ink">{{ offer.code }}</span>
        <span class="rounded-full px-2 py-0.5 text-xs font-medium" :class="offer.flowType === 'ERRAND' ? 'bg-info-600/10 text-info-600' : 'bg-primary-50 text-primary-700'">
          {{ offer.flowType === 'ERRAND' ? 'مشوار' : 'توصيل' }}
        </span>
      </div>
      <p v-if="offer.storeName || offer.pickupText" class="flex items-center gap-1 text-sm text-ink-soft">
        <SgIcon name="bag" :size="15" /> {{ offer.storeName ?? offer.pickupText }}
      </p>
      <p v-if="offer.dropoffZone" class="flex items-center gap-1 text-sm text-ink-soft">
        <SgIcon name="map-pin" :size="15" /> {{ offer.dropoffZone }}
      </p>
      <div class="flex items-center gap-3 text-sm">
        <span v-if="offer.distanceKm !== null" class="flex items-center gap-1 font-semibold text-primary-700">
          <SgIcon name="bike" :size="15" /> {{ offer.distanceKm }} كم · ~{{ offer.etaMins }} د
        </span>
        <span class="flex items-center gap-1 text-ink-soft">
          <SgIcon name="banknote" :size="15" /> {{ formatMoney(offer.cashToCollect) }}
        </span>
      </div>
    </div>

    <div class="flex gap-2">
      <SgButton variant="secondary" :disabled="busy" @click="$emit('reject')">رفض</SgButton>
      <SgButton size="xl" block :loading="busy" @click="$emit('accept')">قبول الطلب</SgButton>
    </div>
  </div>
</template>
