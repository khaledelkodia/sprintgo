<script setup lang="ts">
import { displayPhone } from '@sprintgo/shared';
import type { ApiError } from '~/composables/useApi';
import { useMerchantManage } from '~/features/merchant/composables/useMerchantManage';
import { useMerchantPermissions } from '~/features/merchant/composables/useMerchantPermissions';
import { useAuthStore } from '~/features/auth/stores/auth.store';

definePageMeta({ layout: 'staff', middleware: ['auth', 'role'], role: 'MERCHANT' });

const manage = useMerchantManage();
const perms = useMerchantPermissions();
const auth = useAuthStore();
const toast = useToast();

// the shared composable owns the store fetch (also feeds can() on the other pages)
const store = perms.store;
const pending = ref(true);
const saving = ref(false);

const canSettings = computed(() => perms.can('merchant.settings'));
const canProducts = computed(() => perms.can('merchant.products'));

onMounted(async () => {
  try {
    await perms.load();
  } finally {
    pending.value = false;
  }
});

async function toggle() {
  if (!store.value || saving.value) return;
  const target = !store.value.isAcceptingOrders;
  saving.value = true;
  try {
    await manage.toggleAccepting(target);
    store.value.isAcceptingOrders = target;
    toast.success(target ? 'المحل بيستقبل طلبات' : 'اتقفل المحل مؤقتًا');
  } catch (err) {
    toast.error((err as ApiError).message);
  } finally {
    saving.value = false;
  }
}

async function onLogout() {
  await auth.logout();
  await navigateTo('/login');
}
</script>

<template>
  <div class="flex flex-1 flex-col">
    <SgTopBar title="إعدادات المحل" back />

    <div class="flex flex-col gap-4 p-5">
      <template v-if="pending">
        <SgSkeleton variant="card" class="h-24" />
      </template>

      <template v-else-if="store">
        <SgCard>
          <div class="flex flex-col gap-1">
            <span class="text-lg font-bold text-ink">{{ store.name }}</span>
            <span dir="ltr" class="text-base text-ink-soft">{{ displayPhone(store.contactPhone) }}</span>
          </div>
        </SgCard>

        <!-- the one-tap "close the store temporarily" switch — needs merchant.settings -->
        <button
          v-if="canSettings"
          type="button"
          class="flex items-center justify-between rounded-xl border-2 p-4"
          :class="store.isAcceptingOrders ? 'border-success-600 bg-success-600/5' : 'border-danger-600 bg-danger-600/5'"
          :disabled="saving"
          @click="toggle"
        >
          <span class="flex flex-col items-start">
            <span class="text-lg font-bold" :class="store.isAcceptingOrders ? 'text-success-600' : 'text-danger-600'">
              {{ store.isAcceptingOrders ? 'المحل مفتوح' : 'المحل مقفول مؤقتًا' }}
            </span>
            <span class="text-sm text-ink-soft">اضغط عشان {{ store.isAcceptingOrders ? 'تقفل مؤقتًا' : 'تفتح' }}</span>
          </span>
          <span class="size-4 rounded-full" :class="store.isAcceptingOrders ? 'bg-success-600' : 'bg-danger-600'" />
        </button>

        <NuxtLink v-if="canProducts" to="/merchant/products" class="flex items-center justify-between rounded-lg border border-line bg-surface p-4 text-base font-semibold text-ink">
          <span class="flex items-center gap-2"><SgIcon name="list" :size="20" class="text-ink-soft" /> إدارة المنيو</span>
          <SgIcon name="chevron" :size="18" class="text-ink-soft" />
        </NuxtLink>

        <SgButton variant="secondary" block class="mt-2" @click="onLogout">تسجيل الخروج</SgButton>
      </template>
    </div>
  </div>
</template>
