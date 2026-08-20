<script setup lang="ts">
import { createRoleSchema } from '@sprintgo/shared';
import type { AppRoleView, PermissionGroupView } from '@sprintgo/shared';
import type { ApiError } from '~/composables/useApi';
import { useRbac } from '~/features/admin/composables/useRbac';

definePageMeta({
  layout: 'admin-dash',
  middleware: ['auth', 'role', 'permission'],
  role: ['ADMIN', 'SUPER_ADMIN'],
  permission: 'roles.manage',
});

const rbac = useRbac();
const toast = useToast();

const roles = ref<AppRoleView[]>([]);
const catalog = ref<PermissionGroupView[]>([]);
const pending = ref(true);

const editorOpen = ref(false);
const editing = ref<AppRoleView | null>(null);
const form = reactive({ nameAr: '', description: '' });
const selected = ref<string[]>([]);
const saving = ref(false);
const removing = ref<AppRoleView | null>(null);

async function load() {
  try {
    [roles.value, catalog.value] = await Promise.all([rbac.listRoles(), rbac.permissionCatalog()]);
  } finally {
    pending.value = false;
  }
}
onMounted(load);

/** Human label for a permission key (for the chips on each role card). */
const labelOf = computed(() => {
  const map = new Map<string, string>();
  for (const g of catalog.value) for (const p of g.permissions) map.set(p.key, p.label);
  return (key: string) => map.get(key) ?? key;
});

function isChecked(key: string) {
  return selected.value.includes(key);
}
function togglePerm(key: string) {
  selected.value = isChecked(key) ? selected.value.filter((k) => k !== key) : [...selected.value, key];
}

function openCreate() {
  editing.value = null;
  form.nameAr = '';
  form.description = '';
  selected.value = [];
  editorOpen.value = true;
}
function openEdit(role: AppRoleView) {
  if (role.isSystem) return;
  editing.value = role;
  form.nameAr = role.nameAr;
  form.description = role.description ?? '';
  selected.value = [...role.permissions];
  editorOpen.value = true;
}

async function save() {
  const dto = {
    nameAr: form.nameAr.trim(),
    description: form.description.trim() || undefined,
    permissions: selected.value,
  };
  const parsed = createRoleSchema.safeParse(dto);
  if (!parsed.success) {
    toast.error(parsed.error.issues[0]?.message ?? 'راجع البيانات');
    return;
  }
  saving.value = true;
  try {
    if (editing.value) {
      await rbac.updateRole(editing.value.id, parsed.data);
      toast.success('اتعدّل الدور');
    } else {
      await rbac.createRole(parsed.data);
      toast.success('اتعمل الدور');
    }
    editorOpen.value = false;
    await load();
  } catch (err) {
    toast.error((err as ApiError).message);
  } finally {
    saving.value = false;
  }
}

async function confirmRemove() {
  if (!removing.value) return;
  try {
    await rbac.deleteRole(removing.value.id);
    toast.success('اتحذف الدور');
    removing.value = null;
    await load();
  } catch (err) {
    toast.error((err as ApiError).message);
  }
}
</script>

