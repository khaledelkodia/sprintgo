<script setup lang="ts">
import { isValidEgyptianPhone } from '@sprintgo/shared';
import type { Role } from '@sprintgo/shared';
import type { ApiError } from '~/composables/useApi';
import { useAuthStore } from '~/features/auth/stores/auth.store';

definePageMeta({ layout: 'bare' });

const auth = useAuthStore();
const phone = ref('');
const password = ref('');
const loading = ref(false);
const error = ref('');

const canSubmit = computed(() => isValidEgyptianPhone(phone.value) && password.value.length >= 1);

function homeForRoles(roles: Role[]): string {
  if (roles.includes('ADMIN') || roles.includes('SUPER_ADMIN')) return '/admin';
  if (roles.includes('MERCHANT')) return '/merchant';
  return '/';
}

async function submit() {
  if (!canSubmit.value || loading.value) return;
  loading.value = true;
  error.value = '';
  try {
    const user = await auth.passwordLogin(phone.value.trim(), password.value);
    await navigateTo(homeForRoles(user.roles));
  } catch (err) {
    error.value = (err as ApiError).message;
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div class="flex flex-1 flex-col justify-center gap-8">
    <div class="flex flex-col gap-2 text-center">
      <p class="text-2xl font-bold text-primary-700">سبرنت جو</p>
      <h1 class="text-xl font-bold text-ink">دخول أصحاب المحلات والإدارة</h1>
      <p class="text-base text-ink-soft">ادخل برقمك وكلمة السر اللي وصلتك من الإدارة.</p>
    </div>

    <form class="flex flex-col gap-5" @submit.prevent="submit">
      <SgInput
        v-model="phone"
        label="رقم الموبايل"
        type="tel"
        inputmode="tel"
        dir="ltr"
        placeholder="01XXXXXXXXX"
        autocomplete="username"
      />
      <SgInput
        v-model="password"
        label="كلمة السر"
        type="password"
        placeholder="••••••"
        autocomplete="current-password"
        :error="error"
      />
      <SgButton type="submit" size="xl" block :loading="loading" :disabled="!canSubmit">دخول</SgButton>
    </form>

    <NuxtLink to="/login" class="text-center text-base font-semibold text-primary-700">
      عميل؟ ادخل بالكود من هنا
    </NuxtLink>
  </div>
</template>
