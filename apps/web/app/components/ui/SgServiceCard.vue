<script setup lang="ts">
defineProps<{ nameAr: string; icon: string; active?: boolean }>();
</script>

<template>
  <button
    type="button"
    class="flex min-h-24 w-full flex-col items-center justify-center gap-2 rounded-lg border bg-surface p-3 transition-colors"
    :class="active ? 'border-primary-600 bg-primary-50 text-primary-700' : 'border-line text-ink hover:bg-surface-alt'"
  >
    <SgIcon :name="icon" :size="30" :stroke="1.75" />
    <span class="text-base font-semibold text-ink">{{ nameAr }}</span>
  </button>
</template>
