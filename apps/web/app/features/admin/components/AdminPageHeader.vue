<script setup lang="ts">
defineProps<{ title: string; subtitle?: string; back?: string }>();
</script>

<template>
  <header class="mb-6 flex items-start gap-4">
    <NuxtLink
      v-if="back"
      :to="back"
      class="mt-1 flex size-10 shrink-0 items-center justify-center rounded-xl border border-line bg-surface text-ink-soft shadow-soft transition-colors hover:text-ink"
      aria-label="رجوع"
    >
      <SgIcon name="chevron" :size="20" />
    </NuxtLink>
    <div class="flex min-w-0 flex-1 flex-col">
      <h1 class="truncate text-2xl font-extrabold tracking-tight text-ink">{{ title }}</h1>
      <p v-if="subtitle" class="mt-1 truncate text-[15px] text-ink-soft">{{ subtitle }}</p>
    </div>
    <div class="flex shrink-0 items-center gap-2">
      <slot name="actions" />
    </div>
  </header>
</template>
