<script setup lang="ts">
import type { CourierSummaryView } from '@sprintgo/shared';
import { useCourier } from '~/features/courier/composables/useCourier';

definePageMeta({ layout: 'staff', middleware: ['auth', 'role'], role: 'COURIER' });

const courier = useCourier();
const summary = ref<CourierSummaryView | null>(null);
const pending = ref(true);

onMounted(async () => {
  try {
    summary.value = await courier.summary();
  } finally {
    pending.value = false;
  }
});
</script>

<template>
  <div class="flex flex-1 flex-col">
    <SgTopBar title="ملخص اليوم" back />

    <div class="flex flex-col gap-4 p-5">
      <template v-if="pending">
        <SgSkeleton variant="card" class="h-28" />
        <SgSkeleton variant="card" class="h-28" />
      </template>

      <template v-else-if="summary">
        <SgCard>
          <div class="flex flex-col items-center gap-1 py-2">
            <span class="text-sm text-ink-soft">عدد التوصيلات النهاردة</span>
            <span class="text-2xl font-bold text-ink">{{ summary.deliveries }}</span>
          </div>
        </SgCard>

        <SgCard>
          <div class="flex items-center justify-between">
            <span class="flex items-center gap-2 text-base text-ink">
              <SgIcon name="banknote" :size="20" class="text-primary-700" /> الكاش معاك
            </span>
            <SgPrice :amount="summary.cashInHand" size="lg" />
          </div>
        </SgCard>

        <SgCard>
          <div class="flex items-center justify-between">
            <span class="text-base text-ink">اللي عليك توريده للمنصة</span>
            <SgPrice :amount="summary.feesToRemit" size="lg" class="text-primary-700" />
          </div>
          <p class="mt-2 text-sm text-ink-soft">ده عمولة المنصة من التوصيلات — ورّدها في نهاية اليوم.</p>
        </SgCard>
      </template>
    </div>
  </div>
</template>
