<script setup lang="ts">
const items = [
  { to: '/', label: 'الرئيسية', icon: 'home' },
  { to: '/orders', label: 'طلباتي', icon: 'package' },
  { to: '/addresses', label: 'عناويني', icon: 'map-pin' },
  { to: '/account', label: 'حسابي', icon: 'user' },
];
const route = useRoute();
function isActive(to: string) {
  return to === '/' ? route.path === '/' : route.path.startsWith(to);
}
</script>

<template>
  <nav class="sticky bottom-0 z-30 mx-auto grid max-w-[480px] grid-cols-4 border-t border-line bg-surface pb-[env(safe-area-inset-bottom)]">
    <NuxtLink
      v-for="item in items"
      :key="item.to"
      :to="item.to"
      class="flex flex-col items-center gap-0.5 py-2 text-sm"
      :class="isActive(item.to) ? 'text-primary-700 font-bold' : 'text-ink-soft'"
    >
      <SgIcon :name="item.icon" :size="24" :stroke="isActive(item.to) ? 2.25 : 2" />
      {{ item.label }}
    </NuxtLink>
  </nav>
</template>
