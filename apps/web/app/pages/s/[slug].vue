<script setup lang="ts">
import type { ProductView } from '@sprintgo/shared';
import { useCatalog } from '~/features/catalog/composables/useCatalog';
import { useLocationStore } from '~/features/catalog/stores/location.store';
import { useCartStore } from '~/features/cart/stores/cart.store';
import type { CartOption } from '~/features/cart/stores/cart.store';

const route = useRoute();
const slug = route.params.slug as string;
const catalog = useCatalog();
const location = useLocationStore();
const cart = useCartStore();
const toast = useToast();

const { data: store } = await useAsyncData(`store-${slug}`, () =>
  catalog.getStore(slug, location.selectedZoneId ?? undefined),
);

if (!store.value) throw createError({ statusCode: 404, statusMessage: 'المحل مش موجود' });

const optionsSheet = ref(false);
const activeProduct = ref<ProductView | null>(null);
const resetSheet = ref(false);
const pendingProduct = ref<ProductView | null>(null);

function openProduct(product: ProductView) {
  if (!product.isAvailable || !store.value) return;
  // single-store cart guard (ADR): switching stores clears the old cart
  if (!cart.belongsToCurrentStore(store.value.id) && cart.itemsCount > 0) {
    pendingProduct.value = product;
    resetSheet.value = true;
    return;
  }
  launch(product);
}

function launch(product: ProductView) {
  if (product.optionGroups.length > 0) {
    activeProduct.value = product;
    optionsSheet.value = true;
  } else {
    addToCart(product, [], 1);
  }
}

function confirmReset() {
  cart.clear();
  resetSheet.value = false;
  if (pendingProduct.value) launch(pendingProduct.value);
}

function addToCart(product: ProductView, options: CartOption[], quantity: number, notes?: string) {
  if (!store.value) return;
  cart.addProduct(
    { id: store.value.id, slug: store.value.slug, name: store.value.name },
    product,
    options,
    quantity,
    notes,
  );
  toast.success(`تمت إضافة ${product.name}`);
}
</script>

<template>
  <div v-if="store" class="flex min-h-dvh flex-col bg-surface-alt pb-24">
    <SgTopBar :title="store.name" back />

    <!-- store header -->
    <section class="bg-surface px-5 py-4">
      <div class="flex items-center gap-3">
        <div class="flex size-16 items-center justify-center overflow-hidden rounded-lg bg-surface-alt text-ink-soft">
          <img v-if="store.logoUrl" :src="store.logoUrl" :alt="store.name" class="size-full object-cover" />
          <SgIcon v-else name="bag" :size="28" />
        </div>
        <div class="flex flex-col gap-1">
          <h1 class="text-xl font-bold text-ink">{{ store.name }}</h1>
          <div class="flex flex-wrap items-center gap-x-3 text-sm text-ink-soft">
            <span v-if="store.ratingCount > 0" class="flex items-center gap-1">
              <SgIcon name="star" :size="15" fill class="text-warning-600" />
              {{ store.ratingAvg.toFixed(1) }} ({{ store.ratingCount }})
            </span>
            <span v-if="store.delivery" class="flex items-center gap-1">
              <SgIcon name="bike" :size="15" /><SgPrice :amount="store.delivery.fee" size="sm" />
            </span>
            <span class="flex items-center gap-1"><SgIcon name="clock" :size="15" />{{ store.prepTimeMins }} د</span>
          </div>
          <p v-if="store.minOrderTotal > 0" class="text-sm text-ink-soft">
            أقل طلب <SgPrice :amount="store.minOrderTotal" size="sm" />
          </p>
        </div>
      </div>
      <p v-if="!store.isOpenNow" class="mt-3 rounded-lg bg-danger-600/10 px-3 py-2 text-sm font-medium text-danger-600">
        المحل مقفول دلوقتي — تقدر تتفرّج على المنيو
      </p>
    </section>

    <!-- menu -->
    <div class="flex flex-col gap-6 p-5">
      <section v-for="cat in store.categories" :key="cat.id" class="flex flex-col gap-3">
        <h2 class="text-lg font-bold text-ink">{{ cat.name }}</h2>
        <SgProductCard
          v-for="product in cat.products"
          :key="product.id"
          :product="product"
          :quantity-in-cart="cart.storeId === store.id ? cart.quantityOfProduct(product.id) : 0"
          @add="openProduct(product)"
        />
      </section>

      <SgEmptyState v-if="store.categories.length === 0" icon="list" title="المنيو لسه فاضي" />
    </div>

    <!-- cart bar -->
    <SgCartBar
      v-if="cart.storeId === store.id"
      :items-count="cart.itemsCount"
      :total="cart.subtotal"
      @click="navigateTo('/checkout')"
    />

    <ProductOptionsSheet v-model:open="optionsSheet" :product="activeProduct" @add="(o, q, n) => activeProduct && addToCart(activeProduct, o, q, n)" />

    <!-- switch-store confirm -->
    <SgDialog v-model:open="resetSheet" title="تبدأ طلب جديد؟">
      <p class="text-base text-ink-soft">
        عندك أصناف في السلة من محل تاني. لو كمّلت هنا هنفضّي السلة القديمة.
      </p>
      <template #actions>
        <SgButton variant="secondary" block @click="resetSheet = false">إلغاء</SgButton>
        <SgButton variant="danger" block @click="confirmReset">ابدأ من جديد</SgButton>
      </template>
    </SgDialog>
  </div>
</template>
