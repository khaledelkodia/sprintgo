<script setup lang="ts">
import { formatMoney } from '@sprintgo/shared';

const props = withDefaults(
  defineProps<{ amount: number; size?: 'sm' | 'base' | 'lg' | 'xl' }>(),
  { size: 'base' },
);

const text = computed(() => formatMoney(props.amount));
const sizeClass = computed(
  () =>
    ({ sm: 'text-sm', base: 'text-base', lg: 'text-lg font-bold', xl: 'text-2xl font-bold' })[
      props.size
    ],
);
</script>

<template>
  <span :class="sizeClass" dir="rtl">{{ text }}</span>
</template>
