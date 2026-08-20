<script setup lang="ts">
import { createAddressSchema } from '@sprintgo/shared';
import type { AddressView, CreateAddressDto } from '@sprintgo/shared';
import type { ApiError } from '~/composables/useApi';
import { useAddresses } from '../composables/useAddresses';
import { useLocationStore } from '~/features/catalog/stores/location.store';

const open = defineModel<boolean>('open', { default: false });
const props = defineProps<{ editing?: AddressView | null }>();
const emit = defineEmits<{ saved: [] }>();

const addresses = useAddresses();
const location = useLocationStore();
const toast = useToast();

const form = reactive({
  label: '',
  zoneId: '',
  street: '',
  building: '',
  landmark: '',
});
const errors = reactive<Record<string, string>>({});
const saving = ref(false);

watch(
  () => [open.value, props.editing?.id],
  () => {
    if (!open.value) return;
    location.loadZones();
    Object.assign(errors, { label: '', zoneId: '', street: '' });
    if (props.editing) {
      form.label = props.editing.label;
      form.zoneId = props.editing.zoneId;
      form.street = props.editing.street;
      form.building = props.editing.building ?? '';
      form.landmark = props.editing.landmark ?? '';
    } else {
      form.label = '';
      form.zoneId = location.selectedZoneId ?? '';
      form.street = '';
      form.building = '';
      form.landmark = '';
    }
  },
  { immediate: true },
);

async function save() {
  Object.keys(errors).forEach((k) => (errors[k] = ''));
  const dto: CreateAddressDto = {
    label: form.label.trim(),
    zoneId: form.zoneId,
    street: form.street.trim(),
    building: form.building.trim() || undefined,
    landmark: form.landmark.trim() || undefined,
  };
  const parsed = createAddressSchema.safeParse(dto);
  if (!parsed.success) {
    for (const issue of parsed.error.issues) errors[String(issue.path[0])] = issue.message;
    return;
  }

  saving.value = true;
  try {
    if (props.editing) await addresses.update(props.editing.id, parsed.data);
    else await addresses.create(parsed.data);
    toast.success('اتحفظ العنوان');
    open.value = false;
    emit('saved');
  } catch (err) {
    toast.error((err as ApiError).message);
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <SgSheet v-model:open="open" :title="editing ? 'تعديل العنوان' : 'عنوان جديد'">
    <div class="flex max-h-[65vh] flex-col gap-4 overflow-y-auto pb-2">
      <SgInput v-model="form.label" label="اسم العنوان" placeholder="البيت / الشغل" :error="errors.label" />

      <div class="flex flex-col gap-1.5">
        <label class="text-base font-semibold text-ink">المنطقة</label>
        <div class="grid grid-cols-2 gap-2">
          <button
            v-for="zone in location.zones"
            :key="zone.id"
            type="button"
            class="rounded-lg border p-3 text-base"
            :class="form.zoneId === zone.id ? 'border-primary-600 bg-primary-50 font-bold' : 'border-line'"
            @click="form.zoneId = zone.id"
          >
            {{ zone.nameAr }}
          </button>
        </div>
        <p v-if="errors.zoneId" class="text-sm font-medium text-danger-600">{{ errors.zoneId }}</p>
      </div>

      <SgInput v-model="form.street" label="الشارع" placeholder="اسم الشارع ورقمه" :error="errors.street" />
      <SgInput v-model="form.building" label="العمارة / الدور / الشقة (اختياري)" placeholder="عمارة 12، الدور 3" />
      <SgInput
        v-model="form.landmark"
        label="علامة مميزة (بتسهّل على المندوب)"
        placeholder="جنب صيدلية العزبي"
      />
    </div>

    <SgButton size="xl" block :loading="saving" class="mt-4" @click="save">حفظ العنوان</SgButton>
  </SgSheet>
</template>
