<script setup lang="ts">
import { useCatalog } from '~/features/catalog/composables/useCatalog';
import { useLocationStore } from '~/features/catalog/stores/location.store';
import { useAuthStore } from '~/features/auth/stores/auth.store';

definePageMeta({ layout: 'customer' });

const catalog = useCatalog();
const location = useLocationStore();
const auth = useAuthStore();

const activeVertical = ref<string | null>(null);
const zoneSheetOpen = ref(false);

// verticals rarely change → SSR-cached
const { data: serviceTypes } = await useAsyncData('service-types', () => catalog.getServiceTypes());

onMounted(async () => {
  await location.loadZones();
  if (location.needsZone) zoneSheetOpen.value = true;
});

// stores depend on the chosen zone + vertical filter
const { data: stores, pending: storesPending, refresh: refreshStores } = await useAsyncData(
  'home-stores',
  () =>
    catalog.getStores({
      zoneId: location.selectedZoneId ?? undefined,
      serviceType: activeVertical.value ?? undefined,
    }),
  { watch: [() => location.selectedZoneId, activeVertical], immediate: true },
);

function onVertical(st: { slug: string; flowType: string }) {
  // errand verticals (مشوار) open the free-form request screen, not a store list
  if (st.flowType === 'ERRAND') {
    navigateTo('/errand');
    return;
  }
  activeVertical.value = activeVertical.value === st.slug ? null : st.slug;
}
</script>

<template>
  <div class="flex flex-col">
    <!-- location header -->
    <header class="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-line bg-surface px-4">
      <button type="button" class="flex items-center gap-1.5 text-start" @click="zoneSheetOpen = true">
        <SgIcon name="map-pin" :size="20" class="text-primary-600" />
        <span class="flex flex-col leading-tight">
          <span class="text-xs text-ink-soft">التوصيل إلى</span>
          <span class="flex items-center gap-1 text-base font-bold text-ink">
            {{ location.selectedZone?.nameAr ?? 'اختار منطقتك' }}
            <SgIcon name="chevron" :size="14" class="-rotate-90 text-ink-soft" />
          </span>
        </span>
      </button>
      <div class="flex items-center gap-1">
        <SgNotificationBell v-if="auth.isLoggedIn" />
        <span class="text-lg font-bold text-primary-700">سبرنت جو</span>
      </div>
    </header>

    <main class="flex flex-col gap-6 p-5 pb-24">
      <!-- verticals -->
      <section>
        <div class="grid grid-cols-3 gap-3">
          <template v-if="serviceTypes">
            <SgServiceCard
              v-for="st in serviceTypes"
              :key="st.id"
              :name-ar="st.nameAr"
              :icon="st.icon"
              :active="activeVertical === st.slug"
              @click="onVertical(st)"
            />
          </template>
          <template v-else>
            <SgSkeleton v-for="i in 6" :key="i" variant="card" class="h-24" />
          </template>
        </div>
      </section>

      <!-- stores -->
      <section class="flex flex-col gap-3">
        <h2 class="text-xl font-bold text-ink">
          {{ activeVertical ? serviceTypes?.find((s) => s.slug === activeVertical)?.nameAr : 'كل المحلات' }}
        </h2>

        <template v-if="storesPending">
          <SgSkeleton v-for="i in 4" :key="i" variant="card" class="h-20" />
        </template>

        <template v-else-if="stores && stores.length">
          <SgStoreCard
            v-for="store in stores"
            :key="store.id"
            :store="store"
            @click="store.isOpenNow && navigateTo(`/s/${store.slug}`)"
          />
        </template>

        <SgEmptyState
          v-else
          icon="search"
          title="مفيش محلات في منطقتك دلوقتي"
          hint="جرب منطقة تانية أو قسم مختلف — بنضيف محلات جديدة كل يوم."
        >
          <SgButton variant="secondary" @click="zoneSheetOpen = true">غيّر المنطقة</SgButton>
        </SgEmptyState>
      </section>
    </main>

    <ZonePickerSheet v-model:open="zoneSheetOpen" @update:open="!$event && refreshStores()" />
  </div>
</template>
