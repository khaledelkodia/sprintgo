<script setup lang="ts">
import { displayPhone, formatMoney, MERCHANT_PERMISSIONS } from '@sprintgo/shared';
import type { AdminProduct, AdminStoreDetail } from '~/features/admin/composables/useAdmin';
import type { ApiError } from '~/composables/useApi';
import { useAdmin } from '~/features/admin/composables/useAdmin';

definePageMeta({ layout: 'admin-dash', middleware: ['auth', 'role'], role: ['ADMIN', 'SUPER_ADMIN'] });

const route = useRoute();
const id = route.params.id as string;
const admin = useAdmin();
const toast = useToast();

const store = ref<AdminStoreDetail | null>(null);
const products = ref<AdminProduct[]>([]);
const pending = ref(true);
const addOpen = ref(false);
const form = reactive({ name: '', price: '' });
const saving = ref(false);
const busyId = ref<string | null>(null);
const removing = ref<AdminProduct | null>(null);

async function load() {
  try {
    [store.value, products.value] = await Promise.all([admin.getStore(id), admin.listProducts(id)]);
  } finally {
    pending.value = false;
  }
}
onMounted(load);

const atLimit = computed(
  () => store.value?.productLimit != null && products.value.length >= store.value.productLimit,
);

const typeLabel: Record<string, string> = { CATALOG: 'محل بمنتجات', PICKUP_POINT: 'نقطة استلام' };
const isCatalog = computed(() => store.value?.listingType === 'CATALOG');
// المخزّن الفاضي معناه "كل الصلاحيات" (محلات اتعملت قبل ما الصلاحيات توجد).
const grantedPerms = computed(() => {
  const keys = store.value?.managerPermissions ?? [];
  const src = keys.length ? MERCHANT_PERMISSIONS.filter((p) => keys.includes(p.key)) : MERCHANT_PERMISSIONS;
  return src.map((p) => p.label);
});

async function toggleStatus() {
  if (!store.value) return;
  const action = store.value.status === 'ACTIVE' ? 'suspend' : 'activate';
  try {
    await admin.setStoreStatus(id, action);
    store.value.status = action === 'suspend' ? 'SUSPENDED' : 'ACTIVE';
    toast.success(action === 'suspend' ? 'اتوقف المحل' : 'اتفعّل المحل');
  } catch (err) {
    toast.error((err as ApiError).message);
  }
}

