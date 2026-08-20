<script setup lang="ts">
import { isValidEgyptianPhone } from '@sprintgo/shared';
import type { Role } from '@sprintgo/shared';
import type { ApiError } from '~/composables/useApi';
import { useAuthStore } from '~/features/auth/stores/auth.store';

/** Route each role to its own landing area (customers get the storefront). */
function homeForRoles(roles: Role[]): string {
  if (roles.includes('ADMIN') || roles.includes('SUPER_ADMIN')) return '/admin';
  if (roles.includes('MERCHANT')) return '/merchant';
  if (roles.includes('COURIER')) return '/courier';
  return '/';
}

definePageMeta({ layout: 'bare' });

const auth = useAuthStore();
const toast = useToast();
const t = useT();
const route = useRoute();

const step = ref<'phone' | 'otp'>('phone');
const phone = ref('');
const code = ref('');
const loading = ref(false);
const phoneError = ref('');
const otpError = ref('');
const resendIn = ref(0);
const devCode = ref('');
let timer: ReturnType<typeof setInterval> | undefined;

const phoneValid = computed(() => isValidEgyptianPhone(phone.value));

function startResendTimer(seconds: number) {
  resendIn.value = seconds;
  clearInterval(timer);
  timer = setInterval(() => {
    resendIn.value -= 1;
    if (resendIn.value <= 0) clearInterval(timer);
  }, 1000);
}

async function sendCode() {
  if (!phoneValid.value) {
    phoneError.value = t('login.phoneInvalid');
    return;
  }
  phoneError.value = '';
  loading.value = true;
  try {
    const res = await auth.requestOtp(phone.value);
    step.value = 'otp';
    code.value = '';
    otpError.value = '';
    devCode.value = res.devCode ?? '';
    startResendTimer(res.retryAfterSec);
  } catch (err) {
    phoneError.value = (err as ApiError).message;
  } finally {
    loading.value = false;
  }
}

async function verify(submitted?: string) {
  const value = submitted ?? code.value;
  if (value.length !== 4 || loading.value) return;
  loading.value = true;
  otpError.value = '';
  try {
    const { user } = await auth.verifyOtp(phone.value, value);
    toast.success(t('login.welcome'));
    // explicit redirect wins; otherwise land staff on their own dashboard
    const redirect =
      typeof route.query.redirect === 'string' ? route.query.redirect : homeForRoles(user.roles);
    await navigateTo(redirect);
  } catch (err) {
    otpError.value = (err as ApiError).message;
    code.value = '';
  } finally {
    loading.value = false;
  }
}

function backToPhone() {
  step.value = 'phone';
  otpError.value = '';
  code.value = '';
  clearInterval(timer);
}

onUnmounted(() => clearInterval(timer));
</script>

<template>
  <div class="flex flex-1 flex-col justify-center gap-8">
    <div class="text-center">
      <p class="text-2xl font-bold text-primary-700">{{ t('common.appName') }}</p>
    </div>

    <!-- step 1: phone -->
    <template v-if="step === 'phone'">
      <div class="flex flex-col gap-2 text-center">
        <h1 class="text-2xl font-bold text-ink">{{ t('login.title') }}</h1>
        <p class="text-base text-ink-soft">{{ t('login.subtitle') }}</p>
      </div>

      <form class="flex flex-col gap-6" @submit.prevent="sendCode">
        <SgPhoneInput v-model="phone" :label="t('login.phoneLabel')" :error="phoneError" />
        <SgButton type="submit" size="xl" block :loading="loading" :disabled="!phoneValid">
          {{ t('login.sendCode') }}
        </SgButton>
      </form>

      <NuxtLink to="/staff-login" class="text-center text-sm font-medium text-ink-soft">
        صاحب محل أو إدارة؟ دخول بكلمة السر
      </NuxtLink>
    </template>

    <!-- step 2: otp -->
    <template v-else>
      <div class="flex flex-col gap-2 text-center">
        <h1 class="text-2xl font-bold text-ink">{{ t('login.otpTitle') }}</h1>
        <p class="text-base text-ink-soft">
          {{ t('login.otpSubtitle') }}
          <span dir="ltr" class="font-bold text-ink">{{ phone }}</span>
        </p>
      </div>

      <div class="flex flex-col gap-6">
        <!-- DEV ONLY: mock SMS shows the code here so you can test without the console -->
        <button
          v-if="devCode"
          type="button"
          class="mx-auto flex items-center gap-2 rounded-md border border-dashed border-warning-600/50 bg-warning-600/5 px-4 py-2 text-base text-warning-600"
          @click="verify(devCode)"
        >
          <SgIcon name="info" :size="18" />
          كود التجربة: <span dir="ltr" class="text-lg font-bold tracking-widest">{{ devCode }}</span>
          <span class="text-sm">— اضغط للدخول</span>
        </button>

        <SgOtpInput v-model="code" :error="otpError" :disabled="loading" @complete="verify" />
        <SgButton size="xl" block :loading="loading" :disabled="code.length !== 4" @click="verify()">
          {{ t('login.verify') }}
        </SgButton>

        <div class="flex items-center justify-between text-base">
          <button type="button" class="font-semibold text-primary-700" @click="backToPhone">
            {{ t('login.changePhone') }}
          </button>
          <button
            v-if="resendIn <= 0"
            type="button"
            class="font-semibold text-primary-700"
            :disabled="loading"
            @click="sendCode"
          >
            {{ t('login.resend') }}
          </button>
          <span v-else class="text-ink-soft"> {{ t('login.resendIn') }} {{ resendIn }} ث </span>
        </div>
      </div>
    </template>
  </div>
</template>
