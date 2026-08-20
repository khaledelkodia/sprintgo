<script setup lang="ts">
import type { OrderTimelineEntry } from '@sprintgo/shared';

defineProps<{ entries: OrderTimelineEntry[] }>();

function timeOf(iso: string): string {
  return new Date(iso).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });
}
</script>

<template>
  <ol class="flex flex-col">
    <li v-for="(entry, i) in entries" :key="entry.at" class="flex gap-3">
      <!-- rail -->
      <div class="flex flex-col items-center">
        <span
          class="flex size-8 items-center justify-center rounded-full text-white"
          :class="entry.status === 'CANCELLED' ? 'bg-danger-600' : 'bg-primary-600'"
        >
          <svg class="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path :d="entry.status === 'CANCELLED' ? 'M6 18L18 6M6 6l12 12' : 'M5 13l4 4L19 7'" />
          </svg>
        </span>
        <span v-if="i < entries.length - 1" class="my-1 w-0.5 flex-1 bg-primary-600/30" />
      </div>
      <!-- label -->
      <div class="flex-1 pb-6">
        <p class="text-base font-bold text-ink">{{ entry.label }}</p>
        <p class="text-sm text-ink-soft">{{ timeOf(entry.at) }}</p>
        <p v-if="entry.note" class="mt-0.5 text-sm text-ink-soft">{{ entry.note }}</p>
      </div>
    </li>
  </ol>
</template>
