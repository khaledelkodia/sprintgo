<script setup lang="ts">
const { toasts, dismiss } = useToast();

const styles: Record<string, string> = {
  success: 'border-success-600/30 text-success-600',
  error: 'border-danger-600/30 text-danger-600',
  info: 'border-info-600/30 text-info-600',
};

const icons: Record<string, string> = {
  success: 'M5 13l4 4L19 7',
  error: 'M6 18L18 6M6 6l12 12',
  info: 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
};
</script>

<template>
  <!-- polite live region: announces without stealing focus (docs 08 §7) -->
  <div class="pointer-events-none fixed inset-x-0 bottom-6 z-[60] flex flex-col items-center gap-2 px-5" role="status" aria-live="polite">
    <TransitionGroup name="sg-toast">
      <button
        v-for="toast in toasts"
        :key="toast.id"
        type="button"
        class="shadow-card pointer-events-auto flex w-full max-w-[440px] items-center gap-3 rounded-lg border bg-surface px-4 py-3 text-start"
        :class="styles[toast.type]"
        @click="dismiss(toast.id)"
      >
        <svg class="size-6 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path :d="icons[toast.type]" />
        </svg>
        <span class="text-base font-medium text-ink">{{ toast.message }}</span>
      </button>
    </TransitionGroup>
  </div>
</template>

<style scoped>
.sg-toast-enter-active,
.sg-toast-leave-active {
  transition: all 250ms var(--ease-out);
}
.sg-toast-enter-from,
.sg-toast-leave-to {
  opacity: 0;
  transform: translateY(12px);
}
</style>
