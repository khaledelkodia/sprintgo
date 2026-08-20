<script setup lang="ts">
import { formatMoney } from '@sprintgo/shared';
import type { ProductView } from '@sprintgo/shared';
import type { CartOption } from '~/features/cart/stores/cart.store';

const props = defineProps<{ product: ProductView | null }>();
const open = defineModel<boolean>('open', { default: false });
const emit = defineEmits<{ add: [options: CartOption[], quantity: number, notes?: string] }>();

const quantity = ref(1);
const selected = reactive<Record<string, string[]>>({}); // groupId → optionId[]
const notes = ref('');

// reset each time a product opens
watch(
  () => [props.product?.id, open.value],
  () => {
    if (open.value && props.product) {
      quantity.value = 1;
      notes.value = '';
      for (const g of props.product.optionGroups) {
        // preselect the first option of a required single-choice group (Talabat pattern)
        selected[g.id] = g.minSelect >= 1 && g.maxSelect === 1 && g.options[0] ? [g.options[0].id] : [];
      }
    }
  },
  { immediate: true },
);

function isChecked(groupId: string, optionId: string) {
  return selected[groupId]?.includes(optionId) ?? false;
}

function toggle(group: ProductView['optionGroups'][number], optionId: string) {
  const current = selected[group.id] ?? [];
  if (group.maxSelect === 1) {
    selected[group.id] = [optionId]; // radio
    return;
  }
  if (current.includes(optionId)) {
    selected[group.id] = current.filter((id) => id !== optionId);
  } else if (current.length < group.maxSelect) {
    selected[group.id] = [...current, optionId];
  }
}

const chosenOptions = computed<CartOption[]>(() => {
  if (!props.product) return [];
  const out: CartOption[] = [];
  for (const g of props.product.optionGroups) {
    for (const id of selected[g.id] ?? []) {
      const opt = g.options.find((o) => o.id === id);
      if (opt) out.push({ groupId: g.id, groupName: g.name, optionId: opt.id, optionName: opt.name, priceDelta: opt.priceDelta });
    }
  }
  return out;
});

const isValid = computed(() => {
  if (!props.product) return false;
  return props.product.optionGroups.every((g) => (selected[g.id]?.length ?? 0) >= g.minSelect);
});

const unitPrice = computed(
  () => (props.product?.price ?? 0) + chosenOptions.value.reduce((s, o) => s + o.priceDelta, 0),
);
const totalLabel = computed(() => formatMoney(unitPrice.value * quantity.value));

function confirm() {
  if (!isValid.value) return;
  emit('add', chosenOptions.value, quantity.value, notes.value.trim() || undefined);
  open.value = false;
}
</script>

<template>
  <SgSheet v-model:open="open" :title="product?.name">
    <div v-if="product" class="flex max-h-[60vh] flex-col gap-5 overflow-y-auto pb-2">
      <p v-if="product.description" class="text-base text-ink-soft">{{ product.description }}</p>

      <div v-for="group in product.optionGroups" :key="group.id" class="flex flex-col gap-2">
        <div class="flex items-center justify-between">
          <h3 class="text-base font-bold text-ink">{{ group.name }}</h3>
          <span class="text-sm text-ink-soft">
            {{ group.minSelect >= 1 ? 'مطلوب' : 'اختياري' }}
            <template v-if="group.maxSelect > 1">· لحد {{ group.maxSelect }}</template>
          </span>
        </div>
        <button
          v-for="opt in group.options"
          :key="opt.id"
          type="button"
          class="flex items-center justify-between rounded-lg border p-3 text-start"
          :class="[
            isChecked(group.id, opt.id) ? 'border-primary-600 bg-primary-50' : 'border-line',
            !opt.isAvailable ? 'opacity-40 pointer-events-none' : '',
          ]"
          @click="toggle(group, opt.id)"
        >
          <span class="flex items-center gap-2 text-base">
            <span
              class="flex size-5 items-center justify-center border-2"
              :class="[
                group.maxSelect === 1 ? 'rounded-full' : 'rounded',
                isChecked(group.id, opt.id) ? 'border-primary-600' : 'border-line',
              ]"
            >
              <span v-if="isChecked(group.id, opt.id)" class="size-2.5 rounded-full bg-primary-600" />
            </span>
            {{ opt.name }}
          </span>
          <span v-if="opt.priceDelta > 0" class="text-sm text-ink-soft">+ {{ formatMoney(opt.priceDelta) }}</span>
        </button>
      </div>

      <SgInput v-model="notes" label="ملاحظات (اختياري)" placeholder="مثلاً: من غير بصل" />
    </div>

    <div class="mt-5 flex items-center gap-3">
      <SgQuantityStepper v-model="quantity" :min="1" :max="20" />
      <SgButton size="xl" block :disabled="!isValid" @click="confirm">
        ضيف · {{ totalLabel }}
      </SgButton>
    </div>
  </SgSheet>
</template>
