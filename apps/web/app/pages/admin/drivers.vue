<script setup lang="ts">
import {
  displayPhone,
  formatMoney,
  isValidEgyptianPhone,
  poundsToPiasters,
  recordRemittanceSchema,
  VEHICLES,
} from '@sprintgo/shared';
import type { CourierDailyReportRow, DriverSettlementRow, VehicleType } from '@sprintgo/shared';
import type { ApiError } from '~/composables/useApi';
import { useAdmin } from '~/features/admin/composables/useAdmin';
import { useAuthStore } from '~/features/auth/stores/auth.store';

definePageMeta({
  layout: 'admin-dash',
  middleware: ['auth', 'role', 'permission'],
  role: ['ADMIN', 'SUPER_ADMIN'],
  permission: 'drivers.view',
});

const admin = useAdmin();
const auth = useAuthStore();
const toast = useToast();

const canManage = computed(() => auth.can('drivers.manage'));

const rows = ref<DriverSettlementRow[]>([]);
const pending = ref(true);

async function load() {
  pending.value = true;
  try {
    rows.value = await admin.driverSettlements();
  } finally {
    pending.value = false;
  }
}
onMounted(load);

const totalDue = computed(() => rows.value.reduce((sum, r) => sum + r.balanceDue, 0));

function fmtDate(iso: string | null) {
  if (!iso) return 'لسه مفيش';
  return new Intl.DateTimeFormat('ar-EG', { day: 'numeric', month: 'short' }).format(new Date(iso));
}

// ── add a new driver ──────────────────────────────────────────────
const addOpen = ref(false);
const addForm = reactive({ name: '', phone: '', vehicleType: 'MOTORCYCLE' as VehicleType });
const adding = ref(false);
const canAdd = computed(() => addForm.name.trim().length >= 2 && isValidEgyptianPhone(addForm.phone));

function openAdd() {
  addForm.name = '';
  addForm.vehicleType = 'MOTORCYCLE';
  addForm.phone = '';
  addOpen.value = true;
}

async function addDriver() {
  if (!canAdd.value || adding.value) return;
  adding.value = true;
  try {
    await admin.createDriver({ name: addForm.name.trim(), phone: addForm.phone.trim(), vehicleType: addForm.vehicleType });
    toast.success('اتضاف السائق');
    addOpen.value = false;
    await load();
  } catch (err) {
    toast.error((err as ApiError).message);
  } finally {
    adding.value = false;
  }
}

/** Change what a courier drives — نقل orders only reach the matching vehicle. */
async function changeVehicle(d: DriverSettlementRow, vehicleType: VehicleType) {
  if (d.vehicleType === vehicleType) return;
  const previous = d.vehicleType;
  d.vehicleType = vehicleType; // optimistic — the select already moved
  try {
    await admin.setDriverVehicle(d.id, vehicleType);
    toast.success(`${d.name ?? 'المندوب'} بقى على ${VEHICLES.find((v) => v.type === vehicleType)?.labelAr}`);
  } catch (err) {
    d.vehicleType = previous;
    toast.error((err as ApiError).message);
  }
}

// ── record a cash hand-in (توريد) ─────────────────────────────────
const remitOpen = ref(false);
const remitTarget = ref<DriverSettlementRow | null>(null);
const remitForm = reactive({ amount: '', note: '' });
const remitErrors = reactive<Record<string, string>>({});
const remitting = ref(false);

function openRemit(row: DriverSettlementRow) {
  remitTarget.value = row;
  remitForm.amount = '';
  remitForm.note = '';
  Object.keys(remitErrors).forEach((k) => delete remitErrors[k]);
  remitOpen.value = true;
}

async function submitRemit() {
  if (!remitTarget.value || remitting.value) return;
  Object.keys(remitErrors).forEach((k) => delete remitErrors[k]);
  const pounds = Number(remitForm.amount);
  if (!Number.isFinite(pounds) || pounds <= 0) {
    remitErrors.amount = 'اكتب مبلغ صحيح بالجنيه';
    return;
  }
  const dto = { amount: poundsToPiasters(pounds), note: remitForm.note.trim() || undefined };
  const parsed = recordRemittanceSchema.safeParse(dto);
  if (!parsed.success) {
    for (const issue of parsed.error.issues) remitErrors[issue.path[0] as string] = issue.message;
    return;
  }
  remitting.value = true;
  try {
    await admin.recordRemittance(remitTarget.value.id, parsed.data.amount, parsed.data.note);
    toast.success('اتسجّل التوريد');
    remitOpen.value = false;
    await load();
  } catch (err) {
    toast.error((err as ApiError).message);
  } finally {
    remitting.value = false;
  }
}

