<script setup lang="ts">
import type { NotificationView } from '@sprintgo/shared';
import { useNotificationsStore } from '~/features/notifications/stores/notifications.store';

definePageMeta({ layout: 'bare', middleware: 'auth' });

const notifications = useNotificationsStore();
const push = usePush();
const pending = ref(true);
const showPushBanner = ref(false);
const enablingPush = ref(false);

async function enablePush() {
  enablingPush.value = true;
  const res = await push.enable();
  enablingPush.value = false;
  if (res.ok) {
    showPushBanner.value = false;
    useToast().success('اتفعّلت إشعارات الجوال');
  } else if (res.reason === 'denied') {
    useToast().error('لازم تسمح بالإشعارات من المتصفح');
  } else if (res.reason === 'unsupported') {
    useToast().error('جهازك مش بيدعم الإشعارات');
  } else {
    useToast().error('مش قادرين نفعّل الإشعارات دلوقتي');
  }
}

function timeAgo(iso: string): string {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return 'دلوقتي';
  if (mins < 60) return `من ${mins} دقيقة`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `من ${hrs} ساعة`;
  return `من ${Math.floor(hrs / 24)} يوم`;
}

async function open(n: NotificationView) {
  await notifications.markRead(n.id);
  const orderId = n.data?.orderId as string | undefined;
  if (orderId) await navigateTo(`/orders/${orderId}`);
}

onMounted(async () => {
  try {
    await notifications.fetchList();
  } finally {
    pending.value = false;
  }
  // offer to turn on device push if supported and not already enrolled
  if (push.supported() && !(await push.isEnrolled())) showPushBanner.value = true;
});
</script>

<template>
  <div class="flex min-h-dvh flex-col">
    <SgTopBar title="الإشعارات" back>
      <template #actions>
        <button
          v-if="notifications.unread > 0"
          type="button"
          class="rounded-full px-3 py-1 text-sm font-semibold text-primary-700 hover:bg-primary-50"
          @click="notifications.markAllRead()"
        >
          تعليم الكل كمقروء
        </button>
      </template>
    </SgTopBar>

    <div class="flex flex-col gap-2 p-4">
      <!-- device push opt-in -->
      <div
        v-if="showPushBanner"
        class="mb-2 flex items-center gap-3 rounded-xl border border-primary-600/30 bg-primary-50 p-4"
      >
        <SgIcon name="bell" :size="24" class="shrink-0 text-primary-700" />
        <div class="flex flex-1 flex-col">
          <span class="text-base font-bold text-ink">فعّل إشعارات الجوال</span>
          <span class="text-sm text-ink-soft">عشان يوصلك كل جديد حتى والتطبيق مقفول.</span>
        </div>
        <SgButton size="md" :loading="enablingPush" @click="enablePush">تفعيل</SgButton>
      </div>

      <template v-if="pending">
        <SgSkeleton v-for="i in 4" :key="i" variant="card" class="h-16" />
      </template>

      <template v-else-if="notifications.items.length">
        <button
          v-for="n in notifications.items"
          :key="n.id"
          type="button"
          class="flex items-start gap-3 rounded-lg border p-4 text-start"
          :class="n.read ? 'border-line bg-surface' : 'border-primary-600/30 bg-primary-50'"
          @click="open(n)"
        >
          <span class="mt-1 flex size-9 shrink-0 items-center justify-center rounded-full bg-primary-50 text-primary-700">
            <SgIcon name="bell" :size="18" />
          </span>
          <span class="flex flex-1 flex-col gap-0.5">
            <span class="text-base font-bold text-ink">{{ n.title }}</span>
            <span class="text-sm text-ink-soft">{{ n.body }}</span>
            <span class="text-xs text-ink-soft">{{ timeAgo(n.createdAt) }}</span>
          </span>
          <span v-if="!n.read" class="mt-2 size-2.5 shrink-0 rounded-full bg-primary-600" />
        </button>
      </template>

      <SgEmptyState v-else icon="bell" title="مفيش إشعارات" hint="هنبلّغك بأي جديد في طلباتك هنا." />
    </div>
  </div>
</template>
