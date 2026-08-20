<script setup lang="ts">
import { displayPhone } from '@sprintgo/shared';
import type { MerchantOrderView } from '@sprintgo/shared';

withDefaults(defineProps<{ order: MerchantOrderView; busy?: boolean; actionable?: boolean }>(), {
  actionable: true,
});
defineEmits<{ accept: []; reject: []; ready: []; handover: [] }>();

function elapsed(iso: string): string {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return 'دلوقتي';
  return `من ${mins} دقيقة`;
}
</script>

<template>
  <SgCard>
    <div class="flex flex-col gap-3">
      <!-- head -->
      <div class="flex items-start justify-between gap-2">
        <div class="flex flex-col">
          <span class="text-base font-bold text-ink">{{ order.code }}</span>
          <span class="text-sm text-ink-soft">
            {{ order.customerName ?? 'عميل' }} · {{ elapsed(order.placedAt) }}
          </span>
        </div>
        <SgPrice :amount="order.total" size="lg" class="text-primary-700" />
      </div>

      <!-- items -->
      <ul class="flex flex-col gap-1 rounded-lg bg-surface-alt p-3">
        <li v-for="item in order.items" :key="item.id" class="flex flex-col text-base">
          <span class="font-semibold text-ink">{{ item.quantity }}× {{ item.name }}</span>
          <span v-if="item.options.length" class="text-sm text-ink-soft">
            {{ item.options.map((o) => o.optionName).join('، ') }}
          </span>
          <span v-if="item.notes" class="flex items-center gap-1 text-sm text-warning-600">
            <SgIcon name="note" :size="14" /> {{ item.notes }}
          </span>
        </li>
      </ul>

      <p v-if="order.customerNotes" class="flex items-center gap-1 text-sm text-warning-600">
        <SgIcon name="note" :size="16" /> {{ order.customerNotes }}
      </p>

      <!-- fulfillment + payment chips -->
      <div class="flex flex-wrap gap-2 text-sm">
        <span class="flex items-center gap-1 rounded-full bg-surface-alt px-3 py-1 text-ink-soft">
          <SgIcon :name="order.fulfillmentType === 'PICKUP' ? 'bag' : 'bike'" :size="15" />
          {{ order.fulfillmentType === 'PICKUP' ? 'استلام من المحل' : 'توصيل' }}
        </span>
        <span class="flex items-center gap-1 rounded-full bg-surface-alt px-3 py-1 text-ink-soft">
          <SgIcon name="banknote" :size="15" /> كاش
        </span>
      </div>

      <!-- actions (hidden when the owner lacks merchant.orders — board stays read-only) -->
      <div v-if="actionable" class="flex gap-2">
        <template v-if="order.status === 'PLACED'">
          <SgButton variant="secondary" :disabled="busy" @click="$emit('reject')">رفض</SgButton>
          <SgButton block :loading="busy" @click="$emit('accept')">ابدأ التجهيز</SgButton>
        </template>
        <template v-else-if="order.status === 'PREPARING'">
          <SgButton block :loading="busy" @click="$emit('ready')">الطلب جاهز</SgButton>
        </template>
        <template v-else-if="order.status === 'READY'">
          <SgButton
            v-if="order.fulfillmentType === 'PICKUP'"
            block
            :loading="busy"
            @click="$emit('handover')"
          >
            تسليم للعميل
          </SgButton>
          <div
            v-else
            class="flex w-full items-center justify-center gap-2 rounded-md bg-info-600/10 py-3 text-base font-semibold text-info-600"
          >
            <SgIcon name="bike" :size="18" />
            {{ order.hasCourier ? 'المندوب في الطريق للاستلام' : 'في انتظار مندوب' }}
          </div>
        </template>
      </div>
    </div>
  </SgCard>
</template>
