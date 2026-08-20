<script setup lang="ts">
import { createStaffSchema, displayPhone } from '@sprintgo/shared';
import type { AppRoleView, StaffView } from '@sprintgo/shared';
import type { ApiError } from '~/composables/useApi';
import { useAuthStore } from '~/features/auth/stores/auth.store';
import { useRbac } from '~/features/admin/composables/useRbac';

definePageMeta({
  layout: 'admin-dash',
  middleware: ['auth', 'role', 'permission'],
  role: ['ADMIN', 'SUPER_ADMIN'],
  permission: 'team.view',
});

const rbac = useRbac();
const auth = useAuthStore();
const toast = useToast();

const staff = ref<StaffView[]>([]);
const roles = ref<AppRoleView[]>([]);
const pending = ref(true);
const canManage = computed(() => auth.can('team.manage'));

async function load() {
  try {
    [staff.value, roles.value] = await Promise.all([rbac.listStaff(), rbac.listRoles()]);
  } finally {
    pending.value = false;
  }
}
onMounted(load);

// ── create staff ──
const createOpen = ref(false);
const form = reactive({ name: '', phone: '', password: '' });
const createRoleIds = ref<string[]>([]);
const saving = ref(false);

function openCreate() {
  form.name = '';
  form.phone = '';
  form.password = '';
  createRoleIds.value = [];
  createOpen.value = true;
}

async function createStaff() {
  const dto = {
    name: form.name.trim(),
    phone: form.phone.trim(),
    password: form.password,
    roleIds: createRoleIds.value,
  };
  const parsed = createStaffSchema.safeParse(dto);
  if (!parsed.success) {
    toast.error(parsed.error.issues[0]?.message ?? 'راجع البيانات');
    return;
  }
  saving.value = true;
  try {
    await rbac.createStaff(parsed.data);
    toast.success('اتعمل الموظف — يدخل برقمه والباسورد');
    createOpen.value = false;
    await load();
  } catch (err) {
    toast.error((err as ApiError).message);
  } finally {
    saving.value = false;
  }
}

// ── edit a staff member's roles ──
const editing = ref<StaffView | null>(null);
const editRoleIds = ref<string[]>([]);
const savingRoles = ref(false);

function openEditRoles(member: StaffView) {
  editing.value = member;
  editRoleIds.value = member.roles.map((r) => r.id);
}
async function saveRoles() {
  if (!editing.value) return;
  savingRoles.value = true;
  try {
    await rbac.setStaffRoles(editing.value.id, editRoleIds.value);
    toast.success('اتحدّثت الأدوار');
    editing.value = null;
    await load();
  } catch (err) {
    toast.error((err as ApiError).message);
  } finally {
    savingRoles.value = false;
  }
}

async function toggleStatus(member: StaffView) {
  const action = member.status === 'ACTIVE' ? 'suspend' : 'activate';
  try {
    await rbac.setStaffStatus(member.id, action);
    await load();
  } catch (err) {
    toast.error((err as ApiError).message);
  }
}

function toggleCreateRole(id: string) {
  createRoleIds.value = createRoleIds.value.includes(id)
    ? createRoleIds.value.filter((x) => x !== id)
    : [...createRoleIds.value, id];
}
function toggleEditRole(id: string) {
  editRoleIds.value = editRoleIds.value.includes(id)
    ? editRoleIds.value.filter((x) => x !== id)
    : [...editRoleIds.value, id];
}
</script>

