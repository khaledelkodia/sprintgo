<script setup lang="ts">
import { displayPhone, formatMoney, vehicleLabel } from '@sprintgo/shared';
import type { CourierTaskView } from '@sprintgo/shared';

defineProps<{ task: CourierTaskView; busy?: boolean }>();

/** A pin becomes turn-by-turn directions; no pin, no button. */
const mapUrl = (lat: number | null, lng: number | null) =>
  lat == null || lng == null ? null : `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
defineEmits<{ pickup: []; delivered: []; goodsCost: [] }>();
</script>

<template>
  <SgCard>
    <div class="flex flex-col gap-4">
      <div class="flex items-center justify-between">
        <span class="text-base font-bold text-ink">{{ task.code }}</span>
        <div class="flex items-center gap-2">
          <span
            class="rounded-full px-3 py-1 text-sm font-semibold"
            :class="task.flowType === 'ERRAND' ? 'bg-info-600/10 text-info-600' : 'bg-primary-50 text-primary-700'"
          >
            {{ task.flowType === 'ERRAND' ? 'مشوار' : 'توصيل طلب' }}
          </span>
          <span v-if="task.vehicleType" class="rounded-full bg-surface-alt px-3 py-1 text-sm font-bold text-ink">
            {{ vehicleLabel(task.vehicleType) }}
          </span>
        </div>
      </div>

      <!-- pickup -->
      <div v-if="task.pickup" class="flex items-start gap-3">
        <div class="mt-1 flex size-8 items-center justify-center rounded-full bg-warning-600/10 text-warning-600">
          <SgIcon name="bag" :size="18" />
        </div>
        <div class="flex flex-1 flex-col">
          <span class="text-sm text-ink-soft">الاستلام من</span>
          <span class="text-base font-bold text-ink">{{ task.pickup.name }}</span>
          <span v-if="task.pickup.text" class="text-sm text-ink-soft">{{ task.pickup.text }}</span>
        </div>
        <a v-if="task.pickup.phone" :href="`tel:${task.pickup.phone}`" class="flex size-10 items-center justify-center rounded-full bg-primary-600 text-white" aria-label="اتصل">
          <SgIcon name="phone" :size="18" />
        </a>
        <a
          v-if="mapUrl(task.pickup.lat, task.pickup.lng)"
          :href="mapUrl(task.pickup.lat, task.pickup.lng)!"
          target="_blank"
          rel="noreferrer"
          class="flex size-10 items-center justify-center rounded-full bg-success-600 text-white"
          aria-label="افتح الخريطة"
        >
          <SgIcon name="map-pin" :size="18" />
        </a>
      </div>

      <!-- dropoff -->
      <div v-if="task.dropoff" class="flex items-start gap-3">
        <div class="mt-1 flex size-8 items-center justify-center rounded-full bg-success-600/10 text-success-600">
          <SgIcon name="map-pin" :size="18" />
        </div>
        <div class="flex flex-1 flex-col">
          <span class="text-sm text-ink-soft">التوصيل إلى</span>
          <span class="text-base font-bold text-ink">{{ task.dropoff.name }}</span>
          <span class="text-sm text-ink-soft">{{ task.dropoff.zoneName }} · {{ task.dropoff.street }}</span>
          <span v-if="task.dropoff.landmark" class="text-sm text-ink-soft">علامة: {{ task.dropoff.landmark }}</span>
        </div>
        <a v-if="task.dropoff.phone" :href="`tel:${task.dropoff.phone}`" class="flex size-10 items-center justify-center rounded-full bg-primary-600 text-white" aria-label="اتصل">
          <SgIcon name="phone" :size="18" />
        </a>
        <a
          v-if="mapUrl(task.dropoff.lat, task.dropoff.lng)"
          :href="mapUrl(task.dropoff.lat, task.dropoff.lng)!"
          target="_blank"
          rel="noreferrer"
          class="flex size-10 items-center justify-center rounded-full bg-success-600 text-white"
          aria-label="افتح الخريطة"
        >
          <SgIcon name="map-pin" :size="18" />
        </a>
      </div>

      <p v-if="task.instructions" class="rounded-lg bg-surface-alt p-3 text-base text-ink">
        {{ task.instructions }}
      </p>

      <!-- cash to collect (the number the courier cares about most) -->
      <div class="flex items-center justify-between rounded-xl bg-primary-50 px-4 py-3">
        <span class="flex items-center gap-2 text-base font-semibold text-primary-700">
          <SgIcon name="banknote" :size="22" /> المطلوب تحصيله
        </span>
        <span class="text-2xl font-bold text-primary-700" dir="rtl">{{ formatMoney(task.cashToCollect) }}</span>
      </div>
      <p v-if="task.purchaseBudget" class="text-sm text-warning-600">
        اشترِ بحد أقصى {{ formatMoney(task.purchaseBudget) }} ثم سجّل المبلغ الفعلي.
      </p>

      <!-- action -->
      <SgButton v-if="task.assignmentStatus === 'ASSIGNED'" size="xl" block :loading="busy" @click="$emit('pickup')">
        استلمت الطلب
      </SgButton>
      <template v-else>
        <SgButton
          v-if="task.purchaseBudget"
          variant="secondary"
          block
          @click="$emit('goodsCost')"
        >
          سجّل المبلغ اللي اتصرف
        </SgButton>
        <SgButton size="xl" block :loading="busy" @click="$emit('delivered')">تم التوصيل</SgButton>
      </template>
    </div>
  </SgCard>
</template>