<template>
  <div>
    <AdminPageHeader title="الأدوار والصلاحيات" subtitle="اعمل أدوار ووزّع الصلاحيات على الفريق">
      <template #actions>
        <SgButton size="md" @click="openCreate">+ دور جديد</SgButton>
      </template>
    </AdminPageHeader>

    <div>
      <template v-if="pending">
        <div class="grid gap-4 sm:grid-cols-2">
          <SgSkeleton v-for="i in 4" :key="i" variant="card" class="h-40" />
        </div>
      </template>

      <div v-else class="grid gap-4 sm:grid-cols-2">
        <div
          v-for="role in roles"
          :key="role.id"
          class="shadow-card flex flex-col gap-3 rounded-xl border border-line bg-surface p-5"
        >
          <div class="flex items-start justify-between gap-2">
            <div class="flex min-w-0 flex-col">
              <div class="flex items-center gap-2">
                <span class="text-base font-bold text-ink">{{ role.nameAr }}</span>
                <span
                  v-if="role.isSystem"
                  class="rounded-full bg-surface-alt px-2 py-0.5 text-xs font-semibold text-ink-soft"
                >جاهز</span>
              </div>
              <span class="text-sm text-ink-soft">{{ role.description || '—' }}</span>
            </div>
            <div class="flex shrink-0 items-center gap-1">
              <button
                type="button"
                class="rounded-lg p-2 text-ink-soft hover:bg-surface-alt disabled:opacity-40"
                :disabled="role.isSystem"
                aria-label="تعديل"
                @click="openEdit(role)"
              >
                <SgIcon name="pencil" :size="18" />
              </button>
              <button
                type="button"
                class="rounded-lg p-2 text-ink-soft hover:bg-surface-alt disabled:opacity-40"
                :disabled="role.isSystem"
                aria-label="حذف"
                @click="removing = role"
              >
                <SgIcon name="trash" :size="18" />
              </button>
            </div>
          </div>

          <div class="flex flex-wrap gap-1.5">
            <span
              v-for="key in role.permissions"
              :key="key"
              class="rounded-full bg-primary-50 px-2.5 py-1 text-xs font-medium text-primary-700"
            >{{ labelOf(key) }}</span>
          </div>

          <div class="mt-auto border-t border-line pt-2 text-sm text-ink-soft">
            <SgIcon name="users" :size="15" class="me-1 align-[-2px]" />
            {{ role.membersCount }} في الفريق
          </div>
        </div>
      </div>
    </div>

    <!-- role editor -->
    <SgSheet v-model:open="editorOpen" :title="editing ? 'تعديل الدور' : 'دور جديد'">
      <div class="flex flex-col gap-5">
        <SgInput v-model="form.nameAr" label="اسم الدور" placeholder="مثلاً: مشرف الطلبات" />
        <SgInput v-model="form.description" label="وصف مختصر (اختياري)" placeholder="بيعمل إيه الدور ده" />

        <div class="flex flex-col gap-4">
          <p class="text-base font-semibold text-ink">الصلاحيات</p>
          <div v-for="g in catalog" :key="g.group" class="flex flex-col gap-2">
            <p class="text-sm font-bold text-ink-soft">{{ g.group }}</p>
            <button
              v-for="perm in g.permissions"
              :key="perm.key"
              type="button"
              class="flex items-center gap-3 rounded-lg border p-3 text-start"
              :class="isChecked(perm.key) ? 'border-primary-600 bg-primary-50' : 'border-line'"
              @click="togglePerm(perm.key)"
            >
              <span
                class="flex size-6 shrink-0 items-center justify-center rounded border-2"
                :class="isChecked(perm.key) ? 'border-primary-600 bg-primary-600 text-white' : 'border-line'"
              >
                <SgIcon v-if="isChecked(perm.key)" name="check" :size="16" :stroke="3" />
              </span>
              <span class="text-base font-medium text-ink">{{ perm.label }}</span>
            </button>
          </div>
        </div>

        <SgButton size="xl" block :loading="saving" @click="save">
          {{ editing ? 'حفظ التعديلات' : 'إنشاء الدور' }}
        </SgButton>
      </div>
    </SgSheet>

    <SgDialog :open="removing !== null" title="تحذف الدور؟" @update:open="(v) => { if (!v) removing = null }">
      <p class="text-base text-ink-soft">
        {{ removing?.nameAr }} — الفريق اللي معاه الدور ده هيفقد صلاحياته.
      </p>
      <template #actions>
        <SgButton variant="secondary" block @click="removing = null">إلغاء</SgButton>
        <SgButton variant="danger" block @click="confirmRemove">احذف</SgButton>
      </template>
    </SgDialog>
  </div>
</template>
