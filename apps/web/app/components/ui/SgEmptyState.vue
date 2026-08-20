<script setup lang="ts">
withDefaults(defineProps<{ icon?: string; title: string; hint?: string }>(), { icon: 'inbox' });
</script>

<template>
  <div class="flex flex-col items-center gap-3 py-14 text-center">
    <div class="flex size-16 items-center justify-center rounded-full bg-surface-alt text-ink-soft">
      <SgIcon :name="icon" :size="30" :stroke="1.75" />
    </div>
    <p class="text-lg font-bold text-ink">{{ title }}</p>
    <p v-if="hint" class="max-w-xs text-base text-ink-soft">{{ hint }}</p>
    <slot />
  </div>
</template>