// ── suspend / reactivate a courier ────────────────────────────────
const confirmOpen = ref(false);
const confirmTarget = ref<DriverSettlementRow | null>(null);
const confirmBusy = ref(false);
const confirmIsBlock = computed(() => confirmTarget.value?.status === 'ACTIVE');

function askToggle(row: DriverSettlementRow) {
  confirmTarget.value = row;
  confirmOpen.value = true;
}

async function confirmToggle() {
  const t = confirmTarget.value;
  if (!t || confirmBusy.value) return;
  confirmBusy.value = true;
  try {
    if (t.status === 'ACTIVE') await admin.blockDriver(t.id);
    else await admin.activateDriver(t.id);
    toast.success(t.status === 'ACTIVE' ? 'تم إيقاف السائق' : 'تم تفعيل السائق');
    confirmOpen.value = false;
    await load();
  } catch (err) {
    toast.error((err as ApiError).message);
  } finally {
    confirmBusy.value = false;
  }
}

// ── daily report per courier (read — آخر أسبوع أو شهر كامل) ─────────
const reportOpen = ref(false);
const reportTarget = ref<DriverSettlementRow | null>(null);
const reportRows = ref<CourierDailyReportRow[]>([]);
const reportPending = ref(false);
const reportMonth = ref<string | null>(null); // null = آخر أسبوع

// آخر ٣ شهور: الشهر الحالي + اللي قبله — { value: 'YYYY-MM', label: اسم الشهر بالعربي }
const monthChips = computed(() => {
  const now = new Date();
  return Array.from({ length: 3 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    return { value, label: d.toLocaleDateString('ar-EG', { month: 'long' }) };
  });
});

function fmtReportDate(date: string) {
  return new Date(`${date}T00:00:00`).toLocaleDateString('ar-EG', { weekday: 'long', day: 'numeric', month: 'long' });
}

async function loadReport() {
  const t = reportTarget.value;
  if (!t) return;
  reportPending.value = true;
  try {
    reportRows.value = await admin.driverReport(t.id, reportMonth.value ?? undefined);
  } catch (err) {
    toast.error((err as ApiError).message);
    reportRows.value = [];
  } finally {
    reportPending.value = false;
  }
}

function openReport(row: DriverSettlementRow) {
  reportTarget.value = row;
  reportMonth.value = null;
  reportRows.value = [];
  reportOpen.value = true;
  loadReport();
}

function selectReportMonth(month: string | null) {
  if (reportPending.value || reportMonth.value === month) return;
  reportMonth.value = month;
  loadReport();
}
</script>

