<script setup lang="ts">
import type { AddressView } from '@sprintgo/shared';
import { useAddresses } from '~/features/addresses/composables/useAddresses';

definePageMeta({ layout: 'customer', middleware: 'auth' });

const addresses = useAddresses();
const toast = useToast();
const route = useRoute();

const list = ref<AddressView[]>([]);
const pending = ref(true);
const formOpen = ref(false);
const editing = ref<AddressView | null>(null);
const removing = ref<AddressView | null>(null);

async function load() {
  pending.value = true;
  try {
    list.value = await addresses.list();
  } finally {
    pending.value = false;
  }
}

function openAdd() {
  editing.value = null;
  formOpen.value = true;
}
function openEdit(addr: AddressView) {
  editing.value = addr;
  formOpen.value = true;
}
async function confirmRemove() {
  if (!removing.value) return;
  try {
    await addresses.remove(removing.value.id);
    toast.success('اتحذف العنوان');
    removing.value = null;
    await load();
  } catch {
    toast.error('مش قادرين نحذف دلوقتي — جرب تاني');
  }
}

onMounted(async () => {
  await load();
  if (route.query.add === '1') openAdd();
});
</script>

<template>
  <div class="flex flex-1 flex-col">
    <SgTopBar title="عناويني">
      <template #actions>
        <SgButton size="md" @click="openAdd">+ ضيف</SgButton>
      </template>
    </SgTopBar>

    <div class="flex flex-col gap-3 p-5">
      <template v-if="pending">
        <SgSkeleton v-for="i in 3" :key="i" variant="card" class="h-24" />
      </template>

      <template v-else-if="list.length">
        <SgAddressCard
          v-for="addr in list"
          :key="addr.id"
          :address="addr"
          @edit="openEdit(addr)"
          @remove="removing = addr"
        />
      </template>

      <SgEmptyState v-else icon="map-pin" title="لسه مفيش عناوين" hint="ضيف عنوانك عشان توصلك طلباتك بسهولة.">
        <SgButton @click="openAdd">ضيف عنوان</SgButton>
      </SgEmptyState>
    </div>

    <AddressFormSheet v-model:open="formOpen" :editing="editing" @saved="load" />

    <SgDialog :open="removing !== null" title="تحذف العنوان ده؟" @update:open="(v) => { if (!v) removing = null }">
      <p class="text-base text-ink-soft">مش هتقدر ترجعه بعد الحذف.</p>
      <template #actions>
        <SgButton variant="secondary" block @click="removing = null">إلغاء</SgButton>
        <SgButton variant="danger" block @click="confirmRemove">احذف</SgButton>
      </template>
    </SgDialog>
  </div>
</template>
