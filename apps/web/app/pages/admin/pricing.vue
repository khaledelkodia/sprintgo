<script setup lang="ts">
import { errandPricingSchema, piastersToPounds, poundsToPiasters } from '@sprintgo/shared';
import type { ApiError } from '~/composables/useApi';
import { useAdmin } from '~/features/admin/composables/useAdmin';

definePageMeta({
  layout: 'admin-dash',
  middleware: ['auth', 'role', 'permission'],
  role: ['ADMIN', 'SUPER_ADMIN'],
  permission: 'pricing.manage',
});

const admin = useAdmin();
const toast = useToast();

const pending = ref(true);
const saving = ref(false);
const form = reactive({ baseFee: '', perKmFee: '', minFee: '', commissionPercent: '', remittanceLimit: '' });
const errors = reactive<Record<string, string>>({});

async function load() {
  pending.value = true;
  try {
    const p = await admin.getErrandPricing();
    form.baseFee = String(piastersToPounds(p.baseFee));
    form.perKmFee = String(piastersToPounds(p.perKmFee));
    form.minFee = String(piastersToPounds(p.minFee));
    form.commissionPercent = String(p.commissionPercent);
    form.remittanceLimit = String(piastersToPounds(p.remittanceLimit));
  } catch (err) {
    toast.error((err as ApiError).message);
  } finally {
    pending.value = false;
  }
}
onMounted(load);

function num(v: string) {
  const n = Number(v);
  return Number.isFinite(n) ? n : NaN;
}

async function save() {
  if (saving.value) return;
  Object.keys(errors).forEach((k) => delete errors[k]);

  const base = num(form.baseFee);
  const perKm = num(form.perKmFee);
  const min = num(form.minFee);
  const commission = num(form.commissionPercent);
  const limit = num(form.remittanceLimit);

  if (!(base > 0)) errors.baseFee = 'اكتب رسوم أساسية أكبر من صفر';
  if (!(perKm >= 0)) errors.perKmFee = 'اكتب رقم صحيح';
  if (!(min >= 0)) errors.minFee = 'اكتب رقم صحيح';
  if (!(commission >= 0 && commission <= 100)) errors.commissionPercent = 'النسبة لازم تكون بين 0 و 100';
  if (!(limit >= 0)) errors.remittanceLimit = 'اكتب رقم صحيح';
  if (Object.keys(errors).length) return;

  const dto = {
    baseFee: poundsToPiasters(base),
    perKmFee: poundsToPiasters(perKm),
    minFee: poundsToPiasters(min),
    commissionPercent: commission,
    remittanceLimit: poundsToPiasters(limit),
  };
  const parsed = errandPricingSchema.safeParse(dto);
  if (!parsed.success) {
    for (const issue of parsed.error.issues) errors[issue.path[0] as string] = issue.message;
    return;
  }

  saving.value = true;
  try {
    await admin.updateErrandPricing(parsed.data);
    toast.success('اتحفظت إعدادات التسعير');
  } catch (err) {
    toast.error((err as ApiError).message);
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <div>
    <AdminPageHeader title="التسعير والعمولة" subtitle="أسعار المشاوير وحصة الإدارة من كل توصيلة" />

    <div class="max-w-2xl">
      <template v-if="pending">
        <SgSkeleton variant="card" class="h-96" />
      </template>

      <template v-else>
        <!-- explainer -->
        <div class="mb-5 flex gap-3 rounded-2xl border border-primary-100 bg-primary-50 p-4">
          <SgIcon name="info" :size="20" class="mt-0.5 shrink-0 text-primary-600" />
          <div class="text-sm leading-relaxed text-primary-800">
            سعر المشوار = <span class="font-bold">الرسوم الأساسية + (سعر الكيلو × المسافة)</span>، وبيتطبّق
            <span class="font-bold">الحد الأدنى</span> لو الحساب طلع أقل منه. نسبة العمولة هي حصة الإدارة من كل
            مشوار واللي المندوب بيوردها. لما المطلوب توريده على المندوب يوصل لحد التوريد بيتقفل لحد ما يورّد.
          </div>
        </div>

        <div class="shadow-card flex flex-col gap-5 rounded-2xl border border-line bg-surface p-6">
          <div class="grid gap-5 sm:grid-cols-3">
            <SgInput v-model="form.baseFee" label="الرسوم الأساسية (جنيه)" type="tel" inputmode="numeric" dir="ltr" placeholder="0" hint="بداية سعر أي مشوار" :error="errors.baseFee" />
            <SgInput v-model="form.perKmFee" label="سعر الكيلو (جنيه)" type="tel" inputmode="numeric" dir="ltr" placeholder="0" hint="بيتضرب في المسافة" :error="errors.perKmFee" />
            <SgInput v-model="form.minFee" label="الحد الأدنى (جنيه)" type="tel" inputmode="numeric" dir="ltr" placeholder="0" hint="أقل سعر للمشوار" :error="errors.minFee" />
          </div>

          <div class="border-t border-line pt-5">
            <div class="grid gap-5 sm:grid-cols-2">
              <SgInput v-model="form.commissionPercent" label="نسبة عمولة الإدارة (%)" type="tel" inputmode="numeric" dir="ltr" placeholder="0" hint="حصة الإدارة من كل مشوار (0 - 100)" :error="errors.commissionPercent" />
              <SgInput v-model="form.remittanceLimit" label="حد التوريد قبل القفل (جنيه)" type="tel" inputmode="numeric" dir="ltr" placeholder="0" hint="0 = بلا حد" :error="errors.remittanceLimit" />
            </div>
          </div>

          <SgButton size="xl" block :loading="saving" @click="save">حفظ الإعدادات</SgButton>
        </div>
      </template>
    </div>
  </div>
</template>
