<script setup lang="ts">
import { displayPhone } from '@sprintgo/shared';
import type { AdminStoreRow } from '~/features/admin/composables/useAdmin';
import { useAdmin } from '~/features/admin/composables/useAdmin';

definePageMeta({ layout: 'admin-dash', middleware: ['auth', 'role'], role: ['ADMIN', 'SUPER_ADMIN'] });

const admin = useAdmin();
const stores = ref<AdminStoreRow[]>([]);
const pending = ref(true);
const search = ref('');

async function load() {
  pending.value = true;
  try {
    stores.value = await admin.listStores();
  } finally {
    pending.value = false;
  }
}
onMounted(load);

const filtered = computed(() => {
  const q = search.value.trim();
  if (!q) return stores.value;
  return stores.value.filter((s) => s.name.includes(q) || s.owner.phone.includes(q));
});

const statusChip: Record<string, string> = {
  ACTIVE: 'bg-success-600/10 text-success-600',
  SUSPENDED: 'bg-danger-600/10 text-danger-600',
  PENDING: 'bg-warning-600/10 text-warning-600',
  CLOSED: 'bg-ink-soft/10 text-ink-soft',
};
const statusLabel: Record<string, string> = { ACTIVE: 'نشط', SUSPENDED: 'موقوف', PENDING: 'بانتظار', CLOSED: 'مقفول' };

const typeChip: Record<string, string> = {
  CATALOG: 'bg-primary-600/10 text-primary-700',
  PICKUP_POINT: 'bg-ink-soft/10 text-ink-soft',
};
const typeLabel: Record<string, string> = { CATALOG: 'محل بمنتجات', PICKUP_POINT: 'نقطة استلام' };
</script>

<template>
  <div>
    <AdminPageHeader title="المحلات" :subtitle="`${stores.length} محل`">
      <template #actions>
        <SgButton size="md" @click="navigateTo('/admin/stores/new')">+ محل جديد</SgButton>
      </template>
    </AdminPageHeader>

    <div>
      <div class="mb-4">
        <SgInput v-model="search" label="بحث" placeholder="بحث باسم المحل أو رقم صاحبه" inputmode="text" />
      </div>

      <template v-if="pending">
        <div class="flex flex-col gap-2">
          <SgSkeleton v-for="i in 4" :key="i" variant="card" class="h-16" />
        </div>
      </template>

      <template v-else-if="filtered.length">
        <div class="overflow-hidden rounded-xl border border-line bg-surface">
          <NuxtLink
            v-for="store in filtered"
            :key="store.id"
            :to="`/admin/stores/${store.id}`"
            class="flex items-center gap-4 border-b border-line px-5 py-3.5 last:border-b-0 hover:bg-surface-alt"
          >
            <div class="flex size-11 shrink-0 items-center justify-center rounded-lg bg-surface-alt text-ink-soft">
              <SgIcon name="bag" :size="20" />
            </div>
            <div class="flex min-w-0 flex-1 flex-col">
              <span class="truncate text-base font-bold text-ink">{{ store.name }}</span>
              <span class="truncate text-sm text-ink-soft">
                {{ store.serviceType.nameAr }} · {{ store.owner.name ?? 'صاحب المحل' }} ·
                <span dir="ltr">{{ displayPhone(store.owner.phone) }}</span>
              </span>
            </div>
            <div v-if="store.listingType === 'CATALOG'" class="hidden shrink-0 text-sm text-ink-soft sm:block">
              {{ store._count.products }}{{ store.productLimit ? ` / ${store.productLimit}` : '' }} صنف
            </div>
            <span class="shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold" :class="typeChip[store.listingType]">
              {{ typeLabel[store.listingType] }}
            </span>
            <span class="shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold" :class="statusChip[store.status]">
              {{ statusLabel[store.status] }}
            </span>
            <SgIcon name="chevron" :size="18" class="shrink-0 text-ink-soft" />
          </NuxtLink>
        </div>
      </template>

      <SgEmptyState v-else icon="bag" title="مفيش محلات" hint="ابدأ بإضافة أول محل وحساب صاحبه.">
        <SgButton @click="navigateTo('/admin/stores/new')">+ محل جديد</SgButton>
      </SgEmptyState>
    </div>
  </div>
</template>
