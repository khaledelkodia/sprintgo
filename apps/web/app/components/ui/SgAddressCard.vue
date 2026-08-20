<script setup lang="ts">
import type { AddressView } from '@sprintgo/shared';

defineProps<{ address: AddressView; selected?: boolean; selectable?: boolean }>();
defineEmits<{ select: []; edit: []; remove: [] }>();
</script>

<template>
  <div
    class="flex items-start gap-3 rounded-lg border bg-surface p-4 text-start"
    :class="selected ? 'border-primary-600 bg-primary-50' : 'border-line'"
  >
    <button
      v-if="selectable"
      type="button"
      class="mt-1 flex size-6 shrink-0 items-center justify-center rounded-full border-2"
      :class="selected ? 'border-primary-600' : 'border-line'"
      :aria-pressed="selected"
      :aria-label="`اختار ${address.label}`"
      @click="$emit('select')"
    >
      <span v-if="selected" class="size-3 rounded-full bg-primary-600" />
    </button>

    <button type="button" class="flex min-w-0 flex-1 flex-col gap-0.5 text-start" @click="$emit('select')">
      <span class="flex items-center gap-1.5 text-base font-bold text-ink">
        <SgIcon name="map-pin" :size="18" class="text-primary-600" />
        {{ address.label }}
        <span v-if="address.isDefault" class="rounded-full bg-primary-50 px-2 py-0.5 text-xs font-medium text-primary-700">
          الافتراضي
        </span>
      </span>
      <span class="text-sm text-ink-soft">{{ address.zoneName }} · {{ address.street }}</span>
      <span v-if="address.landmark" class="text-sm text-ink-soft">علامة مميزة: {{ address.landmark }}</span>
    </button>

    <div class="flex shrink-0 gap-1">
      <button type="button" class="rounded-full p-2 text-ink-soft hover:bg-surface-alt" aria-label="تعديل" @click="$emit('edit')">
        <SgIcon name="pencil" :size="18" />
      </button>
      <button type="button" class="rounded-full p-2 text-ink-soft hover:bg-surface-alt" aria-label="حذف" @click="$emit('remove')">
        <SgIcon name="trash" :size="18" />
      </button>
    </div>
  </div>
</template>
