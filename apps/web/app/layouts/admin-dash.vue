<script setup lang="ts">
import { useAuthStore } from '~/features/auth/stores/auth.store';

const auth = useAuthStore();
const route = useRoute();

/** flat nav for the compact mobile bar (sidebar handles desktop). */
const mobileItems = [
  { to: '/admin', label: 'نظرة عامة', icon: 'home', exact: true },
  { to: '/admin/stores', label: 'المحلات', icon: 'bag', perm: 'stores.view' },
  { to: '/admin/zones', label: 'المناطق', icon: 'map-pin', perm: 'zones.manage' },
  { to: '/admin/drivers', label: 'السواقين', icon: 'bike', perm: 'drivers.view' },
  { to: '/admin/dispatch', label: 'التوزيع', icon: 'truck', perm: 'dispatch.view' },
  { to: '/admin/reports', label: 'التقارير', icon: 'chart', perm: 'drivers.view' },
  { to: '/admin/team', label: 'الفريق', icon: 'users', perm: 'team.view' },
  { to: '/admin/roles', label: 'الأدوار', icon: 'shield', perm: 'roles.manage' },
  { to: '/admin/pricing', label: 'التسعير', icon: 'settings', perm: 'pricing.manage' },
];
const items = computed(() => mobileItems.filter((i) => !i.perm || auth.can(i.perm)));
function isActive(to: string, exact?: boolean) {
  return exact ? route.path === to : route.path === to || route.path.startsWith(to + '/');
}
</script>

<template>
  <div class="flex min-h-dvh bg-surface-alt text-ink">
    <!-- desktop sidebar -->
    <AdminSidebar class="hidden md:flex" />

    <div class="flex min-w-0 flex-1 flex-col">
      <AdminTopbar />

      <!-- compact mobile nav -->
      <div
        class="flex items-center gap-1 overflow-x-auto border-b border-line bg-surface px-3 py-2 md:hidden"
      >
        <NuxtLink
          v-for="item in items"
          :key="item.to"
          :to="item.to"
          class="flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold"
          :class="isActive(item.to, item.exact) ? 'bg-primary-50 text-primary-700' : 'text-ink-soft'"
        >
          <SgIcon :name="item.icon" :size="16" /> {{ item.label }}
        </NuxtLink>
      </div>

      <main class="min-w-0 flex-1 overflow-x-hidden">
        <div class="mx-auto max-w-[1440px] px-6 py-7 md:px-8">
          <slot />
        </div>
      </main>
    </div>
  </div>
</template>
