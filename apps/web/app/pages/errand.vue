<script setup lang="ts">
import type { AddressView, CreateErrandDto } from '@sprintgo/shared';
import type { ApiError } from '~/composables/useApi';
import { useErrands } from '~/features/errands/composables/useErrands';
import { useAddresses } from '~/features/addresses/composables/useAddresses';

definePageMeta({ layout: 'bare', middleware: 'auth' });

const errands = useErrands();
const addresses = useAddresses();
const toast = useToast();

const instructions = ref('');
const pickupText = ref('');
const budget = ref('');
const addressList = ref<AddressView[]>([]);
const selectedAddressId = ref<string | null>(null);
const loadingAddr = ref(true);
const placing = ref(false);

const canSubmit = computed(() => instructions.value.trim().length >= 3 && selectedAddressId.value);

onMounted(async () => {
  try {
    addressList.value = await addresses.list();
    selectedAddressId.value = addressList.value.find((a) => a.isDefault)?.id ?? addressList.value[0]?.id ?? null;
  } finally {
    loadingAddr.value = false;
  }
});

async function submit() {
  if (!canSubmit.value || !selectedAddressId.value || placing.value) return;
  placing.value = true;
  const dto: CreateErrandDto = {
    instructions: instructions.value.trim(),
    pickupText: pickupText.value.trim() || undefined,
    dropoff: { addressId: selectedAddressId.value },
    purchaseBudget: budget.value ? Math.round(Number(budget.value) * 100) : undefined,
  };
  try {
    const order = await errands.create(dto);
    toast.success('بعتنا لك مندوب');
    await navigateTo(`/orders/${order.id}`);
  } catch (err) {
    toast.error((err as ApiError).message);
  } finally {
    placing.value = false;
  }
}
</script>

<template>
  <div class="flex min-h-dvh flex-col">
    <SgTopBar title="اطلب مشوار" back />

    <div class="flex flex-1 flex-col gap-6 p-5 pb-8">
      <div class="flex flex-col gap-1">
        <h1 class="text-xl font-bold text-ink">محتاج حاجة من أي مكان؟</h1>
        <p class="text-base text-ink-soft">قولنا المطلوب، واحنا نبعتلك مندوب يجيبهولك.</p>
      </div>

      <SgInput
        v-model="instructions"
        label="إيه المطلوب؟"
        placeholder="مثلاً: علبة بانادول اكسترا من أي صيدلية"
      />

      <SgInput
        v-model="pickupText"
        label="من فين؟ (اختياري)"
        placeholder="مثلاً: صيدلية العزبي — شارع 9"
      />

      <SgInput
        v-model="budget"
        label="أقصى مبلغ للشراء (اختياري)"
        type="tel"
        inputmode="numeric"
        placeholder="مثلاً: 150"
        hint="المندوب هيشتري بحد أقصى المبلغ ده وهتدفع اللي اتصرف بالظبط."
      />

      <!-- dropoff -->
      <div class="flex flex-col gap-2">
        <h2 class="text-base font-bold text-ink">نوصّلك فين؟</h2>
        <template v-if="loadingAddr">
          <SgSkeleton variant="card" class="h-20" />
        </template>
        <template v-else-if="addressList.length">
          <SgAddressCard
            v-for="addr in addressList"
            :key="addr.id"
            :address="addr"
            selectable
            :selected="selectedAddressId === addr.id"
            @select="selectedAddressId = addr.id"
          />
          <NuxtLink to="/addresses?add=1" class="flex items-center gap-1 text-base font-semibold text-primary-700">
            <SgIcon name="plus" :size="18" /> ضيف عنوان
          </NuxtLink>
        </template>
        <SgEmptyState v-else icon="map-pin" title="مفيش عنوان محفوظ">
          <SgButton @click="navigateTo('/addresses?add=1')">ضيف عنوان</SgButton>
        </SgEmptyState>
      </div>
    </div>

    <div class="shadow-sheet fixed inset-x-0 bottom-0 z-30 mx-auto max-w-[480px] rounded-t-2xl bg-surface p-5">
      <SgButton size="xl" block :loading="placing" :disabled="!canSubmit" @click="submit">
        اطلب المندوب
      </SgButton>
    </div>
  </div>
</template>
