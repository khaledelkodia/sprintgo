<script setup lang="ts">
import type { ProductView } from '@sprintgo/shared';

defineProps<{ product: ProductView; quantityInCart?: number }>();
defineEmits<{ add: [] }>();
</script>

<template>
  <div
    class="flex items-center gap-3 rounded-lg border border-line bg-surface p-3"
    :class="!product.isAvailable ? 'opacity-50' : ''"
  >
    <div class="flex min-w-0 flex-1 flex-col gap-1">
      <span class="text-base font-bold text-ink">{{ product.name }}</span>
      <span v-if="product.description" class="line-clamp-2 text-sm text-ink-soft">
        {{ product.description }}
      </span>
      <SgPrice :amount="product.price" size="lg" class="text-primary-700" />
    </div>

    <div class="shrink-0">
      <span v-if="!product.isAvailable" class="text-sm font-medium text-danger-600">خلص</span>
      <button
        v-else
        type="button"
        class="relative flex size-11 items-center justify-center rounded-full bg-primary-600 text-white"
        aria-label="ضيف للسلة"
        @click="$emit('add')"
      >
        <SgIcon name="plus" :size="24" :stroke="2.5" />
        <span
          v-if="quantityInCart"
          class="absolute -top-1 -start-1 flex size-6 items-center justify-center rounded-full bg-ink text-xs font-bold text-white"
        >
          {{ quantityInCart }}
        </span>
      </button>
    </div>
  </div>
</template>
