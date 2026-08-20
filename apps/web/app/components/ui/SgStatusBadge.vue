<script setup lang="ts">
import type { OrderStatus } from '@sprintgo/shared';

const props = defineProps<{ status: OrderStatus; label: string }>();

// icon + tone per status — never color-only (docs/architecture/08 §7)
const tone = computed(() => {
  const map: Record<OrderStatus, string> = {
    PLACED: 'bg-info-600/10 text-info-600',
    PREPARING: 'bg-warning-600/10 text-warning-600',
    READY: 'bg-warning-600/10 text-warning-600',
    OUT_FOR_DELIVERY: 'bg-info-600/10 text-info-600',
    DELIVERED: 'bg-success-600/10 text-success-600',
    COMPLETED: 'bg-success-600/10 text-success-600',
    CANCELLED: 'bg-danger-600/10 text-danger-600',
  };
  return map[props.status];
});

const icon = computed(() => {
  const map: Record<OrderStatus, string> = {
    PLACED: 'M5 13l4 4L19 7',
    PREPARING: 'M12 6v6l4 2',
    READY: 'M5 13l4 4L19 7',
    OUT_FOR_DELIVERY: 'M3 12h13l3 4M5 16a2 2 0 104 0',
    DELIVERED: 'M5 13l4 4L19 7',
    COMPLETED: 'M5 13l4 4L19 7',
    CANCELLED: 'M6 18L18 6M6 6l12 12',
  };
  return map[props.status];
});
</script>

<template>
  <span class="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-semibold" :class="tone">
    <svg class="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <path :d="icon" />
    </svg>
    {{ label }}
  </span>
</template>
