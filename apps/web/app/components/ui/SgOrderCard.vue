<script setup lang="ts">
import type { OrderCardView } from '@sprintgo/shared';

defineProps<{ order: OrderCardView }>();
</script>

<template>
  <NuxtLink
    :to="`/orders/${order.id}`"
    class="flex flex-col gap-2 rounded-lg border border-line bg-surface p-4"
  >
    <div class="flex items-center justify-between gap-2">
      <span class="truncate text-base font-bold text-ink">{{ order.storeName ?? 'مشوار' }}</span>
      <SgStatusBadge :status="order.status" :label="order.statusLabel" />
    </div>
    <div class="flex items-center justify-between text-sm text-ink-soft">
      <span>{{ order.code }} · {{ order.itemsCount }} صنف</span>
      <SgPrice :amount="order.total" size="base" class="text-ink" />
    </div>
  </NuxtLink>
</template>
