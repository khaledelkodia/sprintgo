<script setup lang="ts">
defineProps<{ title?: string }>();
const open = defineModel<boolean>('open', { default: false });

const panel = ref<HTMLElement | null>(null);
watch(open, async (isOpen) => {
  if (import.meta.client && isOpen) {
    await nextTick();
    panel.value?.focus();
  }
});
</script>

<template>
  <Teleport to="body">
    <Transition name="sg-fade">
      <div v-if="open" class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-6" @click.self="open = false">
        <div
          ref="panel"
          role="alertdialog"
          aria-modal="true"
          :aria-label="title"
          tabindex="-1"
          class="shadow-sheet w-full max-w-sm rounded-2xl bg-surface p-5 outline-none"
          @keydown.esc="open = false"
        >
          <h2 v-if="title" class="mb-3 text-lg font-bold text-ink">{{ title }}</h2>
          <div class="mb-5"><slot /></div>
          <div class="flex gap-3"><slot name="actions" /></div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.sg-fade-enter-active,
.sg-fade-leave-active {
  transition: opacity 200ms var(--ease-out);
}
.sg-fade-enter-from,
.sg-fade-leave-to {
  opacity: 0;
}
</style>
