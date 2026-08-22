<script setup lang="ts">
import { useAuthStore } from '~/features/auth/stores/auth.store';

/**
 * The web is the STAFF surface — admin, merchant and courier boards. Customers
 * order from the phone app, so this page just routes staff to their own board
 * and tells everyone else where ordering lives.
 */
definePageMeta({ layout: 'bare' });

const auth = useAuthStore();

const staffHome = computed(() => {
  const roles = auth.user?.roles ?? [];
  if (roles.includes('ADMIN') || roles.includes('SUPER_ADMIN')) return '/admin';
  if (roles.includes('MERCHANT')) return '/merchant';
  if (roles.includes('COURIER')) return '/courier';
  return null;
});

// the session restores asynchronously (auth-init plugin), so watch rather than
// check once on mount — otherwise a logged-in admin sees this page flash by
watchEffect(() => {
  if (staffHome.value) navigateTo(staffHome.value, { replace: true });
});
</script>

<template>
  <div class="mx-auto flex min-h-dvh w-full max-w-[480px] flex-col justify-center gap-8 px-6 py-10">
    <header class="flex flex-col items-center gap-3 text-center">
      <div class="flex size-16 items-center justify-center rounded-2xl bg-primary-50 text-primary-600">
        <SgIcon name="truck" :size="32" />
      </div>
      <h1 class="text-3xl font-bold text-ink">سبرنت جو</h1>
      <p class="text-base leading-relaxed text-ink-soft">
        لوحة التحكم — للإدارة وأصحاب المحلات والمناديب.
      </p>
    </header>

    <div class="flex flex-col gap-3">
      <SgButton size="xl" block @click="navigateTo('/staff-login')">
        دخول الإدارة وأصحاب المحلات
      </SgButton>
      <SgButton variant="secondary" size="xl" block @click="navigateTo('/login')">
        دخول المناديب
      </SgButton>
    </div>

    <div class="flex gap-3 rounded-2xl border border-line bg-surface-alt p-4">
      <SgIcon name="phone" :size="22" class="mt-0.5 shrink-0 text-primary-600" />
      <div class="text-sm leading-relaxed text-ink-soft">
        <span class="font-bold text-ink">عايز تطلب؟</span>
        الطلب بقى من تطبيق سبرنت جو على الموبايل — أسهل وأسرع، وفيه المشوار والمحلات والنقل كله.
      </div>
    </div>
  </div>
</template>
