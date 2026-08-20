<script setup lang="ts">
import type { AdminDriver, AdminStoreRow } from '~/features/admin/composables/useAdmin';
import { useAdmin } from '~/features/admin/composables/useAdmin';
import { useAuthStore } from '~/features/auth/stores/auth.store';

definePageMeta({ layout: 'admin-dash', middleware: ['auth', 'role'], role: ['ADMIN', 'SUPER_ADMIN'] });

const admin = useAdmin();
const auth = useAuthStore();
const stores = ref<AdminStoreRow[]>([]);
const drivers = ref<AdminDriver[]>([]);
const pending = ref(true);

onMounted(async () => {
  try {
    await Promise.all([
      auth.can('stores.view') ? admin.listStores().then((r) => (stores.value = r)) : null,
      auth.can('drivers.view') ? admin.listDrivers().then((r) => (drivers.value = r)) : null,
    ]);
  } finally {
    pending.value = false;
  }
});

const activeStores = computed(() => stores.value.filter((s) => s.status === 'ACTIVE').length);
const availableDrivers = computed(() => drivers.value.filter((d) => d.isAvailable).length);
const totalProducts = computed(() => stores.value.reduce((n, s) => n + (s._count?.products ?? 0), 0));

/** stores grouped by service type — powers the mini bar chart. */
const byType = computed(() => {
  const map = new Map<string, number>();
  for (const s of stores.value) {
    const k = s.serviceType?.nameAr ?? 'أخرى';
    map.set(k, (map.get(k) ?? 0) + 1);
  }
  return [...map.entries()].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count);
});
const maxType = computed(() => Math.max(1, ...byType.value.map((t) => t.count)));

const kpis = computed(() => {
  const cards = [];
  if (auth.can('stores.view')) {
    cards.push(
      { label: 'المحلات', value: stores.value.length, sub: `${activeStores.value} نشط`, icon: 'bag', from: '#DBEAFE', to: '#EFF6FF', color: '#2563EB', to_: '/admin/stores' },
      { label: 'الأصناف المعروضة', value: totalProducts.value, sub: 'في كل المحلات', icon: 'package', from: '#FFEDD5', to: '#FFF7ED', color: '#EA580C', to_: '/admin/stores' },
    );
  }
  if (auth.can('drivers.view')) {
    cards.push({ label: 'السواقين', value: drivers.value.length, sub: `${availableDrivers.value} متاح الآن`, icon: 'bike', from: '#DCFCE7', to: '#F0FDF4', color: '#16A34A', to_: '/admin/drivers' });
  }
  if (auth.can('stores.view')) {
    cards.push({ label: 'قطاعات الخدمة', value: byType.value.length, sub: 'نوع محل', icon: 'chart', from: '#EDE9FE', to: '#F5F3FF', color: '#7C3AED', to_: '/admin/stores' });
  }
  return cards;
});

const recentStores = computed(() => stores.value.slice(0, 6));

const quickActions = computed(() =>
  [
    { perm: 'stores.create', to: '/admin/stores/new', icon: 'plus', label: 'إضافة محل + حساب صاحبه' },
    { perm: 'drivers.manage', to: '/admin/drivers', icon: 'bike', label: 'إضافة سائق' },
    { perm: 'dispatch.view', to: '/admin/dispatch', icon: 'map-pin', label: 'توزيع الطلبات' },
    { perm: 'team.manage', to: '/admin/team', icon: 'users', label: 'إضافة عضو للفريق' },
  ].filter((a) => auth.can(a.perm)),
);

function statusChip(status: string) {
  if (status === 'ACTIVE') return { label: 'نشط', cls: 'bg-success-50 text-success-700' };
  if (status === 'SUSPENDED') return { label: 'موقوف', cls: 'bg-danger-50 text-danger-600' };
  return { label: 'قيد المراجعة', cls: 'bg-warning-50 text-warning-600' };
}
</script>

