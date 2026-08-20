<script setup lang="ts">
import type { AddressView, PlaceOrderDto } from '@sprintgo/shared';
import type { ApiError } from '~/composables/useApi';
import { useCartStore, lineUnitPrice } from '~/features/cart/stores/cart.store';
import { useAddresses } from '~/features/addresses/composables/useAddresses';
import { useCatalog } from '~/features/catalog/composables/useCatalog';
import { useOrders } from '~/features/orders/composables/useOrders';

definePageMeta({ layout: 'bare', middleware: 'auth' });

const cart = useCartStore();
const addresses = useAddresses();
const catalog = useCatalog();
const orders = useOrders();
const toast = useToast();

// empty cart → nothing to check out
if (import.meta.client && cart.isEmpty) navigateTo('/');

const addressList = ref<AddressView[]>([]);
const selectedAddressId = ref<string | null>(null);
const deliveryFee = ref<number | null>(null);
const deliverable = ref(true);
const loadingAddresses = ref(true);
const placing = ref(false);
const priceNotice = ref('');

// one idempotency key per checkout attempt — reused across retries (double-tap safe)
const idempotencyKey = ref(crypto.randomUUID());

const selectedAddress = computed(
  () => addressList.value.find((a) => a.id === selectedAddressId.value) ?? null,
);
const total = computed(() => cart.subtotal + (deliveryFee.value ?? 0));

async function loadAddresses() {
  loadingAddresses.value = true;
  try {
    addressList.value = await addresses.list();
    selectedAddressId.value = addressList.value.find((a) => a.isDefault)?.id ?? addressList.value[0]?.id ?? null;
  } finally {
    loadingAddresses.value = false;
  }
}

// delivery fee depends on the selected address's zone — re-price from the store
async function refreshDeliveryFee() {
  deliveryFee.value = null;
  deliverable.value = true;
  if (!selectedAddress.value || !cart.storeSlug) return;
  const store = await catalog.getStore(cart.storeSlug, selectedAddress.value.zoneId);
  if (store.delivery) {
    deliveryFee.value = store.delivery.fee;
  } else {
    deliverable.value = false; // store doesn't serve this address's zone
  }
}

watch(selectedAddressId, refreshDeliveryFee);
onMounted(async () => {
  await loadAddresses();
  await refreshDeliveryFee();
});

async function placeOrder() {
  if (!selectedAddress.value || !cart.storeId || placing.value) return;
  placing.value = true;
  priceNotice.value = '';

  const dto: PlaceOrderDto = {
    storeId: cart.storeId,
    fulfillmentType: 'DELIVERY',
    addressId: selectedAddress.value.id,
    paymentMethod: 'COD',
    items: cart.lines.map((l) => ({
      productId: l.productId,
      quantity: l.quantity,
      optionIds: l.options.map((o) => o.optionId),
      notes: l.notes,
    })),
    clientTotal: total.value,
  };

  try {
    const order = await orders.place(dto, idempotencyKey.value);
    cart.clear();
    toast.success('استلمنا طلبك');
    await navigateTo(`/orders/${order.id}`);
  } catch (err) {
    const apiError = err as ApiError;
    if (apiError.code === 'PRICE_CHANGED') {
      // fresh totals came back — show them and let the user confirm again
      const details = apiError.details as { total?: number; deliveryFee?: number } | undefined;
      if (details?.deliveryFee != null) deliveryFee.value = details.deliveryFee;
      priceNotice.value = 'اتحدّثت الأسعار — راجع الإجمالي واضغط تأكيد تاني.';
      idempotencyKey.value = crypto.randomUUID(); // new attempt
    } else {
      toast.error(apiError.message);
    }
  } finally {
    placing.value = false;
  }
}
</script>

