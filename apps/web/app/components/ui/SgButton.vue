<script setup lang="ts">
type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'md' | 'xl';

const props = withDefaults(
  defineProps<{
    variant?: Variant;
    size?: Size;
    type?: 'button' | 'submit';
    loading?: boolean;
    disabled?: boolean;
    block?: boolean;
  }>(),
  { variant: 'primary', size: 'md', type: 'button', loading: false, disabled: false, block: false },
);

const classes = computed(() => {
  const base =
    'inline-flex items-center justify-center gap-2 rounded-md font-semibold select-none transition-colors duration-150 ' +
    'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600 ' +
    'disabled:opacity-50 disabled:pointer-events-none';
  const sizes: Record<Size, string> = {
    md: 'h-12 px-5 text-base',
    xl: 'h-14 px-6 text-lg',
  };
  const variants: Record<Variant, string> = {
    primary: 'bg-primary-600 text-white hover:bg-primary-700 active:bg-primary-700',
    secondary: 'border border-line bg-surface text-ink hover:bg-surface-alt',
    ghost: 'bg-transparent text-primary-700 hover:bg-primary-50',
    danger: 'bg-danger-600 text-white hover:opacity-90',
  };
  return [base, sizes[props.size], variants[props.variant], props.block ? 'w-full' : ''].join(' ');
});
</script>

<template>
  <button :type="type" :class="classes" :disabled="disabled || loading" :aria-busy="loading || undefined">
    <svg v-if="loading" class="size-5 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
    </svg>
    <slot />
  </button>
</template>