<template>
  <div>
    <AdminPageHeader title="نظرة عامة" subtitle="ملخص سريع لمنصة سبرنت جو">
      <template #actions>
        <SgButton v-if="auth.can('stores.create')" @click="navigateTo('/admin/stores/new')">
          <SgIcon name="plus" :size="18" /> محل جديد
        </SgButton>
      </template>
    </AdminPageHeader>

    <!-- KPI cards -->
    <template v-if="pending">
      <div class="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        <SgSkeleton v-for="i in 4" :key="i" variant="card" class="h-32" />
      </div>
    </template>

    <template v-else>
      <div class="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        <NuxtLink
          v-for="k in kpis"
          :key="k.label"
          :to="k.to_"
          class="shadow-card group rounded-2xl border border-line bg-surface p-5 transition-all hover:-translate-y-0.5 hover:shadow-lg"
        >
          <div class="flex items-start justify-between">
            <div
              class="flex size-12 items-center justify-center rounded-2xl"
              :style="{ background: `linear-gradient(145deg, ${k.from}, ${k.to})`, color: k.color }"
            >
              <SgIcon :name="k.icon" :size="24" />
            </div>
            <SgIcon name="chevron" :size="18" class="text-ink-muted transition-transform group-hover:-translate-x-0.5" />
          </div>
          <div class="mt-4 text-3xl font-extrabold tracking-tight text-ink">{{ k.value }}</div>
          <div class="mt-1 text-[15px] text-ink-soft">{{ k.label }} · {{ k.sub }}</div>
        </NuxtLink>
      </div>

      <!-- lower grid: recent stores + side panel -->
      <div class="mt-6 grid gap-6 xl:grid-cols-3">
        <!-- recent stores table -->
        <section class="shadow-card rounded-2xl border border-line bg-surface xl:col-span-2">
          <div class="flex items-center justify-between border-b border-line px-5 py-4">
            <h2 class="text-lg font-bold text-ink">أحدث المحلات</h2>
            <NuxtLink to="/admin/stores" class="text-sm font-semibold text-primary-700 hover:text-primary-800">
              عرض الكل
            </NuxtLink>
          </div>
          <div v-if="recentStores.length" class="divide-y divide-line">
            <NuxtLink
              v-for="s in recentStores"
              :key="s.id"
              :to="`/admin/stores/${s.id}`"
              class="flex items-center gap-4 px-5 py-3.5 transition-colors hover:bg-surface-alt"
            >
              <div class="flex size-11 items-center justify-center rounded-xl bg-primary-50 text-primary-700">
                <SgIcon name="bag" :size="20" />
              </div>
              <div class="min-w-0 flex-1">
                <div class="truncate font-bold text-ink">{{ s.name }}</div>
                <div class="text-sm text-ink-soft">{{ s.serviceType?.nameAr }} · {{ s._count?.products ?? 0 }} صنف</div>
              </div>
              <span class="rounded-full px-3 py-1 text-xs font-bold" :class="statusChip(s.status).cls">
                {{ statusChip(s.status).label }}
              </span>
            </NuxtLink>
          </div>
          <div v-else class="px-5 py-12 text-center text-ink-soft">مفيش محلات لسه — ابدأ بإضافة محل.</div>
        </section>

        <!-- side: distribution + quick actions -->
        <div class="flex flex-col gap-6">
          <section v-if="byType.length" class="shadow-card rounded-2xl border border-line bg-surface p-5">
            <h2 class="mb-4 text-lg font-bold text-ink">المحلات حسب النوع</h2>
            <div class="flex flex-col gap-3.5">
              <div v-for="t in byType" :key="t.name">
                <div class="mb-1.5 flex items-center justify-between text-sm">
                  <span class="font-semibold text-ink">{{ t.name }}</span>
                  <span class="font-bold text-ink-soft">{{ t.count }}</span>
                </div>
                <div class="h-2.5 overflow-hidden rounded-full bg-line-soft">
                  <div
                    class="h-full rounded-full"
                    style="background: linear-gradient(90deg, #3b82f6, #2563eb)"
                    :style="{ width: `${(t.count / maxType) * 100}%` }"
                  />
                </div>
              </div>
            </div>
          </section>

          <section v-if="quickActions.length" class="shadow-card rounded-2xl border border-line bg-surface p-5">
            <h2 class="mb-4 text-lg font-bold text-ink">إجراءات سريعة</h2>
            <div class="flex flex-col gap-2.5">
              <button
                v-for="a in quickActions"
                :key="a.to"
                type="button"
                class="flex items-center gap-3 rounded-xl border border-line px-4 py-3 text-start transition-colors hover:border-primary-600/40 hover:bg-primary-50/40"
                @click="navigateTo(a.to)"
              >
                <div class="flex size-9 items-center justify-center rounded-lg bg-primary-50 text-primary-700">
                  <SgIcon :name="a.icon" :size="18" />
                </div>
                <span class="font-semibold text-ink">{{ a.label }}</span>
              </button>
            </div>
          </section>
        </div>
      </div>
    </template>
  </div>
</template>
