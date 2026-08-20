<script setup lang="ts">
import { createStoreSchema, poundsToPiasters, MERCHANT_PERMISSIONS, MERCHANT_PERMISSION_KEYS } from '@sprintgo/shared';
import type { ApiSuccess, ServiceTypeView, StoreListingType, ZoneView } from '@sprintgo/shared';
import type { ApiError } from '~/composables/useApi';
import { useApi } from '~/composables/useApi';
import { useAdmin } from '~/features/admin/composables/useAdmin';

definePageMeta({ layout: 'admin-dash', middleware: ['auth', 'role'], role: ['ADMIN', 'SUPER_ADMIN'] });

const admin = useAdmin();
const api = useApi();
const toast = useToast();

const { data: serviceTypes } = await useAsyncData('st', () =>
  api<ApiSuccess<ServiceTypeView[]>>('/service-types').then((r) => r.data),
);
const { data: zones } = await useAsyncData('zn', () =>
  api<ApiSuccess<ZoneView[]>>('/zones').then((r) => r.data),
);

/** نوع المحل: محل بمنتجات (له لوحة وأصناف) أو نقطة استلام (مكان بيظهر كخيار للمشاوير). */
const listingTypes: { value: StoreListingType; label: string; hint: string; icon: string }[] = [
  { value: 'CATALOG', label: 'محل بمنتجات', hint: 'بيعرض أصناف وله لوحة يدخلها صاحبه ويستقبل الطلبات', icon: 'bag' },
  { value: 'PICKUP_POINT', label: 'نقطة استلام', hint: 'مكان بيظهر كخيار للعميل يبعتله مشوار — من غير حساب ولا أصناف', icon: 'map-pin' },
];

const form = reactive({
  listingType: 'CATALOG' as StoreListingType,
  name: '',
  serviceTypeSlug: '',
  addressText: '',
  contactPhone: '',
  minOrderTotal: '',
  prepTimeMins: '20',
  productLimit: '',
  ownerName: '',
  ownerPhone: '',
  ownerPassword: '',
});
const isCatalog = computed(() => form.listingType === 'CATALOG');

interface ZoneRow {
  id: string;
  nameAr: string;
  on: boolean;
  fee: string;
}
const zoneRows = ref<ZoneRow[]>([]);

// صلاحيات صاحب المحل — كلها متحددة افتراضيًا (كامل الصلاحيات).
const managerPermissions = ref<string[]>([...MERCHANT_PERMISSION_KEYS]);
function isPermOn(key: string) {
  return managerPermissions.value.includes(key);
}
function togglePerm(key: string) {
  managerPermissions.value = isPermOn(key)
    ? managerPermissions.value.filter((k) => k !== key)
    : [...managerPermissions.value, key];
}

const errors = reactive<Record<string, string>>({});
const saving = ref(false);

watchEffect(() => {
  if (zoneRows.value.length === 0 && zones.value?.length) {
    zoneRows.value = zones.value.map((z) => ({ id: z.id, nameAr: z.nameAr, on: false, fee: '' }));
  }
});

