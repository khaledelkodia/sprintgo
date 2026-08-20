<script setup lang="ts">
defineProps<{ title?: string; back?: boolean }>();
</script>

<template>
  <header class="sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-line bg-surface/95 px-4 backdrop-blur">
    <button
      v-if="back"
      type="button"
      class="flex size-10 items-center justify-center rounded-full text-ink hover:bg-surface-alt"
      aria-label="رجوع"
      @click="$router.back()"
    >
      <!-- RTL: back points right -->
      <svg class="size-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M9 6l6 6-6 6" />
      </svg>
    </button>
    <h1 class="flex-1 truncate text-lg font-bold text-ink">{{ title }}</h1>
    <slot name="actions" />
  </header>
</template>
