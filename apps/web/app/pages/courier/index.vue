<script setup lang="ts">
import { poundsToPiasters } from '@sprintgo/shared';
import type { CourierOfferView, CourierTaskView } from '@sprintgo/shared';
import type { ApiError } from '~/composables/useApi';
import { useCourier } from '~/features/courier/composables/useCourier';
import { useCourierTracking } from '~/features/courier/composables/useCourierTracking';
import { useAuthStore } from '~/features/auth/stores/auth.store';

definePageMeta({ layout: 'staff', middleware: ['auth', 'role'], role: 'COURIER' });

const courier = useCourier();
const auth = useAuthStore();
const toast = useToast();
const { beep } = useBeep();

const available = ref(false);
const tasks = ref<CourierTaskView[]>([]);
const offer = ref<CourierOfferView | null>(null);
const offerBusy = ref(false);
const pending = ref(true);
const busyId = ref<string | null>(null);
const goodsFor = ref<CourierTaskView | null>(null);
const goodsAmount = ref('');
let lastTaskCount = 0;
const rt = useRealtime();

const tracking = useCourierTracking();

async function load(initial = false) {
  try {
    const next = await courier.tasks();
    if (!initial && next.length > lastTaskCount) beep(); // a new assignment landed
    lastTaskCount = next.length;
    tasks.value = next;
    // stream GPS for orders currently out for delivery
    tracking.setActive(next.filter((t) => t.assignmentStatus === 'PICKED_UP').map((t) => t.orderId));
  } catch {
    // keep last-known tasks
  } finally {
    pending.value = false;
  }
}

let hbTimer: ReturnType<typeof setInterval> | null = null;

function sendHeartbeat() {
  if (!import.meta.client || !navigator.geolocation) return;
  navigator.geolocation.getCurrentPosition(
    (pos) => courier.heartbeat(pos.coords.latitude, pos.coords.longitude),
    () => {
      /* denied/unavailable — nearest-courier just won't have this courier's location */
    },
    { enableHighAccuracy: true, maximumAge: 20_000, timeout: 10_000 },
  );
}

function startHeartbeat() {
  if (hbTimer) return;
  sendHeartbeat();
  hbTimer = setInterval(sendHeartbeat, 30_000); // feeds nearest-courier dispatch
}

function stopHeartbeat() {
  if (hbTimer) {
    clearInterval(hbTimer);
    hbTimer = null;
  }
}

async function toggleAvailability() {
  const target = !available.value;
  try {
    await courier.setAvailability(target);
    available.value = target;
    if (target) startHeartbeat();
    else stopHeartbeat();
    toast.success(target ? 'دلوقتي متاح للطلبات' : 'دلوقتي مشغول');
  } catch (err) {
    toast.error((err as ApiError).message);
  }
}

async function act(task: CourierTaskView, verb: 'pickup' | 'delivered') {
  busyId.value = task.orderId;
  try {
    if (verb === 'pickup') await courier.pickup(task.orderId);
    else await courier.delivered(task.orderId, task.cashToCollect);
    toast.success(verb === 'pickup' ? 'استلمت الطلب' : 'تم التوصيل — شكرًا');
    await load();
  } catch (err) {
    toast.error((err as ApiError).message);
  } finally {
    busyId.value = null;
  }
}

async function acceptOffer() {
  if (!offer.value || offerBusy.value) return;
  offerBusy.value = true;
  const orderId = offer.value.orderId;
  try {
    await courier.acceptOffer(orderId);
    offer.value = null;
    toast.success('قبلت الطلب — يلا بينا');
    await load();
  } catch (err) {
    toast.error((err as ApiError).message);
    offer.value = null; // offer likely expired or was taken
  } finally {
    offerBusy.value = false;
  }
}

async function rejectOffer() {
  if (!offer.value || offerBusy.value) return;
  offerBusy.value = true;
  const orderId = offer.value.orderId;
  offer.value = null; // dismiss immediately
  try {
    await courier.rejectOffer(orderId);
  } catch {
    /* ignore */
  } finally {
    offerBusy.value = false;
  }
}

