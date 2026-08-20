<script setup lang="ts">
import type { OrderCardView } from '@sprintgo/shared';
import { useOrders } from '~/features/orders/composables/useOrders';

definePageMeta({ layout: 'customer', middleware: 'auth' });

const orders = useOrders();
const list = ref<OrderCardView[]>([]);
const pending = ref(true);

onMounted(async () => {
  try {
    list.value = await orders.list();
  } finally {
    pending.value = false;
  }
});
</script>

<template>
  <div class="flex flex-1 flex-col">
    <SgTopBar title="طلباتي" />

    <div class="flex flex-col gap-3 p-5">
      <template v-if="pending">
        <SgSkeleton v-for="i in 3" :key="i" variant="card" class="h-24" />
      </template>

      <template v-else-if="list.length">
        <SgOrderCard v-for="order in list" :key="order.id" :order="order" />
      </template>

      <SgEmptyState v-else icon="package" title="لسه معملتش أي طلب" hint="اطلب من محلاتك المفضلة في ثواني.">
        <SgButton @click="navigateTo('/')">اطلب دلوقتي</SgButton>
      </SgEmptyState>
    </div>
  </div>
</template>
