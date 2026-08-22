<script setup lang="ts">
import { formatMoney } from '@sprintgo/shared';
import type { CourierSuggestionView, DispatchItemView } from '@sprintgo/shared';
import type { ApiError } from '~/composables/useApi';
import { useDispatch } from '~/features/admin/composables/useDispatch';

definePageMeta({ layout: 'admin-dash', middleware: ['auth', 'role'], role: ['ADMIN', 'SUPER_ADMIN'] });

const dispatch = useDispatch();
const toast = useToast();

const queue = ref<DispatchItemView[]>([]);
const availableCount = ref(0);
const pending = ref(true);
const picking = ref<DispatchItemView | null>(null);
const suggestions = ref<CourierSuggestionView[]>([]);
const loadingSuggestions = ref(false);
const busy = ref(false);
const nearestBusyId = ref<string | null>(null);

async function load() {
  try {
    const [q, couriers] = await Promise.all([dispatch.queue(), dispatch.couriers(true)]);
    queue.value = q;
    availableCount.value = couriers.length;
  } catch {
    // keep last-known
  } finally {
    pending.value = false;
  }
}

// load distance-ranked suggestions whenever a picker opens
watch(picking, async (item) => {
  if (!item) return;
  loadingSuggestions.value = true;
  suggestions.value = [];
  try {
    suggestions.value = await dispatch.suggestions(item.orderId);
  } finally {
    loadingSuggestions.value = false;
  }
});

async function choose(courier: CourierSuggestionView) {
  if (!picking.value || busy.value) return;
  busy.value = true;
  const item = picking.value;
  try {
    if (item.courier) await dispatch.reassign(item.orderId, courier.id);
    else await dispatch.assign(item.orderId, courier.id);
    toast.success(`تم تعيين ${courier.name ?? 'المندوب'}`);
    picking.value = null;
    await load();
  } catch (err) {
    toast.error((err as ApiError).message);
  } finally {
    busy.value = false;
  }
}

/** One-tap: assign the closest available courier automatically. */
async function assignNearest(item: DispatchItemView) {
  if (nearestBusyId.value) return;
  nearestBusyId.value = item.orderId;
  try {
    const res = await dispatch.assignNearest(item.orderId);
    toast.success(`تم تعيين أقرب مندوب: ${res.courierName ?? 'مندوب'}`);
    await load();
  } catch (err) {
    toast.error((err as ApiError).message);
  } finally {
    nearestBusyId.value = null;
  }
}

const rt = useRealtime();
// the socket does the real work; this is a safety net for a dropped connection,
// not a poll — see docs/architecture/06
const { pause, resume } = useIntervalFn(load, 60_000, { immediate: false });
let offNew: (() => void) | undefined;
let offStatus: (() => void) | undefined;
onMounted(async () => {
  await load();
  resume();
  // errands + new orders reach the queue instantly; polling is the fallback
  offNew = rt.on('order:new', () => load());
  offStatus = rt.on('order:status', () => load());
});
onUnmounted(() => {
  pause();
  offNew?.();
  offStatus?.();
});
</script>

