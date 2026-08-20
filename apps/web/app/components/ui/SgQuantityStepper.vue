<script setup lang="ts">
const props = withDefaults(
  defineProps<{ min?: number; max?: number; size?: 'sm' | 'md' }>(),
  { min: 0, max: 99, size: 'md' },
);
const model = defineModel<number>({ default: 0 });

const btn = computed(() => (props.size === 'sm' ? 'size-9 text-lg' : 'size-11 text-xl'));

function dec() {
  if (model.value > props.min) model.value--;
}
function inc() {
  if (model.value < props.max) model.value++;
}
</script>

<template>
  <div class="inline-flex items-center gap-1 rounded-full border border-line bg-surface p-1">
    <button
      type="button"
      class="flex items-center justify-center rounded-full text-primary-700 disabled:opacity-30"
      :class="btn"
      :disabled="model <= min"
      aria-label="أقل"
      @click="dec"
    >
      −
    </button>
    <span class="min-w-8 text-center text-lg font-bold tabular-nums">{{ model }}</span>
    <button
      type="button"
      class="flex items-center justify-center rounded-full bg-primary-600 text-white disabled:opacity-30"
      :class="btn"
      :disabled="model >= max"
      aria-label="أكتر"
      @click="inc"
    >
      +
    </button>
  </div>
</template>
