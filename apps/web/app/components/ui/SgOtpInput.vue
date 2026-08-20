<script setup lang="ts">
const props = withDefaults(
  defineProps<{ length?: number; error?: string; disabled?: boolean }>(),
  { length: 4, disabled: false },
);
const emit = defineEmits<{ complete: [code: string] }>();

const model = defineModel<string>({ default: '' });
const inputRef = ref<HTMLInputElement | null>(null);

function onInput(event: Event) {
  const el = event.target as HTMLInputElement;
  const cleaned = el.value
    .replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)))
    .replace(/\D/g, '')
    .slice(0, props.length);
  model.value = cleaned;
  el.value = cleaned;
  if (cleaned.length === props.length) emit('complete', cleaned);
}

function focusInput() {
  inputRef.value?.focus();
}

defineExpose({ focus: focusInput });
onMounted(focusInput);
</script>

<template>
  <div class="flex flex-col items-center gap-2" @click="focusInput">
    <div class="relative" dir="ltr">
      <!-- one real input (WebOTP/SMS autofill via one-time-code) rendered as boxes -->
      <input
        ref="inputRef"
        :value="model"
        type="text"
        inputmode="numeric"
        autocomplete="one-time-code"
        :maxlength="length"
        :disabled="disabled"
        aria-label="كود التحقق"
        class="absolute inset-0 z-10 w-full opacity-0"
        @input="onInput"
      />
      <div class="pointer-events-none flex gap-3">
        <div
          v-for="i in length"
          :key="i"
          class="flex h-16 w-14 items-center justify-center rounded-md border-2 bg-surface text-2xl font-bold text-ink"
          :class="error ? 'border-danger-600' : model.length === i - 1 ? 'border-primary-600' : 'border-line'"
        >
          {{ model[i - 1] ?? '' }}
        </div>
      </div>
    </div>
    <p v-if="error" class="text-sm font-medium text-danger-600" role="alert">{{ error }}</p>
  </div>
</template>