<template>
  <div>
    <AdminPageHeader title="توزيع الطلبات" subtitle="عيّن أقرب مندوب أو راجع الطابور" />

    <div class="flex flex-col gap-3">
      <div class="flex items-center justify-between text-sm text-ink-soft">
        <span>{{ queue.length }} طلب في الطابور</span>
        <span>{{ availableCount }} مندوب متاح</span>
      </div>

      <template v-if="pending">
        <SgSkeleton v-for="i in 4" :key="i" variant="card" class="h-24" />
      </template>

      <template v-else-if="queue.length">
        <SgCard v-for="item in queue" :key="item.orderId">
          <div class="flex items-center justify-between gap-2">
            <div class="flex flex-col">
              <span class="flex items-center gap-2 text-base font-bold text-ink">
                {{ item.code }}
                <span class="rounded-full px-2 py-0.5 text-xs font-medium" :class="item.flowType === 'ERRAND' ? 'bg-info-600/10 text-info-600' : 'bg-primary-50 text-primary-700'">
                  {{ item.flowType === 'ERRAND' ? 'مشوار' : 'توصيل' }}
                </span>
              </span>
              <span class="text-sm text-ink-soft">
                {{ item.storeName ?? 'مشوار' }} · {{ item.zoneName ?? '—' }} · {{ formatMoney(item.total) }}
              </span>
              <span
                v-if="item.courier"
                class="mt-0.5 flex items-center gap-1 text-sm"
                :class="item.courier.assignmentStatus === 'OFFERED' ? 'text-warning-600' : 'text-success-600'"
              >
                <SgIcon name="bike" :size="15" /> {{ item.courier.name ?? 'مندوب' }}
                ({{
                  item.courier.assignmentStatus === 'PICKED_UP'
                    ? 'استلم'
                    : item.courier.assignmentStatus === 'OFFERED'
                      ? 'معروض عليه'
                      : 'متعيّن'
                }})
              </span>
            </div>
          </div>

          <div class="mt-3 flex gap-2">
            <template v-if="item.courier">
              <SgButton variant="secondary" block size="md" @click="picking = item">إعادة تعيين</SgButton>
            </template>
            <template v-else>
              <SgButton
                block
                size="md"
                :loading="nearestBusyId === item.orderId"
                @click="assignNearest(item)"
              >
                <SgIcon name="bike" :size="18" /> عيّن الأقرب
              </SgButton>
              <SgButton variant="secondary" size="md" @click="picking = item">اختيار يدوي</SgButton>
            </template>
          </div>
        </SgCard>
      </template>

      <SgEmptyState v-else icon="package" title="مفيش طلبات محتاجة مندوب" hint="كل الطلبات متعيّنة — شغل ممتاز." />
    </div>

    <!-- courier picker — ranked by distance to the pickup, nearest first -->
    <SgSheet :open="picking !== null" title="اختار مندوب (الأقرب أولًا)" @update:open="(v) => { if (!v) picking = null }">
      <div class="flex max-h-[60vh] flex-col gap-2 overflow-y-auto">
        <template v-if="loadingSuggestions">
          <SgSkeleton v-for="i in 3" :key="i" variant="card" class="h-16" />
        </template>

        <template v-else>
          <button
            v-for="(courier, i) in suggestions"
            :key="courier.id"
            type="button"
            class="flex items-center justify-between rounded-lg border p-4 text-start disabled:opacity-40"
            :class="i === 0 ? 'border-primary-600 bg-primary-50' : 'border-line'"
            :disabled="busy"
            @click="choose(courier)"
          >
            <span class="flex flex-col gap-0.5">
              <span class="flex items-center gap-2 text-base font-semibold text-ink">
                {{ courier.name ?? 'مندوب' }}
                <span v-if="i === 0" class="rounded-full bg-primary-600 px-2 py-0.5 text-xs font-bold text-white">
                  الأقرب
                </span>
              </span>
              <span class="text-sm text-ink-soft">{{ courier.activeTasks }} مهمة حالية</span>
            </span>
            <span v-if="courier.distanceKm !== null" class="flex flex-col items-end text-sm">
              <span class="flex items-center gap-1 font-bold text-primary-700">
                <SgIcon name="bike" :size="15" /> {{ courier.distanceKm }} كم
              </span>
              <span class="text-ink-soft">~{{ courier.etaMins }} د</span>
            </span>
            <span v-else class="text-sm text-ink-soft">الموقع غير معروف</span>
          </button>
          <p v-if="suggestions.length === 0" class="py-4 text-center text-sm text-ink-soft">
            مفيش مناديب متاحين دلوقتي
          </p>
        </template>
      </div>
    </SgSheet>
  </div>
</template>
