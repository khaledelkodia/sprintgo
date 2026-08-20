<script setup lang="ts">
// Design-system playground — internal review page, not linked from production nav.
const phone = ref('');
const otp = ref('');
const sheetOpen = ref(false);
const loadingDemo = ref(false);
const toast = useToast();

function demoLoading() {
  loadingDemo.value = true;
  setTimeout(() => (loadingDemo.value = false), 1500);
}

const mockOffer = {
  orderId: 'demo',
  code: 'SG-2026-000123',
  flowType: 'DELIVERY' as const,
  storeName: 'برجر بلس',
  pickupText: 'شارع 9، المعادي',
  dropoffZone: 'المعادي',
  instructions: null,
  deliveryFee: 3000,
  cashToCollect: 12000,
  distanceKm: 0.7,
  etaMins: 5,
  expiresAt: new Date(Date.now() + 25_000).toISOString(),
};
</script>

<template>
  <div class="flex flex-col gap-8 pb-16">
    <h1 class="text-2xl font-bold text-ink">معرض المكونات — SG Design System</h1>

    <section class="flex flex-col gap-3">
      <h2 class="text-xl font-bold text-ink">SgButton</h2>
      <div class="flex flex-wrap gap-3">
        <SgButton>أساسي</SgButton>
        <SgButton variant="secondary">ثانوي</SgButton>
        <SgButton variant="ghost">شفاف</SgButton>
        <SgButton variant="danger">خطر</SgButton>
      </div>
      <SgButton size="xl" block :loading="loadingDemo" @click="demoLoading">زر كبير بعرض كامل (جرّب التحميل)</SgButton>
    </section>

    <section class="flex flex-col gap-3">
      <h2 class="text-xl font-bold text-ink">SgPhoneInput</h2>
      <SgPhoneInput v-model="phone" />
    </section>

    <section class="flex flex-col gap-3">
      <h2 class="text-xl font-bold text-ink">SgOtpInput</h2>
      <SgOtpInput v-model="otp" />
    </section>

    <section class="flex flex-col gap-3">
      <h2 class="text-xl font-bold text-ink">SgSheet</h2>
      <SgButton variant="secondary" @click="sheetOpen = true">افتح الـ Bottom Sheet</SgButton>
      <SgSheet v-model:open="sheetOpen" title="تأكيد الطلب">
        <div class="flex flex-col gap-4">
          <p class="text-base text-ink-soft">ده شكل الـ Bottom Sheet اللي هيتم فيه كل خطوات الطلب.</p>
          <SgButton size="xl" block @click="sheetOpen = false">اطلب دلوقتي</SgButton>
        </div>
      </SgSheet>
    </section>

    <section class="flex flex-col gap-3">
      <h2 class="text-xl font-bold text-ink">SgToast</h2>
      <div class="flex flex-wrap gap-3">
        <SgButton variant="secondary" @click="toast.success('تم الحفظ بنجاح')">نجاح</SgButton>
        <SgButton variant="secondary" @click="toast.error('النت فصل ثانية — جرب تاني')">خطأ</SgButton>
        <SgButton variant="secondary" @click="toast.info('طلبك في الطريق إليك')">معلومة</SgButton>
      </div>
    </section>

    <section class="flex flex-col gap-3">
      <h2 class="text-xl font-bold text-ink">SgSkeleton</h2>
      <SgSkeleton variant="title" />
      <SgSkeleton variant="text" />
      <SgSkeleton variant="card" />
    </section>

    <section class="flex flex-col gap-3">
      <h2 class="text-xl font-bold text-ink">SgCourierMap (تتبّع المندوب)</h2>
      <SgCourierMap :lat="29.9626" :lng="31.2497" />
    </section>

    <section class="flex flex-col gap-3">
      <h2 class="text-xl font-bold text-ink">CourierOfferCard (عرض تلقائي)</h2>
      <CourierOfferCard :offer="mockOffer" />
    </section>
  </div>
</template>
