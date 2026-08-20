<script setup lang="ts">
withDefaults(defineProps<{ variant?: 'text' | 'title' | 'image' | 'button' | 'card' }>(), {
  variant: 'text',
});
</script>

<template>
  <div
    aria-hidden="true"
    class="animate-pulse rounded-md bg-line/70"
    :class="{
      'h-4 w-full': variant === 'text',
      'h-6 w-2/3': variant === 'title',
      'h-40 w-full rounded-lg': variant === 'image',
      'h-12 w-full': variant === 'button',
      'h-28 w-full rounded-lg': variant === 'card',
    }"
  />
</template>
