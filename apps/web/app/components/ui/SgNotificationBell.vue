<script setup lang="ts">
import { useNotificationsStore } from '~/features/notifications/stores/notifications.store';

const notifications = useNotificationsStore();
const toast = useToast();

// self-initialize: the bell only renders for a logged-in user, so this is a
// reliable place to load the count and bind live updates (bindRealtime is guarded).
onMounted(() => {
  notifications.fetchUnread();
  notifications.bindRealtime((n) => toast.info(n.title));
});
</script>

<template>
  <NuxtLink
    to="/notifications"
    class="relative flex size-10 items-center justify-center rounded-full text-ink-soft hover:bg-surface-alt"
    aria-label="الإشعارات"
  >
    <SgIcon name="bell" :size="22" />
    <span
      v-if="notifications.unread > 0"
      class="absolute -top-0.5 -end-0.5 flex min-w-5 items-center justify-center rounded-full bg-danger-600 px-1 text-xs font-bold text-white"
    >
      {{ notifications.unread > 9 ? '9+' : notifications.unread }}
    </span>
  </NuxtLink>
</template>
