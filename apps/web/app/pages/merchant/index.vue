<script setup lang="ts">
import type { MerchantOrderView } from '@sprintgo/shared';
import type { ApiError } from '~/composables/useApi';
import { useMerchant } from '~/features/merchant/composables/useMerchant';
import { useMerchantPermissions } from '~/features/merchant/composables/useMerchantPermissions';

definePageMeta({ layout: 'staff', middleware: ['auth', 'role'], role: 'MERCHANT' });

const merchant = useMerchant();
const perms = useMerchantPermissions();
const toast = useToast();
const { beep } = useBeep();

const canOrders = computed(() => perms.can('merchant.orders'));
const canProducts = computed(() => perms.can('merchant.products'));

const orders = ref<MerchantOrderView[]>([]);
const pending = ref(true);
const busyId = ref<string | null>(null);
const rejecting = ref<MerchantOrderView | null>(null);
const rejectReason = ref('');
let lastPlacedCount = 0;

const groups = computed(() => ({
  PLACED: orders.value.filter((o) => o.status === 'PLACED'),
  PREPARING: orders.value.filter((o) => o.status === 'PREPARING'),
  READY: orders.value.filter((o) => o.status === 'READY'),
}));

async function load(initial = false) {
  try {
    const next = await merchant.board();
    const placed = next.filter((o) => o.status === 'PLACED').length;
    if (!initial && placed > lastPlacedCount) beep(); // a new order arrived
    lastPlacedCount = placed;
    orders.value = next;
  } catch {
    // keep last-known board on a transient failure
  } finally {
    pending.value = false;
  }
}

async function act(order: MerchantOrderView, verb: 'accept' | 'ready' | 'handover') {
  busyId.value = order.id;
  try {
    await merchant.action(order.id, verb);
    await load();
  } catch (err) {
    toast.error((err as ApiError).message);
  } finally {
    busyId.value = null;
  }
}

async function confirmReject() {
  if (!rejecting.value || !rejectReason.value.trim()) return;
  busyId.value = rejecting.value.id;
  try {
    await merchant.reject(rejecting.value.id, rejectReason.value.trim());
    rejecting.value = null;
    rejectReason.value = '';
    await load();
  } catch (err) {
    toast.error((err as ApiError).message);
  } finally {
    busyId.value = null;
  }
}

// realtime hint: a new order pings instantly; polling stays as the fallback
const rt = useRealtime();
const { pause, resume } = useIntervalFn(() => load(), 15_000, { immediate: false });
let offNew: (() => void) | undefined;
let offStatus: (() => void) | undefined;
onMounted(async () => {
  await perms.ensure();
  await load(true);
  resume();
  offNew = rt.on('order:new', () => {
    beep();
    load();
  });
  offStatus = rt.on('order:status', () => load());
});
onUnmounted(() => {
  pause();
  offNew?.();
  offStatus?.();
});

const sections = [
  { key: 'PLACED', title: 'جديد', tone: 'text-info-600' },
  { key: 'PREPARING', title: 'جاري التجهيز', tone: 'text-warning-600' },
  { key: 'READY', title: 'جاهز', tone: 'text-success-600' },
] as const;
</script>

<template>
  <div class="flex flex-1 flex-col">
    <SgTopBar title="طلبات المحل">
      <template #actions>
        <SgNotificationBell />
        <NuxtLink v-if="canProducts" to="/merchant/products" class="flex size-10 items-center justify-center rounded-full text-ink-soft hover:bg-surface-alt" aria-label="المنيو">
          <SgIcon name="list" :size="22" />
        </NuxtLink>
        <NuxtLink to="/merchant/settings" class="flex size-10 items-center justify-center rounded-full text-ink-soft hover:bg-surface-alt" aria-label="الإعدادات">
          <SgIcon name="user" :size="22" />
        </NuxtLink>
      </template>
    </SgTopBar>

    <div class="flex flex-col gap-6 p-4 pb-10">
      <template v-if="pending">
        <SgSkeleton v-for="i in 3" :key="i" variant="card" class="h-40" />
      </template>

      <template v-else>
        <p
          v-if="!canOrders"
          class="rounded-xl border border-warning-600/30 bg-warning-600/5 p-4 text-center text-sm font-semibold text-warning-600"
        >
          مالكش صلاحية لإدارة الطلبات — بتظهرلك للمتابعة بس من غير أزرار.
        </p>

        <section v-for="sec in sections" :key="sec.key" class="flex flex-col gap-3">
          <h2 class="flex items-center gap-2 text-lg font-bold" :class="sec.tone">
            {{ sec.title }}
            <span class="rounded-full bg-surface px-2 py-0.5 text-sm text-ink-soft">
              {{ groups[sec.key].length }}
            </span>
          </h2>

          <MerchantOrderCard
            v-for="order in groups[sec.key]"
            :key="order.id"
            :order="order"
            :busy="busyId === order.id"
            :actionable="canOrders"
            @accept="act(order, 'accept')"
            @ready="act(order, 'ready')"
            @handover="act(order, 'handover')"
            @reject="rejecting = order"
          />

          <p v-if="groups[sec.key].length === 0" class="rounded-lg border border-dashed border-line py-6 text-center text-sm text-ink-soft">
            مفيش طلبات هنا
          </p>
        </section>
      </template>
    </div>

    <SgDialog :open="rejecting !== null" title="رفض الطلب" @update:open="(v) => { if (!v) rejecting = null }">
      <SgInput v-model="rejectReason" label="سبب الرفض" placeholder="مثلاً: صنف خلص" />
      <template #actions>
        <SgButton variant="secondary" block @click="rejecting = null">رجوع</SgButton>
        <SgButton variant="danger" block :disabled="!rejectReason.trim()" @click="confirmReject">أكيد ارفض</SgButton>
      </template>
    </SgDialog>
  </div>
</template>
