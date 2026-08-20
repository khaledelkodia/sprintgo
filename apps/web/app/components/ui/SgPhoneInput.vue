<script setup lang="ts">
withDefaults(defineProps<{ label?: string; hint?: string; error?: string }>(), {
  label: 'رقم موبايلك',
  hint: 'هيوصلك كود دخول في رسالة',
});

const model = defineModel<string>({ default: '' });

// Accept whatever gets typed/pasted (incl. Arabic-Indic digits), keep digits only.
watch(model, (value) => {
  const cleaned = value
    .replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)))
    .replace(/\D/g, '')
    .slice(0, 11);
  if (cleaned !== value) model.value = cleaned;
});
</script>

<template>
  <SgInput
    v-model="model"
    :label="label"
    :hint="hint"
    :error="error"
    type="tel"
    inputmode="tel"
    dir="ltr"
    placeholder="01X XXXX XXXX"
    autocomplete="tel"
    :maxlength="11"
    class="[&_input]:text-center [&_input]:text-xl [&_input]:tracking-widest"
  />
</template>
