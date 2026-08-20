<script setup lang="ts">
import { createZoneSchema } from '@sprintgo/shared';
import type { ZoneAdminRow } from '@sprintgo/shared';
import type { ApiError } from '~/composables/useApi';
import { useAdmin } from '~/features/admin/composables/useAdmin';

definePageMeta({
  layout: 'admin-dash',
  middleware: ['auth', 'role', 'permission'],
  role: ['ADMIN', 'SUPER_ADMIN'],
  permission: 'zones.manage',
});

const admin = useAdmin();
const toast = useToast();

const zones = ref<ZoneAdminRow[]>([]);
const pending = ref(true);
const addOpen = ref(false);
const saving = ref(false);
const busyId = ref<string | null>(null);
const form = reactive({ nameAr: '', city: 'دمياط', nameEn: '', lat: '', lng: '' });
const errors = reactive<Record<string, string>>({});

async function load() {
  try {
    zones.value = await admin.listZones();
  } finally {
    pending.value = false;
  }
}
onMounted(load);

const activeCount = computed(() => zones.value.filter((z) => z.isActive).length);

function openAdd() {
  form.nameAr = '';
  form.city = 'دمياط';
  form.nameEn = '';
  form.lat = '';
  form.lng = '';
  Object.keys(errors).forEach((k) => delete errors[k]);
  addOpen.value = true;
}

async function save() {
  Object.keys(errors).forEach((k) => delete errors[k]);
  const dto = {
    nameAr: form.nameAr.trim(),
    city: form.city.trim(),
    nameEn: form.nameEn.trim() || undefined,
    lat: form.lat ? Number(form.lat) : undefined,
    lng: form.lng ? Number(form.lng) : undefined,
  };
  const parsed = createZoneSchema.safeParse(dto);
  if (!parsed.success) {
    for (const issue of parsed.error.issues) errors[issue.path[0] as string] = issue.message;
    return;
  }
  saving.value = true;
  try {
    await admin.createZone(parsed.data);
    toast.success('اتضافت المنطقة');
    addOpen.value = false;
    await load();
  } catch (err) {
    toast.error((err as ApiError).message);
  } finally {
    saving.value = false;
  }
}

async function toggle(z: ZoneAdminRow) {
  busyId.value = z.id;
  try {
    await admin.setZoneActive(z.id, !z.isActive);
    z.isActive = !z.isActive;
  } catch (err) {
    toast.error((err as ApiError).message);
  } finally {
    busyId.value = null;
  }
}
</script>

<template>
  <div>
    <AdminPageHeader title="المناطق" :subtitle="`${activeCount} منطقة مفعّلة للتوصيل`">
      <template #actions>
        <SgButton @click="openAdd"><SgIcon name="plus" :size="18" /> منطقة جديدة</SgButton>
      </template>
    </AdminPageHeader>

    <template v-if="pending">
      <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <SgSkeleton v-for="i in 3" :key="i" variant="card" class="h-28" />
      </div>
    </template>

    <template v-else>
      <div v-if="zones.length" class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <div
          v-for="z in zones"
          :key="z.id"
          class="shadow-card flex items-center gap-4 rounded-2xl border border-line bg-surface p-5"
          :class="!z.isActive && 'opacity-70'"
        >
          <div class="flex size-12 items-center justify-center rounded-2xl bg-primary-50 text-primary-700">
            <SgIcon name="map-pin" :size="24" />
          </div>
          <div class="min-w-0 flex-1">
            <div class="flex items-center gap-2">
              <span class="truncate text-lg font-bold text-ink">{{ z.nameAr }}</span>
              <span
                class="rounded-full px-2.5 py-0.5 text-xs font-bold"
                :class="z.isActive ? 'bg-success-50 text-success-700' : 'bg-line-soft text-ink-soft'"
              >{{ z.isActive ? 'مفعّلة' : 'موقوفة' }}</span>
            </div>
            <div class="text-sm text-ink-soft">{{ z.city }} · {{ z.ordersCount }} طلب</div>
          </div>
          <button
            type="button"
            class="rounded-lg border px-3 py-1.5 text-sm font-bold disabled:opacity-50"
            :class="z.isActive ? 'border-line text-ink-soft hover:bg-surface-alt' : 'border-primary-600 text-primary-700'"
            :disabled="busyId === z.id"
            @click="toggle(z)"
          >
            {{ z.isActive ? 'إيقاف' : 'تفعيل' }}
          </button>
        </div>
      </div>
      <div v-else class="rounded-2xl border border-line bg-surface px-5 py-16 text-center text-ink-soft">
        مفيش مناطق لسه — ضيف أول منطقة توصيل.
      </div>
    </template>

    <SgSheet v-model:open="addOpen" title="منطقة جديدة">
      <div class="flex flex-col gap-4">
        <SgInput v-model="form.nameAr" label="اسم المنطقة" placeholder="مثلاً: رأس البر" :error="errors.nameAr" />
        <SgInput v-model="form.city" label="المحافظة / المدينة" placeholder="دمياط" :error="errors.city" />
        <SgInput v-model="form.nameEn" label="الاسم بالإنجليزي (اختياري)" placeholder="Ras El Bar" />
        <div class="grid grid-cols-2 gap-3">
          <SgInput v-model="form.lat" label="خط العرض (اختياري)" type="tel" inputmode="numeric" placeholder="31.49" />
          <SgInput v-model="form.lng" label="خط الطول (اختياري)" type="tel" inputmode="numeric" placeholder="31.84" />
        </div>
        <p class="text-sm text-ink-soft">الإحداثيات بتساعد في حساب أقرب مندوب ورسوم التوصيل — اختيارية.</p>
        <SgButton size="xl" block :loading="saving" @click="save">إضافة المنطقة</SgButton>
      </div>
    </SgSheet>
  </div>
</template>
