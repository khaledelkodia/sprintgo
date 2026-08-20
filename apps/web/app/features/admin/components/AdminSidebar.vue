<script setup lang="ts">
import { useAuthStore } from '~/features/auth/stores/auth.store';

const auth = useAuthStore();
const route = useRoute();

interface NavItem {
  to: string;
  label: string;
  icon: string;
  perm?: string;
  exact?: boolean;
}
interface NavGroup {
  label?: string;
  items: NavItem[];
}

/** Grouped nav. `perm` gates an item; items without one show for any staff. */
const groups: NavGroup[] = [
  { items: [{ to: '/admin', label: 'نظرة عامة', icon: 'home', exact: true }] },
  {
    label: 'الإدارة',
    items: [
      { to: '/admin/stores', label: 'المحلات', icon: 'bag', perm: 'stores.view' },
      { to: '/admin/zones', label: 'المناطق', icon: 'map-pin', perm: 'zones.manage' },
      { to: '/admin/drivers', label: 'السواقين والتسويات', icon: 'bike', perm: 'drivers.view' },
      { to: '/admin/dispatch', label: 'توزيع الطلبات', icon: 'truck', perm: 'dispatch.view' },
      { to: '/admin/reports', label: 'تقارير المناديب', icon: 'chart', perm: 'drivers.view' },
    ],
  },
  {
    label: 'الصلاحيات',
    items: [
      { to: '/admin/team', label: 'الفريق', icon: 'users', perm: 'team.view' },
      { to: '/admin/roles', label: 'الأدوار والصلاحيات', icon: 'shield', perm: 'roles.manage' },
    ],
  },
  {
    label: 'الإعدادات',
    items: [
      { to: '/admin/pricing', label: 'التسعير والعمولة', icon: 'settings', perm: 'pricing.manage' },
    ],
  },
];

const visibleGroups = computed(() =>
  groups
    .map((g) => ({ ...g, items: g.items.filter((i) => !i.perm || auth.can(i.perm)) }))
    .filter((g) => g.items.length > 0),
);

function isActive(to: string, exact?: boolean) {
  return exact ? route.path === to : route.path === to || route.path.startsWith(to + '/');
}

const roleLabel = computed(() => {
  const roles = auth.user?.roles ?? [];
  if (roles.includes('SUPER_ADMIN')) return 'مدير عام';
  if (roles.includes('ADMIN')) return 'مشرف';
  return 'موظف';
});

async function onLogout() {
  await auth.logout();
  await navigateTo('/login');
}
</script>

<template>
  <aside class="flex w-[264px] shrink-0 flex-col border-s border-line bg-surface">
    <!-- brand -->
    <div class="flex h-[68px] items-center gap-3 px-5">
      <div
        class="flex size-10 items-center justify-center rounded-2xl text-white shadow-[0_10px_22px_rgba(37,99,235,.35)]"
        style="background: linear-gradient(145deg, #3b82f6, #1d4ed8)"
      >
        <SgIcon name="bike" :size="22" />
      </div>
      <div class="flex flex-col">
        <span class="text-lg font-extrabold leading-none text-ink">سبرنت جو</span>
        <span class="mt-1 text-xs font-medium text-ink-muted">لوحة التحكم</span>
      </div>
    </div>

    <!-- nav -->
    <nav class="flex flex-1 flex-col gap-6 overflow-y-auto px-3 py-4">
      <div v-for="(group, gi) in visibleGroups" :key="gi" class="flex flex-col gap-1">
        <span v-if="group.label" class="mb-1 px-3 text-[11px] font-bold uppercase tracking-wider text-ink-muted">
          {{ group.label }}
        </span>
        <NuxtLink
          v-for="item in group.items"
          :key="item.to"
          :to="item.to"
          class="group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-[15px] font-semibold transition-all"
          :class="
            isActive(item.to, item.exact)
              ? 'bg-primary-50 text-primary-700'
              : 'text-ink-soft hover:bg-surface-alt hover:text-ink'
          "
        >
          <span
            v-if="isActive(item.to, item.exact)"
            class="absolute inset-y-2 start-0 w-1 rounded-full bg-primary-600"
          />
          <SgIcon
            :name="item.icon"
            :size="20"
            :class="isActive(item.to, item.exact) ? 'text-primary-600' : 'text-ink-muted group-hover:text-ink-soft'"
          />
          {{ item.label }}
        </NuxtLink>
      </div>
    </nav>

    <!-- user -->
    <div class="border-t border-line p-3">
      <div class="flex items-center gap-3 rounded-xl px-2 py-2">
        <div
          class="flex size-10 items-center justify-center rounded-full bg-primary-50 font-bold text-primary-700"
        >
          {{ (auth.user?.name ?? 'إ').slice(0, 1) }}
        </div>
        <div class="flex min-w-0 flex-1 flex-col">
          <span class="truncate text-sm font-bold text-ink">{{ auth.user?.name ?? 'الإدارة' }}</span>
          <span class="text-xs text-ink-muted">{{ roleLabel }}</span>
        </div>
        <button
          type="button"
          class="flex size-9 items-center justify-center rounded-lg text-ink-muted transition-colors hover:bg-danger-50 hover:text-danger-600"
          aria-label="تسجيل الخروج"
          @click="onLogout"
        >
          <SgIcon name="logout" :size="18" />
        </button>
      </div>
    </div>
  </aside>
</template>
