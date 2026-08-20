<script setup lang="ts">
import type { StoreCardView } from '@sprintgo/shared';

const props = defineProps<{ store: StoreCardView }>();

const closed = computed(() => !props.store.isOpenNow || !props.store.isAcceptingOrders);
</script>

<template>
  <button
    type="button"
    class="flex w-full items-center gap-3 rounded-lg border border-line bg-surface p-3 text-start transition-colors hover:bg-surface-alt disabled:cursor-not-allowed"
    :class="closed ? 'opacity-60' : ''"
  >
    <div class="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-surface-alt text-ink-soft">
      <img v-if="store.logoUrl" :src="store.logoUrl" :alt="store.name" class="size-full object-cover" />
      <SgIcon v-else name="bag" :size="28" />
    </div>

    <div class="flex min-w-0 flex-1 flex-col gap-1">
      <div class="flex items-center gap-2">
        <span class="truncate text-lg font-bold text-ink">{{ store.name }}</span>
        <span v-if="closed" class="shrink-0 rounded-full bg-danger-600/10 px-2 py-0.5 text-sm font-medium text-danger-600">
          مقفول
        </span>
      </div>
      <div class="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-sm text-ink-soft">
        <span v-if="store.ratingCount > 0" class="flex items-center gap-1">
          <SgIcon name="star" :size="15" fill class="text-warning-600" />
          {{ store.ratingAvg.toFixed(1) }}
        </span>
        <span v-if="store.delivery" class="flex items-center gap-1">
          <SgIcon name="bike" :size="15" /><SgPrice :amount="store.delivery.fee" size="sm" />
        </span>
        <span v-if="store.delivery?.etaMins" class="flex items-center gap-1">
          <SgIcon name="clock" :size="15" />{{ store.delivery.etaMins }} د
        </span>
      </div>
    </div>
  </button>
</template>
