<script setup lang="ts">
defineProps<{ itemsCount: number; total: number; label?: string }>();
defineEmits<{ click: [] }>();
</script>

<template>
  <!-- sticky bottom CTA: appears the moment the cart has items (docs/architecture/08 §5) -->
  <Transition name="sg-cartbar">
    <div v-if="itemsCount > 0" class="fixed inset-x-0 bottom-0 z-30 mx-auto max-w-[480px] p-3">
      <button
        type="button"
        class="shadow-sheet flex h-14 w-full items-center justify-between rounded-xl bg-primary-600 px-5 text-white"
        @click="$emit('click')"
      >
        <span class="flex items-center gap-2">
          <span class="flex size-7 items-center justify-center rounded-full bg-white/25 text-sm font-bold">
            {{ itemsCount }}
          </span>
          <span class="text-lg font-bold">{{ label ?? 'اتمام الطلب' }}</span>
        </span>
        <SgPrice :amount="total" size="lg" />
      </button>
    </div>
  </Transition>
</template>

<style scoped>
.sg-cartbar-enter-active,
.sg-cartbar-leave-active {
  transition: transform 250ms var(--ease-out);
}
.sg-cartbar-enter-from,
.sg-cartbar-leave-to {
  transform: translateY(120%);
}
</style>
