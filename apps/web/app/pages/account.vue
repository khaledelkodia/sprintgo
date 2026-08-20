<script setup lang="ts">
import { displayPhone } from '@sprintgo/shared';
import { useAuthStore } from '~/features/auth/stores/auth.store';

definePageMeta({ layout: 'customer', middleware: 'auth' });

const auth = useAuthStore();

async function onLogout() {
  await auth.logout();
  await navigateTo('/');
}
</script>

<template>
  <div class="flex flex-1 flex-col">
    <SgTopBar title="حسابي" />

    <div class="flex flex-col gap-4 p-5">
      <SgCard v-if="auth.user">
        <div class="flex items-center gap-3">
          <div class="flex size-14 items-center justify-center rounded-full bg-primary-50 text-primary-700">
            <SgIcon name="user" :size="26" />
          </div>
          <div class="flex flex-col">
            <span class="text-lg font-bold text-ink">{{ auth.user.name ?? 'مستخدم سبرنت جو' }}</span>
            <span dir="ltr" class="text-base text-ink-soft">{{ displayPhone(auth.user.phone) }}</span>
          </div>
        </div>
      </SgCard>

      <NuxtLink to="/orders" class="flex items-center justify-between rounded-lg border border-line bg-surface p-4 text-base font-semibold text-ink">
        <span class="flex items-center gap-2"><SgIcon name="package" :size="20" class="text-ink-soft" /> طلباتي</span>
        <SgIcon name="chevron" :size="18" class="text-ink-soft" />
      </NuxtLink>
      <NuxtLink to="/addresses" class="flex items-center justify-between rounded-lg border border-line bg-surface p-4 text-base font-semibold text-ink">
        <span class="flex items-center gap-2"><SgIcon name="map-pin" :size="20" class="text-ink-soft" /> عناويني</span>
        <SgIcon name="chevron" :size="18" class="text-ink-soft" />
      </NuxtLink>

      <SgButton variant="secondary" block class="mt-2" @click="onLogout">تسجيل الخروج</SgButton>
    </div>
  </div>
</template>
