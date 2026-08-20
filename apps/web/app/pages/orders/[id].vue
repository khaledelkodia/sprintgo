<script setup lang="ts">
import { displayPhone } from '@sprintgo/shared';
import type { OrderView } from '@sprintgo/shared';
import { useOrders } from '~/features/orders/composables/useOrders';

definePageMeta({ layout: 'bare', middleware: 'auth' });

const route = useRoute();
const orders = useOrders();
const toast = useToast();
const id = route.params.id as string;

const order = ref<OrderView | null>(null);
const pending = ref(true);
const cancelOpen = ref(false);
const cancelling = ref(false);
const courierLoc = ref<{ lat: number; lng: number } | null>(null);

const isActive = computed(
  () => order.value && !['DELIVERED', 'COMPLETED', 'CANCELLED'].includes(order.value.status),
);

const etaTime = computed(() =>
  order.value?.estimatedReadyAt
    ? new Date(order.value.estimatedReadyAt).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })
    : '',
);

async function refresh() {
  try {
    order.value = await orders.get(id);
  } catch {
    // keep last-known state on a transient failure
  } finally {
    pending.value = false;
  }
}

// realtime: join this order's room and refetch on status changes.
// polling stays as the fallback whenever the socket is down (docs/architecture/06 §4)
const rt = useRealtime();
const { pause, resume } = useIntervalFn(refresh, 20_000, { immediate: false });
watch(isActive, (active) => (active ? resume() : pause()));
let offStatus: (() => void) | undefined;
let offCancel: (() => void) | undefined;
let offAssigned: (() => void) | undefined;
let offLocation: (() => void) | undefined;

async function confirmCancel() {
  cancelling.value = true;
  try {
    order.value = await orders.cancel(id);
    toast.success('اتلغى الطلب');
    cancelOpen.value = false;
  } catch {
    toast.error('مش قادرين نلغي دلوقتي');
  } finally {
    cancelling.value = false;
  }
}

onMounted(async () => {
  await refresh();
  rt.joinOrder(id);
  offStatus = rt.on('order:status', () => refresh());
  offCancel = rt.on('order:cancelled', () => refresh());
  offAssigned = rt.on('order:assigned', () => refresh());
  offLocation = rt.on('courier:location', (p) => {
    const loc = p as { orderId: string; lat: number; lng: number };
    if (loc.orderId === id) courierLoc.value = { lat: loc.lat, lng: loc.lng };
  });
});
onUnmounted(() => {
  rt.leaveOrder(id);
  offStatus?.();
  offCancel?.();
  offAssigned?.();
  offLocation?.();
});
</script>

<template>
  <div class="flex min-h-dvh flex-col">
    <SgTopBar title="تتبّع الطلب" back />

    <template v-if="pending">
      <div class="flex flex-col gap-4 p-5">
        <SgSkeleton variant="title" />
        <SgSkeleton variant="card" class="h-40" />
      </div>
    </template>

    <template v-else-if="order">
      <div class="flex flex-1 flex-col gap-5 p-5 pb-8">
        <!-- headline status -->
        <div class="flex flex-col items-center gap-2 rounded-xl bg-primary-50 py-6 text-center">
          <span class="text-lg font-bold text-primary-700">{{ order.statusLabel }}</span>
          <span class="text-sm text-ink-soft">{{ order.code }}</span>
          <span v-if="order.estimatedReadyAt && isActive" class="text-sm text-ink-soft">
            متوقع يخلص حوالي {{ etaTime }}
          </span>
        </div>

        <!-- live courier map while out for delivery -->
        <SgCard v-if="order.status === 'OUT_FOR_DELIVERY'">
          <h2 class="mb-3 flex items-center gap-2 text-base font-bold text-ink">
            <SgIcon name="bike" :size="18" class="text-primary-700" /> مندوبك في الطريق إليك
          </h2>
          <SgCourierMap v-if="courierLoc" :lat="courierLoc.lat" :lng="courierLoc.lng" />
          <div v-else class="flex h-32 items-center justify-center rounded-xl bg-surface-alt text-sm text-ink-soft">
            بنحدّد موقع المندوب…
          </div>
        </SgCard>

        <!-- timeline -->
        <SgCard>
          <SgOrderTimeline :entries="order.timeline" />
        </SgCard>

        <!-- store + call -->
        <SgCard v-if="order.store">
          <div class="flex items-center justify-between">
            <div class="flex flex-col">
              <span class="text-base font-bold text-ink">{{ order.store.name }}</span>
              <span dir="ltr" class="text-sm text-ink-soft">{{ displayPhone(order.store.contactPhone) }}</span>
            </div>
            <a
              :href="`tel:${order.store.contactPhone}`"
              class="flex size-12 items-center justify-center rounded-full bg-primary-600 text-white"
              aria-label="اتصل بالمحل"
            >
              <SgIcon name="phone" :size="22" />
            </a>
          </div>
        </SgCard>

        <!-- items -->
        <SgCard>
          <h2 class="mb-3 text-base font-bold text-ink">تفاصيل الطلب</h2>
          <ul class="flex flex-col gap-2">
            <li v-for="item in order.items" :key="item.id" class="flex justify-between gap-2 text-base">
              <span class="text-ink">{{ item.quantity }}× {{ item.name }}</span>
              <SgPrice :amount="item.lineTotal" size="base" />
            </li>
          </ul>
          <hr class="my-3 border-line" />
          <div class="flex flex-col gap-1 text-sm text-ink-soft">
            <div class="flex justify-between"><span>المنتجات</span><SgPrice :amount="order.subtotal" size="sm" /></div>
            <div class="flex justify-between"><span>التوصيل</span><SgPrice :amount="order.deliveryFee" size="sm" /></div>
            <div class="flex justify-between text-lg font-bold text-ink">
              <span>الإجمالي</span><SgPrice :amount="order.total" size="lg" />
            </div>
          </div>
        </SgCard>

        <!-- address -->
        <SgCard v-if="order.addressSnapshot">
          <h2 class="mb-1 text-base font-bold text-ink">عنوان التوصيل</h2>
          <p class="text-base text-ink">{{ order.addressSnapshot.zoneName }} · {{ order.addressSnapshot.street }}</p>
          <p v-if="order.addressSnapshot.landmark" class="text-sm text-ink-soft">
            علامة مميزة: {{ order.addressSnapshot.landmark }}
          </p>
        </SgCard>

        <SgButton v-if="order.canCancel" variant="danger" block @click="cancelOpen = true">
          إلغاء الطلب
        </SgButton>
        <SgButton
          v-else-if="['DELIVERED', 'COMPLETED'].includes(order.status) && order.store"
          block
          @click="navigateTo(`/s/${order.store.slug}`)"
        >
          <SgIcon name="refresh" :size="20" /> اطلب تاني
        </SgButton>
      </div>

      <SgDialog v-model:open="cancelOpen" title="تلغي الطلب؟">
        <p class="text-base text-ink-soft">لو المحل بدأ التجهيز مش هينفع الإلغاء.</p>
        <template #actions>
          <SgButton variant="secondary" block @click="cancelOpen = false">رجوع</SgButton>
          <SgButton variant="danger" block :loading="cancelling" @click="confirmCancel">أكيد ألغي</SgButton>
        </template>
      </SgDialog>
    </template>

    <SgEmptyState v-else icon="help" title="الطلب مش موجود">
      <SgButton @click="navigateTo('/orders')">كل طلباتي</SgButton>
    </SgEmptyState>
  </div>
</template>
