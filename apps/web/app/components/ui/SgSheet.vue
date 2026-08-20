<script setup lang="ts">
defineProps<{ title?: string }>();
const open = defineModel<boolean>('open', { default: false });

const panel = ref<HTMLElement | null>(null);
let lastActive: HTMLElement | null = null;

watch(open, async (isOpen) => {
  if (!import.meta.client) return;
  if (isOpen) {
    lastActive = document.activeElement as HTMLElement | null;
    await nextTick();
    panel.value?.focus();
  } else {
    lastActive?.focus();
  }
});

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') open.value = false;
}
</script>

<template>
  <Teleport to="body">
    <Transition name="sg-fade">
      <div v-if="open" class="fixed inset-0 z-40 bg-black/40" @click="open = false" />
    </Transition>
    <Transition name="sg-sheet">
      <section
        v-if="open"
        ref="panel"
        role="dialog"
        aria-modal="true"
        :aria-label="title"
        tabindex="-1"
        class="shadow-sheet fixed inset-x-0 bottom-0 z-50 mx-auto max-w-[480px] rounded-t-2xl bg-surface p-5 pb-8 outline-none"
        @keydown="onKeydown"
      >
        <div class="mx-auto mb-4 h-1.5 w-12 rounded-full bg-line" aria-hidden="true" />
        <h2 v-if="title" class="mb-4 text-xl font-bold text-ink">{{ title }}</h2>
        <slot />
      </section>
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
.sg-sheet-enter-active,
.sg-sheet-leave-active {
  transition: transform 250ms var(--ease-out);
}
.sg-sheet-enter-from,
.sg-sheet-leave-to {
  transform: translateY(100%);
}
</style>