<template>
  <div class="flex min-h-dvh flex-col">
    <SgTopBar title="إتمام الطلب" back />

    <div class="flex flex-1 flex-col gap-5 p-5 pb-40">
      <!-- delivery address -->
      <section class="flex flex-col gap-2">
        <h2 class="text-lg font-bold text-ink">نوصّلك فين؟</h2>

        <template v-if="loadingAddresses">
          <SgSkeleton variant="card" class="h-20" />
        </template>

        <template v-else-if="addressList.length">
          <SgAddressCard
            v-for="addr in addressList"
            :key="addr.id"
            :address="addr"
            selectable
            :selected="selectedAddressId === addr.id"
            @select="selectedAddressId = addr.id"
          />
          <NuxtLink to="/addresses?add=1" class="mt-1 flex items-center gap-1 text-base font-semibold text-primary-700">
            <SgIcon name="plus" :size="18" /> ضيف عنوان جديد
          </NuxtLink>
        </template>

        <SgEmptyState v-else icon="map-pin" title="مفيش عنوان محفوظ" hint="ضيف عنوان عشان نوصّلك عليه.">
          <SgButton @click="navigateTo('/addresses?add=1')">ضيف عنوان</SgButton>
        </SgEmptyState>
      </section>

      <!-- payment -->
      <section class="flex flex-col gap-2">
        <h2 class="text-lg font-bold text-ink">طريقة الدفع</h2>
        <div class="flex items-center gap-3 rounded-lg border border-primary-600 bg-primary-50 p-4">
          <SgIcon name="banknote" :size="26" class="text-primary-700" />
          <div class="flex flex-col">
            <span class="text-base font-bold text-ink">كاش عند الاستلام</span>
            <span class="text-sm text-ink-soft">تدفع للمندوب لما يوصلك</span>
          </div>
        </div>
      </section>

      <!-- summary -->
      <section class="flex flex-col gap-3">
        <h2 class="text-lg font-bold text-ink">طلبك من {{ cart.storeName }}</h2>
        <SgCard>
          <ul class="flex flex-col gap-3">
            <li v-for="line in cart.lines" :key="line.lineId" class="flex items-start justify-between gap-2">
              <div class="flex flex-1 flex-col">
                <span class="text-base font-semibold text-ink">{{ line.quantity }}× {{ line.name }}</span>
                <span v-if="line.options.length" class="text-sm text-ink-soft">
                  {{ line.options.map((o) => o.optionName).join('، ') }}
                </span>
                <span v-if="line.notes" class="flex items-center gap-1 text-sm text-ink-soft">
                  <SgIcon name="note" :size="14" /> {{ line.notes }}
                </span>
              </div>
              <SgPrice :amount="lineUnitPrice(line) * line.quantity" size="base" />
            </li>
          </ul>
        </SgCard>
      </section>

      <p v-if="!deliverable" class="rounded-lg bg-danger-600/10 px-3 py-2 text-sm font-medium text-danger-600">
        للأسف المحل مبيوصلش لمنطقة العنوان ده — اختار عنوان تاني.
      </p>
      <p v-if="priceNotice" class="rounded-lg bg-warning-600/10 px-3 py-2 text-sm font-medium text-warning-600">
        {{ priceNotice }}
      </p>
    </div>

    <!-- sticky confirm -->
    <div class="shadow-sheet fixed inset-x-0 bottom-0 z-30 mx-auto max-w-[480px] rounded-t-2xl bg-surface p-5">
      <div class="mb-1 flex items-center justify-between text-sm text-ink-soft">
        <span>المنتجات</span><SgPrice :amount="cart.subtotal" size="sm" />
      </div>
      <div class="mb-3 flex items-center justify-between text-sm text-ink-soft">
        <span>التوصيل</span>
        <span v-if="deliveryFee !== null"><SgPrice :amount="deliveryFee" size="sm" /></span>
        <span v-else>—</span>
      </div>
      <div class="mb-4 flex items-center justify-between">
        <span class="text-lg font-bold text-ink">الإجمالي</span>
        <SgPrice :amount="total" size="xl" class="text-primary-700" />
      </div>
      <SgButton
        size="xl"
        block
        :loading="placing"
        :disabled="!selectedAddress || !deliverable || deliveryFee === null"
        @click="placeOrder"
      >
        اطلب دلوقتي
      </SgButton>
    </div>
  </div>
</template>
