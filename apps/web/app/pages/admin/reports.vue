<script setup lang="ts">
import type { AdminDriver } from '~/features/admin/composables/useAdmin';
import { useAdmin } from '~/features/admin/composables/useAdmin';

definePageMeta({
  layout: 'admin-dash',
  middleware: ['auth', 'role', 'permission'],
  role: ['ADMIN', 'SUPER_ADMIN'],
  permission: 'drivers.view',
});

const admin = useAdmin();
const drivers = ref<AdminDriver[]>([]);
const pending = ref(true);

onMounted(async () => {
  try {
    drivers.value = await admin.listDrivers();
  } finally {
    pending.value = false;
  }
});

const available = computed(() => drivers.value.filter((d) => d.isAvailable).length);
const totalDeliveries = computed(() => drivers.value.reduce((n, d) => n + (d.totalDeliveries ?? 0), 0));
const ranked = computed(() => [...drivers.value].sort((a, b) => (b.totalDeliveries ?? 0) - (a.totalDeliveries ?? 0)));
const maxDeliveries = computed(() => Math.max(1, ...drivers.value.map((d) => d.totalDeliveries ?? 0)));

const kpis = computed(() => [
  { label: 'إجمالي المناديب', value: drivers.value.length, sub: 'مسجّل', icon: 'bike', from: '#DBEAFE', to: '#EFF6FF', color: '#2563EB' },
  { label: 'متاح الآن', value: available.value, sub: 'أونلاين', icon: 'check', from: '#DCFCE7', to: '#F0FDF4', color: '#16A34A' },
  { label: 'إجمالي التوصيلات', value: totalDeliveries.value, sub: 'كل الوقت', icon: 'package', from: '#FFEDD5', to: '#FFF7ED', color: '#EA580C' },
]);
</script>

<template>
  <div>
    <AdminPageHeader title="تقارير المناديب" subtitle="أداء السواقين وتوصيلاتهم" />

    <template v-if="pending">
      <div class="grid gap-5 sm:grid-cols-3">
        <SgSkeleton v-for="i in 3" :key="i" variant="card" class="h-32" />
      </div>
    </template>

    <template v-else>
      <div class="grid gap-5 sm:grid-cols-3">
        <div v-for="k in kpis" :key="k.label" class="shadow-card rounded-2xl border border-line bg-surface p-5">
          <div
            class="flex size-12 items-center justify-center rounded-2xl"
            :style="{ background: `linear-gradient(145deg, ${k.from}, ${k.to})`, color: k.color }"
          >
            <SgIcon :name="k.icon" :size="24" />
          </div>
          <div class="mt-4 text-3xl font-extrabold tracking-tight text-ink">{{ k.value }}</div>
          <div class="mt-1 text-[15px] text-ink-soft">{{ k.label }} · {{ k.sub }}</div>
        </div>
      </div>

      <!-- performance table -->
      <section class="shadow-card mt-6 overflow-hidden rounded-2xl border border-line bg-surface">
        <div class="border-b border-line px-5 py-4">
          <h2 class="text-lg font-bold text-ink">ترتيب المناديب حسب التوصيلات</h2>
        </div>

        <div v-if="ranked.length" class="hidden md:block">
          <table class="w-full text-start">
            <thead>
              <tr class="border-b border-line text-sm text-ink-soft">
                <th class="px-5 py-3 text-start font-semibold">المندوب</th>
                <th class="px-5 py-3 text-start font-semibold">الرقم</th>
                <th class="px-5 py-3 text-start font-semibold">الحالة</th>
                <th class="px-5 py-3 text-start font-semibold">التوصيلات</th>
                <th class="w-1/3 px-5 py-3 text-start font-semibold">النشاط</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-line">
              <tr v-for="(d, i) in ranked" :key="d.id" class="transition-colors hover:bg-surface-alt">
                <td class="px-5 py-3.5">
                  <div class="flex items-center gap-3">
                    <div class="flex size-9 items-center justify-center rounded-full bg-primary-50 text-sm font-bold text-primary-700">
                      {{ i + 1 }}
                    </div>
                    <span class="font-bold text-ink">{{ d.name ?? '—' }}</span>
                  </div>
                </td>
                <td class="px-5 py-3.5" dir="ltr"><span class="text-ink-soft">{{ d.phone }}</span></td>
                <td class="px-5 py-3.5">
                  <span
                    class="rounded-full px-3 py-1 text-xs font-bold"
                    :class="d.isAvailable ? 'bg-success-50 text-success-700' : 'bg-line-soft text-ink-soft'"
                  >
                    {{ d.isAvailable ? 'متاح' : 'غير متصل' }}
                  </span>
                </td>
                <td class="px-5 py-3.5 font-extrabold text-ink">{{ d.totalDeliveries ?? 0 }}</td>
                <td class="px-5 py-3.5">
                  <div class="h-2.5 w-full overflow-hidden rounded-full bg-line-soft">
                    <div
                      class="h-full rounded-full"
                      style="background: linear-gradient(90deg, #3b82f6, #2563eb)"
                      :style="{ width: `${((d.totalDeliveries ?? 0) / maxDeliveries) * 100}%` }"
                    />
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- mobile cards -->
        <div v-if="ranked.length" class="divide-y divide-line md:hidden">
          <div v-for="(d, i) in ranked" :key="d.id" class="flex items-center gap-3 px-5 py-3.5">
            <div class="flex size-9 items-center justify-center rounded-full bg-primary-50 text-sm font-bold text-primary-700">{{ i + 1 }}</div>
            <div class="min-w-0 flex-1">
              <div class="truncate font-bold text-ink">{{ d.name ?? '—' }}</div>
              <div class="text-sm text-ink-soft" dir="ltr">{{ d.phone }}</div>
            </div>
            <div class="text-end">
              <div class="font-extrabold text-ink">{{ d.totalDeliveries ?? 0 }}</div>
              <div class="text-xs" :class="d.isAvailable ? 'text-success-700' : 'text-ink-muted'">
                {{ d.isAvailable ? 'متاح' : 'غير متصل' }}
              </div>
            </div>
          </div>
        </div>

        <div v-else class="px-5 py-12 text-center text-ink-soft">مفيش مناديب مسجّلين لسه.</div>
      </section>
    </template>
  </div>
</template>
