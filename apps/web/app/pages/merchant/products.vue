<script setup lang="ts">
import type { UpsertProductDto } from '@sprintgo/shared';
import type { ApiError } from '~/composables/useApi';
import { useMerchantManage } from '~/features/merchant/composables/useMerchantManage';
import type { MerchantProduct } from '~/features/merchant/composables/useMerchantManage';
import { useMerchantPermissions } from '~/features/merchant/composables/useMerchantPermissions';

definePageMeta({ layout: 'staff', middleware: ['auth', 'role'], role: 'MERCHANT' });

const manage = useMerchantManage();
const perms = useMerchantPermissions();
const toast = useToast();

const canProducts = computed(() => perms.can('merchant.products'));

const products = ref<MerchantProduct[]>([]);
const pending = ref(true);
const togglingId = ref<string | null>(null);
const addOpen = ref(false);
const form = reactive({ name: '', price: '' });
const saving = ref(false);

async function load() {
  try {
    products.value = await manage.listProducts();
  } finally {
    pending.value = false;
  }
}

async function toggle(product: MerchantProduct) {
  togglingId.value = product.id;
  const target = !product.isAvailable;
  try {
    await manage.setProductAvailability(product.id, target);
    product.isAvailable = target;
  } catch (err) {
    toast.error((err as ApiError).message);
  } finally {
    togglingId.value = null;
  }
}

async function addProduct() {
  if (!form.name.trim() || !form.price || saving.value) return;
  saving.value = true;
  const dto: UpsertProductDto = { name: form.name.trim(), price: Math.round(Number(form.price) * 100) };
  try {
    await manage.createProduct(dto);
    toast.success('اتضاف الصنف');
    addOpen.value = false;
    form.name = '';
    form.price = '';
    await load();
  } catch (err) {
    toast.error((err as ApiError).message);
  } finally {
    saving.value = false;
  }
}

onMounted(async () => {
  await perms.ensure();
  // skip the products fetch entirely when the owner can't manage the menu (it would 403)
  if (perms.can('merchant.products')) await load();
  else pending.value = false;
});
</script>

<template>
  <div class="flex flex-1 flex-col">
    <SgTopBar title="المنيو" back>
      <template #actions>
        <SgButton v-if="canProducts" size="md" @click="addOpen = true">+ صنف</SgButton>
      </template>
    </SgTopBar>

    <div class="flex flex-col gap-3 p-4 pb-10">
      <SgEmptyState
        v-if="!canProducts"
        icon="shield"
        title="الصلاحية دي مش متاحة لحسابك"
        hint="كلّم الإدارة عشان تفعّل إدارة المنيو لحسابك."
      />

      <template v-else-if="pending">
        <SgSkeleton v-for="i in 4" :key="i" variant="card" class="h-16" />
      </template>

      <template v-else-if="products.length">
        <SgCard v-for="product in products" :key="product.id">
          <div class="flex items-center justify-between gap-3">
            <div class="flex min-w-0 flex-1 flex-col">
              <span class="truncate text-base font-bold text-ink">{{ product.name }}</span>
              <SgPrice :amount="product.price" size="base" class="text-primary-700" />
            </div>
            <!-- one-tap sold-out toggle (the elderly-first highlight) -->
            <button
              type="button"
              class="flex items-center gap-2 rounded-full border px-3 py-2 text-sm font-semibold disabled:opacity-50"
              :class="product.isAvailable ? 'border-success-600 text-success-600' : 'border-danger-600 text-danger-600'"
              :disabled="togglingId === product.id"
              @click="toggle(product)"
            >
              <span class="size-2.5 rounded-full" :class="product.isAvailable ? 'bg-success-600' : 'bg-danger-600'" />
              {{ product.isAvailable ? 'متاح' : 'خلص' }}
            </button>
          </div>
        </SgCard>
      </template>

      <SgEmptyState v-else icon="list" title="المنيو فاضي" hint="ضيف أول صنف عشان يبدأ العملاء يطلبوا.">
        <SgButton @click="addOpen = true">ضيف صنف</SgButton>
      </SgEmptyState>
    </div>

    <SgSheet v-model:open="addOpen" title="صنف جديد">
      <div class="flex flex-col gap-4">
        <SgInput v-model="form.name" label="اسم الصنف" placeholder="مثلاً: برجر دبل" />
        <SgInput v-model="form.price" label="السعر بالجنيه" type="tel" inputmode="numeric" placeholder="مثلاً: 95" />
        <SgButton size="xl" block :loading="saving" :disabled="!form.name.trim() || !form.price" @click="addProduct">
          حفظ الصنف
        </SgButton>
      </div>
    </SgSheet>
  </div>
</template>