<template>
  <div>
    <AdminPageHeader title="السواقين والتسويات" :subtitle="`${rows.length} سائق · المطلوب توريده ${formatMoney(totalDue)}`">
      <template #actions>
        <SgButton v-if="canManage" @click="openAdd"><SgIcon name="plus" :size="18" /> سائق</SgButton>
      </template>
    </AdminPageHeader>

    <template v-if="pending">
      <div class="flex flex-col gap-2">
        <SgSkeleton v-for="i in 4" :key="i" variant="card" class="h-16" />
      </div>
    </template>

    <template v-else>
      <section v-if="rows.length" class="shadow-card overflow-hidden rounded-2xl border border-line bg-surface">
        <!-- desktop table -->
        <div class="hidden md:block">
          <table class="w-full text-start">
            <thead>
              <tr class="border-b border-line text-sm text-ink-soft">
                <th class="px-5 py-3 text-start font-semibold">المندوب</th>
                <th class="px-5 py-3 text-start font-semibold">الرقم</th>
                <th class="px-5 py-3 text-start font-semibold">العربية</th>
                <th class="px-5 py-3 text-start font-semibold">الحالة</th>
                <th class="px-5 py-3 text-start font-semibold">التوصيلات</th>
                <th class="px-5 py-3 text-start font-semibold">المطلوب توريده</th>
                <th class="px-5 py-3 text-start font-semibold">إجمالي المورّد</th>
                <th class="px-5 py-3 text-start font-semibold">آخر توريد</th>
                <th class="px-5 py-3 text-end font-semibold">الإجراءات</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-line">
              <tr v-for="d in rows" :key="d.id" class="transition-colors hover:bg-surface-alt">
                <td class="px-5 py-3.5">
                  <div class="flex items-center gap-2">
                    <span
                      class="size-2 shrink-0 rounded-full"
                      :class="d.isAvailable ? 'bg-success-600' : 'bg-ink-muted'"
                      :title="d.isAvailable ? 'متاح دلوقتي' : 'مش متصل'"
                    />
                    <span class="font-bold text-ink">{{ d.name ?? '—' }}</span>
                  </div>
                </td>
                <td class="px-5 py-3.5" dir="ltr"><span class="text-ink-soft">{{ displayPhone(d.phone) }}</span></td>
                <td class="px-5 py-3.5">
                  <select
                    class="rounded-lg border border-line bg-surface px-2 py-1.5 text-sm font-bold text-ink"
                    :value="d.vehicleType"
                    @change="changeVehicle(d, ($event.target as HTMLSelectElement).value as VehicleType)"
                  >
                    <option v-for="v in VEHICLES" :key="v.type" :value="v.type">{{ v.labelAr }}</option>
                  </select>
                </td>
                <td class="px-5 py-3.5">
                  <span
                    class="rounded-full px-3 py-1 text-xs font-bold"
                    :class="d.status === 'ACTIVE' ? 'bg-success-50 text-success-700' : 'bg-danger-50 text-danger-600'"
                  >
                    {{ d.status === 'ACTIVE' ? 'نشط' : 'موقوف' }}
                  </span>
                </td>
                <td class="px-5 py-3.5 font-bold text-ink">{{ d.deliveries }}</td>
                <td class="px-5 py-3.5">
                  <span class="text-base font-extrabold" :class="d.balanceDue > 0 ? 'text-warning-600' : 'text-ink-soft'">
                    {{ formatMoney(d.balanceDue) }}
                  </span>
                </td>
                <td class="px-5 py-3.5 text-ink-soft">{{ formatMoney(d.totalRemitted) }}</td>
                <td class="px-5 py-3.5 text-ink-soft">{{ fmtDate(d.lastRemittanceAt) }}</td>
                <td class="px-5 py-3.5">
                  <div class="flex items-center justify-end gap-2">
                    <button
                      type="button"
                      class="rounded-lg border border-line px-3 py-1.5 text-sm font-bold text-ink-soft transition-colors hover:bg-surface-alt"
                      @click="openReport(d)"
                    >
                      التقرير
                    </button>
                    <template v-if="canManage">
                      <button
                        type="button"
                        class="rounded-lg border border-primary-600 px-3 py-1.5 text-sm font-bold text-primary-700 transition-colors hover:bg-primary-50"
                        @click="openRemit(d)"
                      >
                        سجّل توريد
                      </button>
                      <button
                        type="button"
                        class="rounded-lg border px-3 py-1.5 text-sm font-bold transition-colors"
                        :class="d.status === 'ACTIVE'
                          ? 'border-danger-600 text-danger-600 hover:bg-danger-50'
                          : 'border-line text-ink-soft hover:bg-surface-alt'"
                        @click="askToggle(d)"
                      >
                        {{ d.status === 'ACTIVE' ? 'إيقاف' : 'تفعيل' }}
                      </button>
                    </template>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- mobile cards -->
        <div class="divide-y divide-line md:hidden">
          <div v-for="d in rows" :key="d.id" class="flex flex-col gap-3 px-5 py-4">
            <div class="flex items-center gap-3">
              <span class="size-2 shrink-0 rounded-full" :class="d.isAvailable ? 'bg-success-600' : 'bg-ink-muted'" />
              <div class="min-w-0 flex-1">
                <div class="truncate font-bold text-ink">{{ d.name ?? '—' }}</div>
                <div class="text-sm text-ink-soft" dir="ltr">{{ displayPhone(d.phone) }}</div>
              </div>
              <span
                class="shrink-0 rounded-full px-3 py-1 text-xs font-bold"
                :class="d.status === 'ACTIVE' ? 'bg-success-50 text-success-700' : 'bg-danger-50 text-danger-600'"
              >
                {{ d.status === 'ACTIVE' ? 'نشط' : 'موقوف' }}
              </span>
            </div>

            <div class="flex items-center justify-between rounded-xl bg-surface-alt px-4 py-3">
              <span class="text-sm text-ink-soft">المطلوب توريده</span>
              <span class="text-lg font-extrabold" :class="d.balanceDue > 0 ? 'text-warning-600' : 'text-ink-soft'">
                {{ formatMoney(d.balanceDue) }}
              </span>
            </div>

            <div class="flex items-center gap-4 text-sm text-ink-soft">
              <span>{{ d.deliveries }} توصيلة</span>
              <span>مورّد: {{ formatMoney(d.totalRemitted) }}</span>
              <span>آخر توريد: {{ fmtDate(d.lastRemittanceAt) }}</span>
            </div>

            <div class="flex items-center gap-2">
              <button
                type="button"
                class="flex-1 rounded-lg border border-line px-3 py-2 text-sm font-bold text-ink-soft"
                @click="openReport(d)"
              >
                التقرير
              </button>
              <template v-if="canManage">
                <button
                  type="button"
                  class="flex-1 rounded-lg border border-primary-600 px-3 py-2 text-sm font-bold text-primary-700"
                  @click="openRemit(d)"
                >
                  سجّل توريد
                </button>
                <button
                  type="button"
                  class="flex-1 rounded-lg border px-3 py-2 text-sm font-bold"
                  :class="d.status === 'ACTIVE' ? 'border-danger-600 text-danger-600' : 'border-line text-ink-soft'"
                  @click="askToggle(d)"
                >
                  {{ d.status === 'ACTIVE' ? 'إيقاف' : 'تفعيل' }}
                </button>
              </template>
            </div>
          </div>
        </div>
      </section>

      <SgEmptyState v-else icon="bike" title="مفيش سواقين" hint="ابدأ بإضافة أول سائق.">
        <SgButton v-if="canManage" @click="openAdd">+ سائق</SgButton>
      </SgEmptyState>
    </template>

    <!-- add driver -->
    <SgSheet v-model:open="addOpen" title="سائق جديد">
      <div class="flex flex-col gap-4">
        <SgInput v-model="addForm.name" label="اسم السائق" placeholder="الاسم" />
        <SgInput v-model="addForm.phone" label="رقم الموبايل" type="tel" inputmode="tel" dir="ltr" placeholder="01XXXXXXXXX" hint="بيدخل بالكود على الموبايل (بدون باسورد)" />
        <div>
          <label class="mb-2 block text-sm font-bold text-ink-soft">بيسوق إيه؟</label>
          <div class="grid grid-cols-2 gap-2">
            <button
              v-for="v in VEHICLES"
              :key="v.type"
              type="button"
              class="rounded-xl border px-3 py-2.5 text-start transition-colors"
              :class="addForm.vehicleType === v.type ? 'border-primary-600 bg-primary-50' : 'border-line hover:bg-surface-alt'"
              @click="addForm.vehicleType = v.type"
            >
              <span class="block text-sm font-bold text-ink">{{ v.labelAr }}</span>
              <span class="block text-xs text-ink-muted">{{ v.hintAr }}</span>
            </button>
          </div>
          <p class="mt-2 text-xs leading-relaxed text-ink-muted">طلبات النقل بتروح للسواق اللي معاه العربية المطلوبة بس.</p>
        </div>
        <SgButton size="xl" block :loading="adding" :disabled="!canAdd" @click="addDriver">إضافة السائق</SgButton>
      </div>
    </SgSheet>

    <!-- record remittance -->
    <SgSheet v-model:open="remitOpen" title="تسجيل توريد">
      <div class="flex flex-col gap-4">
        <div v-if="remitTarget" class="rounded-xl bg-surface-alt px-4 py-3">
          <div class="font-bold text-ink">{{ remitTarget.name ?? 'السائق' }}</div>
          <div class="mt-1 text-sm text-ink-soft">
            المطلوب توريده حاليًا:
            <span class="font-bold" :class="remitTarget.balanceDue > 0 ? 'text-warning-600' : 'text-ink-soft'">{{ formatMoney(remitTarget.balanceDue) }}</span>
          </div>
        </div>
        <SgInput
          v-model="remitForm.amount"
          label="المبلغ اللي استلمته (بالجنيه)"
          type="tel"
          inputmode="numeric"
          dir="ltr"
          placeholder="0"
          :error="remitErrors.amount"
        />
        <SgInput v-model="remitForm.note" label="ملاحظة (اختياري)" placeholder="مثلاً: توريد نص اليوم" :error="remitErrors.note" />
        <p class="text-sm text-ink-soft">هيتخصم المبلغ من المطلوب توريده على السائق فورًا.</p>
        <SgButton size="xl" block :loading="remitting" @click="submitRemit">تأكيد التوريد</SgButton>
      </div>
    </SgSheet>

    <!-- suspend / reactivate confirm -->
    <SgDialog v-model:open="confirmOpen" :title="confirmIsBlock ? 'إيقاف السائق؟' : 'تفعيل السائق؟'">
      <p class="text-ink-soft">
        <template v-if="confirmIsBlock">
          السائق «{{ confirmTarget?.name ?? '—' }}» مش هيقدر يشتغل أونلاين ولا يستلم طلبات لحد ما تفعّله تاني.
        </template>
        <template v-else>
          هيرجع السائق «{{ confirmTarget?.name ?? '—' }}» يشتغل ويستلم طلبات عادي.
        </template>
      </p>
      <template #actions>
        <button
          type="button"
          class="h-12 flex-1 rounded-md border border-line bg-surface font-semibold text-ink hover:bg-surface-alt"
          @click="confirmOpen = false"
        >
          إلغاء
        </button>
        <SgButton :variant="confirmIsBlock ? 'danger' : 'primary'" :loading="confirmBusy" class="flex-1" @click="confirmToggle">
          {{ confirmIsBlock ? 'إيقاف' : 'تفعيل' }}
        </SgButton>
      </template>
    </SgDialog>

    <!-- courier daily report -->
    <SgSheet v-model:open="reportOpen" :title="reportTarget ? `تقرير ${reportTarget.name ?? 'المندوب'}` : 'التقرير'">
      <div class="flex flex-col gap-4">
        <!-- period filter -->
        <div class="flex flex-wrap gap-2">
          <button
            type="button"
            class="rounded-full border px-4 py-1.5 text-sm font-bold transition-colors"
            :class="reportMonth === null
              ? 'border-primary-600 bg-primary-600 text-white'
              : 'border-line bg-surface text-ink-soft hover:bg-surface-alt'"
            @click="selectReportMonth(null)"
          >
            آخر أسبوع
          </button>
          <button
            v-for="m in monthChips"
            :key="m.value"
            type="button"
            class="rounded-full border px-4 py-1.5 text-sm font-bold transition-colors"
            :class="reportMonth === m.value
              ? 'border-primary-600 bg-primary-600 text-white'
              : 'border-line bg-surface text-ink-soft hover:bg-surface-alt'"
            @click="selectReportMonth(m.value)"
          >
            {{ m.label }}
          </button>
        </div>

        <!-- loading -->
        <div v-if="reportPending" class="flex flex-col gap-2">
          <SgSkeleton v-for="i in 4" :key="i" variant="card" class="h-20" />
        </div>

        <!-- days -->
        <div v-else-if="reportRows.length" class="-mx-1 flex max-h-[58vh] flex-col gap-2 overflow-y-auto px-1">
          <div v-for="r in reportRows" :key="r.date" class="rounded-xl border border-line bg-surface-alt/60 px-4 py-3">
            <div class="flex items-center justify-between gap-2">
              <span class="font-bold text-ink">{{ fmtReportDate(r.date) }}</span>
              <span class="shrink-0 text-sm font-semibold text-ink-soft">{{ r.deliveries }} توصيلة</span>
            </div>
            <div class="mt-3 grid grid-cols-3 gap-2 text-center">
              <div class="rounded-lg bg-surface px-2 py-2">
                <div class="text-xs text-ink-soft">مكسب المندوب</div>
                <div class="mt-0.5 font-bold text-ink">{{ formatMoney(r.earnings) }}</div>
              </div>
              <div class="rounded-lg bg-surface px-2 py-2">
                <div class="text-xs text-ink-soft">المطلوب توريده</div>
                <div class="mt-0.5 font-bold text-warning-600">{{ formatMoney(r.dues) }}</div>
              </div>
              <div class="rounded-lg bg-surface px-2 py-2">
                <div class="text-xs text-ink-soft">اللي ورّده</div>
                <div class="mt-0.5 font-bold text-ink">{{ formatMoney(r.remitted) }}</div>
              </div>
            </div>
          </div>
        </div>

        <!-- empty -->
        <SgEmptyState v-else icon="package" title="مفيش شغل في الفترة دي" hint="جرّب فترة تانية من فوق." />
      </div>
    </SgSheet>
  </div>
</template>