<template>
  <div>
    <AdminPageHeader title="الفريق" subtitle="أعضاء الإدارة والصلاحيات بتاعتهم">
      <template #actions>
        <SgButton v-if="canManage" size="md" @click="openCreate">+ موظف جديد</SgButton>
      </template>
    </AdminPageHeader>

    <div>
      <template v-if="pending">
        <SgSkeleton v-for="i in 3" :key="i" variant="card" class="mb-3 h-24" />
      </template>

      <div v-else class="flex flex-col gap-3">
        <div
          v-for="member in staff"
          :key="member.id"
          class="shadow-card flex flex-wrap items-center gap-4 rounded-xl border border-line bg-surface p-4"
        >
          <div class="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary-50 text-primary-700">
            <SgIcon name="user" :size="22" />
          </div>

          <div class="flex min-w-0 flex-1 flex-col">
            <div class="flex items-center gap-2">
              <span class="truncate text-base font-bold text-ink">{{ member.name ?? '—' }}</span>
              <span
                v-if="member.isSuperAdmin"
                class="rounded-full bg-primary-600 px-2 py-0.5 text-xs font-semibold text-white"
              >سوبر أدمن</span>
              <span
                v-else-if="member.status !== 'ACTIVE'"
                class="rounded-full bg-danger-600/10 px-2 py-0.5 text-xs font-semibold text-danger-600"
              >موقوف</span>
            </div>
            <span dir="ltr" class="text-sm text-ink-soft">{{ displayPhone(member.phone) }}</span>
            <div v-if="!member.isSuperAdmin" class="mt-1.5 flex flex-wrap gap-1.5">
              <span
                v-for="r in member.roles"
                :key="r.id"
                class="rounded-full bg-surface-alt px-2.5 py-0.5 text-xs font-medium text-ink-soft"
              >{{ r.nameAr }}</span>
              <span v-if="member.roles.length === 0" class="text-xs text-ink-soft">مفيش أدوار متعيّنة</span>
            </div>
          </div>

          <div v-if="canManage && !member.isSuperAdmin" class="flex shrink-0 items-center gap-2">
            <SgButton variant="secondary" size="md" @click="openEditRoles(member)">الأدوار</SgButton>
            <button
              type="button"
              class="h-12 rounded-md border px-4 text-base font-semibold"
              :class="member.status === 'ACTIVE' ? 'border-danger-600 text-danger-600' : 'border-success-600 text-success-600'"
              @click="toggleStatus(member)"
            >
              {{ member.status === 'ACTIVE' ? 'إيقاف' : 'تفعيل' }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- create staff -->
    <SgSheet v-model:open="createOpen" title="موظف جديد">
      <div class="flex flex-col gap-5">
        <SgInput v-model="form.name" label="اسم الموظف" placeholder="الاسم" />
        <SgInput v-model="form.phone" label="رقم الدخول" type="tel" inputmode="tel" dir="ltr" placeholder="01XXXXXXXXX" />
        <SgInput v-model="form.password" label="الباسورد" type="text" placeholder="6 حروف على الأقل" />

        <div class="flex flex-col gap-2">
          <p class="text-base font-semibold text-ink">الأدوار</p>
          <p v-if="roles.length === 0" class="text-sm text-ink-soft">
            اعمل دور الأول من صفحة الأدوار.
          </p>
          <button
            v-for="role in roles"
            :key="role.id"
            type="button"
            class="flex items-center gap-3 rounded-lg border p-3 text-start"
            :class="createRoleIds.includes(role.id) ? 'border-primary-600 bg-primary-50' : 'border-line'"
            @click="toggleCreateRole(role.id)"
          >
            <span
              class="flex size-6 shrink-0 items-center justify-center rounded border-2"
              :class="createRoleIds.includes(role.id) ? 'border-primary-600 bg-primary-600 text-white' : 'border-line'"
            >
              <SgIcon v-if="createRoleIds.includes(role.id)" name="check" :size="16" :stroke="3" />
            </span>
            <span class="flex flex-col">
              <span class="text-base font-semibold text-ink">{{ role.nameAr }}</span>
              <span class="text-xs text-ink-soft">{{ role.description || '—' }}</span>
            </span>
          </button>
        </div>

        <SgButton size="xl" block :loading="saving" @click="createStaff">إنشاء الموظف</SgButton>
      </div>
    </SgSheet>

    <!-- edit roles -->
    <SgSheet
      :open="editing !== null"
      :title="`أدوار ${editing?.name ?? 'الموظف'}`"
      @update:open="(v) => { if (!v) editing = null }"
    >
      <div class="flex flex-col gap-5">
        <button
          v-for="role in roles"
          :key="role.id"
          type="button"
          class="flex items-center gap-3 rounded-lg border p-3 text-start"
          :class="editRoleIds.includes(role.id) ? 'border-primary-600 bg-primary-50' : 'border-line'"
          @click="toggleEditRole(role.id)"
        >
          <span
            class="flex size-6 shrink-0 items-center justify-center rounded border-2"
            :class="editRoleIds.includes(role.id) ? 'border-primary-600 bg-primary-600 text-white' : 'border-line'"
          >
            <SgIcon v-if="editRoleIds.includes(role.id)" name="check" :size="16" :stroke="3" />
          </span>
          <span class="flex flex-col">
            <span class="text-base font-semibold text-ink">{{ role.nameAr }}</span>
            <span class="text-xs text-ink-soft">{{ role.description || '—' }}</span>
          </span>
        </button>
        <SgButton size="xl" block :loading="savingRoles" @click="saveRoles">حفظ الأدوار</SgButton>
      </div>
    </SgSheet>
  </div>
</template>
