<script setup lang="ts">
withDefaults(
  defineProps<{
    label: string;
    hint?: string;
    error?: string;
    type?: string;
    inputmode?: 'text' | 'tel' | 'numeric' | 'email';
    placeholder?: string;
    dir?: 'rtl' | 'ltr';
    maxlength?: number;
    autocomplete?: string;
  }>(),
  { type: 'text' },
);

const model = defineModel<string>({ default: '' });
const id = useId();
</script>

<template>
  <div class="flex flex-col gap-1.5">
    <!-- label is always visible: placeholder-as-label is banned (docs 08 §4) -->
    <label :for="id" class="text-base font-semibold text-ink">{{ label }}</label>
    <input
      :id="id"
      v-model="model"
      :type="type"
      :inputmode="inputmode"
      :placeholder="placeholder"
      :dir="dir"
      :maxlength="maxlength"
      :autocomplete="autocomplete"
      class="h-13 rounded-md border bg-surface px-4 text-lg text-ink outline-none placeholder:text-ink-soft/50 focus:outline-2 focus:outline-offset-1"
      :class="error ? 'border-danger-600 focus:outline-danger-600' : 'border-line focus:outline-primary-600'"
      :aria-invalid="error ? 'true' : undefined"
      :aria-describedby="error ? `${id}-err` : hint ? `${id}-hint` : undefined"
    />
    <p v-if="error" :id="`${id}-err`" class="text-sm font-medium text-danger-600">{{ error }}</p>
    <p v-else-if="hint" :id="`${id}-hint`" class="text-sm text-ink-soft">{{ hint }}</p>
  </div>
</template>