async function submit() {
  Object.keys(errors).forEach((k) => delete errors[k]);

  const dto: Record<string, unknown> = {
    name: form.name.trim(),
    serviceTypeSlug: form.serviceTypeSlug,
    listingType: form.listingType,
    contactPhone: form.contactPhone.trim(),
    addressText: form.addressText.trim(),
  };

  // محل بمنتجات: بياخد حساب صاحب + مناطق توصيل + حد أصناف + صلاحيات. نقطة الاستلام مكان وبس.
  if (isCatalog.value) {
    dto.minOrderTotal = poundsToPiasters(Number(form.minOrderTotal || 0));
    dto.prepTimeMins = Number(form.prepTimeMins || 20);
    dto.productLimit = form.productLimit ? Number(form.productLimit) : null;
    dto.managerPermissions = managerPermissions.value;
    dto.zones = zoneRows.value
      .filter((z) => z.on)
      .map((z) => ({ zoneId: z.id, deliveryFee: poundsToPiasters(Number(z.fee || 0)) }));
    dto.owner = { name: form.ownerName.trim(), phone: form.ownerPhone.trim(), password: form.ownerPassword };
  }

  const parsed = createStoreSchema.safeParse(dto);
  if (!parsed.success) {
    for (const issue of parsed.error.issues) {
      const path = issue.path.join('.');
      errors[path.startsWith('owner.') ? path : (issue.path[0] as string)] = issue.message;
    }
    toast.error('راجع البيانات — فيه حقول ناقصة');
    return;
  }

  saving.value = true;
  try {
    const res = await admin.createStore(parsed.data);
    toast.success(
      isCatalog.value ? 'اتعمل المحل — دخول صاحبه برقمه والباسورد اللي حطيته' : 'اتعملت نقطة الاستلام',
    );
    await navigateTo(`/admin/stores/${res.store.id}`);
  } catch (err) {
    toast.error((err as ApiError).message);
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <div>
    <AdminPageHeader title="محل جديد" subtitle="اختار نوع المحل وكمّل بياناته" back="/admin/stores" />

    <div class="mx-auto max-w-2xl">
      <div class="flex flex-col gap-5">
        <!-- store type -->
        <section class="shadow-card rounded-xl border border-line bg-surface p-5">
          <h2 class="mb-1 text-base font-bold text-ink">نوع المحل</h2>
          <p class="mb-4 text-sm text-ink-soft">اختار النوع الأول وإحنا نظبطلك الحقول المطلوبة.</p>
          <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <button
              v-for="opt in listingTypes"
              :key="opt.value"
              type="button"
              class="flex flex-col gap-2 rounded-xl border-2 p-4 text-start"
              :class="form.listingType === opt.value ? 'border-primary-600 bg-primary-50' : 'border-line'"
              @click="form.listingType = opt.value"
            >
              <div class="flex items-center gap-2">
                <span
                  class="flex size-9 shrink-0 items-center justify-center rounded-lg"
                  :class="form.listingType === opt.value ? 'bg-primary-600 text-white' : 'bg-surface-alt text-ink-soft'"
                >
                  <SgIcon :name="opt.icon" :size="20" />
                </span>
                <span class="flex-1 text-base font-bold text-ink">{{ opt.label }}</span>
                <span
                  class="flex size-5 shrink-0 items-center justify-center rounded-full border-2"
                  :class="form.listingType === opt.value ? 'border-primary-600 bg-primary-600 text-white' : 'border-line'"
                >
                  <SgIcon v-if="form.listingType === opt.value" name="check" :size="12" :stroke="3" />
                </span>
              </div>
              <span class="text-sm text-ink-soft">{{ opt.hint }}</span>
            </button>
          </div>
        </section>

        <!-- store details -->
        <section class="shadow-card rounded-xl border border-line bg-surface p-5">
          <h2 class="mb-4 text-base font-bold text-ink">بيانات المحل</h2>
          <div class="flex flex-col gap-4">
            <SgInput v-model="form.name" label="اسم المحل" placeholder="مثلاً: كشري التحرير" :error="errors.name" />

            <div class="flex flex-col gap-1.5">
              <label class="text-base font-semibold text-ink">نوع النشاط</label>
              <div class="flex flex-wrap gap-2">
                <button
                  v-for="st in serviceTypes"
                  :key="st.id"
                  type="button"
                  class="flex items-center gap-2 rounded-lg border px-3 py-2 text-base"
                  :class="form.serviceTypeSlug === st.slug ? 'border-primary-600 bg-primary-50 text-primary-700' : 'border-line text-ink'"
                  @click="form.serviceTypeSlug = st.slug"
                >
                  <SgIcon :name="st.icon" :size="18" /> {{ st.nameAr }}
                </button>
              </div>
              <p v-if="errors.serviceTypeSlug" class="text-sm font-medium text-danger-600">{{ errors.serviceTypeSlug }}</p>
            </div>

            <SgInput v-model="form.addressText" label="عنوان المحل" placeholder="الشارع والمنطقة" :error="errors.addressText" />
            <SgInput v-model="form.contactPhone" label="رقم المحل" type="tel" inputmode="tel" dir="ltr" placeholder="01XXXXXXXXX" :error="errors.contactPhone" />
            <div v-if="isCatalog" class="grid grid-cols-3 gap-3">
              <SgInput v-model="form.minOrderTotal" label="أقل طلب (جنيه)" type="tel" inputmode="numeric" placeholder="0" />
              <SgInput v-model="form.prepTimeMins" label="وقت التجهيز (د)" type="tel" inputmode="numeric" placeholder="20" />
              <SgInput v-model="form.productLimit" label="حد الأصناف" type="tel" inputmode="numeric" placeholder="بلا حد" hint="فاضي = بلا حد" />
            </div>
          </div>
        </section>

        <!-- zones (catalog only) -->
        <section v-if="isCatalog" class="shadow-card rounded-xl border border-line bg-surface p-5">
          <h2 class="mb-1 text-base font-bold text-ink">المناطق ورسوم التوصيل</h2>
          <p class="mb-4 text-sm text-ink-soft">اختار المناطق اللي المحل يوصّلها وحدّد رسوم كل منطقة.</p>
          <div class="flex flex-col gap-2">
            <div
              v-for="row in zoneRows"
              :key="row.id"
              class="flex items-center gap-3 rounded-lg border p-3"
              :class="row.on ? 'border-primary-600 bg-primary-50' : 'border-line'"
            >
              <button
                type="button"
                class="flex size-6 shrink-0 items-center justify-center rounded border-2"
                :class="row.on ? 'border-primary-600 bg-primary-600 text-white' : 'border-line'"
                @click="row.on = !row.on"
              >
                <SgIcon v-if="row.on" name="check" :size="16" :stroke="3" />
              </button>
              <span class="flex-1 text-base font-semibold text-ink">{{ row.nameAr }}</span>
              <input
                v-model="row.fee"
                type="tel"
                inputmode="numeric"
                placeholder="رسوم بالجنيه"
                :disabled="!row.on"
                class="h-10 w-32 rounded-md border border-line bg-surface px-3 text-base outline-none focus:outline-2 focus:outline-primary-600 disabled:opacity-40"
              />
            </div>
            <p v-if="errors.zones" class="text-sm font-medium text-danger-600">{{ errors.zones }}</p>
          </div>
        </section>

        <!-- owner (catalog only) -->
        <section v-if="isCatalog" class="shadow-card rounded-xl border border-line bg-surface p-5">
          <h2 class="mb-1 text-base font-bold text-ink">حساب صاحب المحل</h2>
          <p class="mb-4 text-sm text-ink-soft">صاحب المحل هيدخل على لوحته بالرقم والباسورد دول.</p>
          <div class="flex flex-col gap-4">
            <SgInput v-model="form.ownerName" label="اسم صاحب المحل" placeholder="الاسم" :error="errors['owner.name']" />
            <SgInput v-model="form.ownerPhone" label="رقم الدخول" type="tel" inputmode="tel" dir="ltr" placeholder="01XXXXXXXXX" :error="errors['owner.phone']" />
            <SgInput v-model="form.ownerPassword" label="الباسورد" type="text" placeholder="6 حروف على الأقل" :error="errors['owner.password']" />
          </div>
        </section>

        <!-- merchant permissions (catalog only) -->
        <section v-if="isCatalog" class="shadow-card rounded-xl border border-line bg-surface p-5">
          <h2 class="mb-1 text-base font-bold text-ink">صلاحيات صاحب المحل</h2>
          <p class="mb-4 text-sm text-ink-soft">حدّد المهام اللي صاحب المحل يقدر يعملها من لوحته. كله متحدد افتراضيًا.</p>
          <div class="flex flex-col gap-2">
            <button
              v-for="perm in MERCHANT_PERMISSIONS"
              :key="perm.key"
              type="button"
              class="flex items-center gap-3 rounded-lg border p-3 text-start"
              :class="isPermOn(perm.key) ? 'border-primary-600 bg-primary-50' : 'border-line'"
              @click="togglePerm(perm.key)"
            >
              <span
                class="flex size-6 shrink-0 items-center justify-center rounded border-2"
                :class="isPermOn(perm.key) ? 'border-primary-600 bg-primary-600 text-white' : 'border-line'"
              >
                <SgIcon v-if="isPermOn(perm.key)" name="check" :size="16" :stroke="3" />
              </span>
              <span class="text-base font-medium text-ink">{{ perm.label }}</span>
            </button>
          </div>
        </section>

        <SgButton size="xl" block :loading="saving" @click="submit">
          {{ isCatalog ? 'إنشاء المحل' : 'إنشاء نقطة الاستلام' }}
        </SgButton>
      </div>
    </div>
  </div>
</template>