async function submitGoods() {
  if (!goodsFor.value || !goodsAmount.value) return;
  try {
    await courier.goodsCost(goodsFor.value.orderId, poundsToPiasters(Number(goodsAmount.value)));
    toast.success('اتسجّل المبلغ');
    goodsFor.value = null;
    goodsAmount.value = '';
    await load();
  } catch (err) {
    toast.error((err as ApiError).message);
  }
}

const { pause, resume } = useIntervalFn(() => load(), 15_000, { immediate: false });
let offAssigned: (() => void) | undefined;
let offOffer: (() => void) | undefined;
let offRevoked: (() => void) | undefined;
onMounted(async () => {
  await load(true);
  offer.value = await courier.currentOffer(); // restore a pending offer after a reload
  resume();
  // a new assignment lands instantly with a sound (polling is the fallback)
  offAssigned = rt.on('order:assigned', () => {
    beep();
    load();
  });
  // auto-offer: an order is offered to this courier
  offOffer = rt.on('order:offer', (p) => {
    offer.value = p as CourierOfferView;
    beep(3);
  });
  offRevoked = rt.on('order:offer_revoked', (p) => {
    if (offer.value && (p as { orderId: string }).orderId === offer.value.orderId) offer.value = null;
  });
});
onUnmounted(() => {
  pause();
  offAssigned?.();
  offOffer?.();
  offRevoked?.();
  tracking.stop();
  stopHeartbeat();
});
</script>

<template>
  <div class="flex flex-1 flex-col">
    <SgTopBar title="مهامي">
      <template #actions>
        <SgNotificationBell />
        <NuxtLink to="/courier/summary" class="flex size-10 items-center justify-center rounded-full text-ink-soft hover:bg-surface-alt" aria-label="ملخص اليوم">
          <SgIcon name="banknote" :size="22" />
        </NuxtLink>
      </template>
    </SgTopBar>

    <!-- availability toggle -->
    <div class="p-4">
      <button
        type="button"
        class="flex w-full items-center justify-between rounded-xl border-2 p-4"
        :class="available ? 'border-success-600 bg-success-600/5' : 'border-line bg-surface'"
        @click="toggleAvailability"
      >
        <span class="flex items-center gap-2 text-lg font-bold" :class="available ? 'text-success-600' : 'text-ink-soft'">
          <span class="size-3 rounded-full" :class="available ? 'bg-success-600' : 'bg-ink-soft'" />
          {{ available ? 'متاح للطلبات' : 'مشغول' }}
        </span>
        <span class="text-sm text-ink-soft">اضغط للتبديل</span>
      </button>
      <p class="mt-1 text-center text-sm text-ink-soft">أهلًا {{ auth.user?.name ?? 'يا كابتن' }}</p>
    </div>

    <!-- auto-offer: accept/reject the nearest-courier offer -->
    <div v-if="offer" class="p-4 pt-0">
      <CourierOfferCard :offer="offer" :busy="offerBusy" @accept="acceptOffer" @reject="rejectOffer" />
    </div>

    <div class="flex flex-col gap-4 p-4 pt-0 pb-10">
      <template v-if="pending">
        <SgSkeleton v-for="i in 2" :key="i" variant="card" class="h-64" />
      </template>

      <template v-else-if="tasks.length">
        <CourierTaskCard
          v-for="task in tasks"
          :key="task.orderId"
          :task="task"
          :busy="busyId === task.orderId"
          @pickup="act(task, 'pickup')"
          @delivered="act(task, 'delivered')"
          @goods-cost="goodsFor = task"
        />
      </template>

      <SgEmptyState v-else icon="bike" title="مفيش مهام دلوقتي" hint="خليك متاح وهنبعتلك أول ما ييجي طلب." />
    </div>

    <SgDialog :open="goodsFor !== null" title="المبلغ اللي اتصرف" @update:open="(v) => { if (!v) goodsFor = null }">
      <SgInput v-model="goodsAmount" label="بالجنيه" type="tel" inputmode="numeric" placeholder="مثلاً: 120" />
      <template #actions>
        <SgButton variant="secondary" block @click="goodsFor = null">إلغاء</SgButton>
        <SgButton block :disabled="!goodsAmount" @click="submitGoods">حفظ</SgButton>
      </template>
    </SgDialog>
  </div>
</template>