async function addProduct() {
  if (!form.name.trim() || !form.price || saving.value) return;
  saving.value = true;
  try {
    await admin.createProduct(id, { name: form.name.trim(), price: Math.round(Number(form.price) * 100) });
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

async function toggleAvail(p: AdminProduct) {
  busyId.value = p.id;
  try {
    await admin.setProductAvailability(id, p.id, !p.isAvailable);
    p.isAvailable = !p.isAvailable;
  } catch (err) {
    toast.error((err as ApiError).message);
  } finally {
    busyId.value = null;
  }
}

async function confirmRemove() {
  if (!removing.value) return;
  try {
    await admin.deleteProduct(id, removing.value.id);
    removing.value = null;
    await load();
  } catch (err) {
    toast.error((err as ApiError).message);
  }
}
</script>

<template>
  <div>
    <AdminPageHeader :title="store?.name ?? 'المحل'" :subtitle="store?.serviceType.nameAr" back="/admin/stores">
      <template #actions>
        <SgButton v-if="store" :variant="store.status === 'ACTIVE' ? 'secondary' : 'primary'" size="md" @click="toggleStatus">
          {{ store.status === 'ACTIVE' ? 'إيقاف المحل' : 'تفعيل المحل' }}
        </SgButton>
      </template>
    </AdminPageHeader>

    <div>
      <template v-if="pending">
        <SgSkeleton variant="card" class="mb-4 h-32" />
        <SgSkeleton variant="card" class="h-64" />
      </template>

      <template v-else-if="store">
        <!-- info -->
        <section class="shadow-card mb-6 grid gap-x-8 gap-y-3 rounded-xl border border-line bg-surface p-5 sm:grid-cols-2">
          <div class="flex justify-between border-b border-line pb-2">
            <span class="text-ink-soft">نوع المحل</span><span class="font-semibold text-ink">{{ typeLabel[store.listingType] }}</span>
          </div>
          <div class="flex justify-between border-b border-line pb-2">
            <span class="text-ink-soft">العنوان</span><span class="font-semibold text-ink">{{ store.addressText }}</span>
          </div>
          <div class="flex justify-between border-b border-line pb-2">
            <span class="text-ink-soft">رقم المحل</span><span dir="ltr" class="font-semibold text-ink">{{ displayPhone(store.contactPhone) }}</span>
          </div>
          <template v-if="isCatalog">
            <div class="flex justify-between border-b border-line pb-2">
              <span class="text-ink-soft">صاحب المحل</span><span class="font-semibold text-ink">{{ store.owner.name ?? '—' }}</span>
            </div>
            <div class="flex justify-between border-b border-line pb-2">
              <span class="text-ink-soft">رقم الدخول</span><span dir="ltr" class="font-semibold text-ink">{{ displayPhone(store.owner.phone) }}</span>
            </div>
            <div class="flex justify-between border-b border-line pb-2">
              <span class="text-ink-soft">أقل طلب</span><span class="font-semibold text-ink">{{ formatMoney(store.minOrderTotal) }}</span>
            </div>
            <div class="flex justify-between border-b border-line pb-2">
              <span class="text-ink-soft">المناطق</span><span class="font-semibold text-ink">{{ store.zones.map((z) => z.zone.nameAr).join('، ') || '—' }}</span>
            </div>
            <div class="flex justify-between border-b border-line pb-2">
              <span class="text-ink-soft">حد الأصناف</span><span class="font-semibold text-ink">{{ store.productLimit ?? 'بلا حد' }}</span>
            </div>
          </template>
        </section>

        <!-- merchant permissions (catalog only) -->
        <section v-if="isCatalog" class="shadow-card mb-6 rounded-xl border border-line bg-surface p-5">
          <h2 class="mb-3 text-base font-bold text-ink">صلاحيات صاحب المحل</h2>
          <div class="flex flex-wrap gap-1.5">
            <span
              v-for="label in grantedPerms"
              :key="label"
              class="rounded-full bg-primary-50 px-2.5 py-1 text-xs font-medium text-primary-700"
            >{{ label }}</span>
          </div>
        </section>

        <!-- products (catalog only) -->
        <section v-if="isCatalog" class="shadow-card rounded-xl border border-line bg-surface p-5">
          <div class="mb-4 flex items-center justify-between">
            <h2 class="text-base font-bold text-ink">
              الأصناف <span class="text-ink-soft">({{ products.length }}{{ store.productLimit ? ` / ${store.productLimit}` : '' }})</span>
            </h2>
            <SgButton size="md" :disabled="atLimit" @click="addOpen = true">+ صنف</SgButton>
          </div>
          <p v-if="atLimit" class="mb-3 rounded-lg bg-warning-600/10 px-3 py-2 text-sm text-warning-600">
            وصل المحل للحد الأقصى للأصناف. ارفع الحد لو عايز تضيف أكتر.
          </p>

          <div v-if="products.length" class="flex flex-col divide-y divide-line">
            <div v-for="p in products" :key="p.id" class="flex items-center gap-3 py-3">
              <div class="flex min-w-0 flex-1 flex-col">
                <span class="truncate text-base font-semibold text-ink">{{ p.name }}</span>
                <span class="text-sm text-primary-700">{{ formatMoney(p.price) }}</span>
              </div>
              <button
                type="button"
                class="flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-semibold disabled:opacity-50"
                :class="p.isAvailable ? 'border-success-600 text-success-600' : 'border-danger-600 text-danger-600'"
                :disabled="busyId === p.id"
                @click="toggleAvail(p)"
              >
                <span class="size-2 rounded-full" :class="p.isAvailable ? 'bg-success-600' : 'bg-danger-600'" />
                {{ p.isAvailable ? 'متاح' : 'خلص' }}
              </button>
              <button type="button" class="rounded-full p-2 text-ink-soft hover:bg-surface-alt" aria-label="حذف" @click="removing = p">
                <SgIcon name="trash" :size="18" />
              </button>
            </div>
          </div>
          <SgEmptyState v-else icon="list" title="مفيش أصناف" hint="ضيف أول صنف للمحل." />
        </section>

        <!-- pickup point: no products / no owner dashboard -->
        <section v-else class="shadow-card rounded-xl border border-line bg-surface p-5">
          <div class="flex items-center gap-3 text-ink-soft">
            <SgIcon name="map-pin" :size="20" />
            <p class="text-sm">نقطة استلام — بتظهر للعميل كمكان يبعتله مشوار. مفيش أصناف ولا لوحة صاحب هنا.</p>
          </div>
        </section>
      </template>
    </div>

    <SgSheet v-model:open="addOpen" title="صنف جديد">
      <div class="flex flex-col gap-4">
        <SgInput v-model="form.name" label="اسم الصنف" placeholder="مثلاً: كشري وسط" />
        <SgInput v-model="form.price" label="السعر بالجنيه" type="tel" inputmode="numeric" placeholder="مثلاً: 30" />
        <SgButton size="xl" block :loading="saving" :disabled="!form.name.trim() || !form.price" @click="addProduct">حفظ</SgButton>
      </div>
    </SgSheet>

    <SgDialog :open="removing !== null" title="تحذف الصنف؟" @update:open="(v) => { if (!v) removing = null }">
      <p class="text-base text-ink-soft">{{ removing?.name }}</p>
      <template #actions>
        <SgButton variant="secondary" block @click="removing = null">إلغاء</SgButton>
        <SgButton variant="danger" block @click="confirmRemove">احذف</SgButton>
      </template>
    </SgDialog>
  </div>
</template>
