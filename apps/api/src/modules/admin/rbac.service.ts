import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { Prisma, Role } from '@prisma/client';
import { PERMISSIONS, PERMISSION_GROUPS } from '@sprintgo/shared';
import type {
  AppRoleView,
  CreateRoleDto,
  CreateStaffDto,
  PermissionGroupView,
  StaffView,
  UpdateRoleDto,
} from '@sprintgo/shared';
import { PrismaService } from '../../core/prisma/prisma.service';
import { DomainException } from '../../common/errors/domain.exception';
import { hashPassword } from '../auth/password';

type RoleRow = Prisma.AppRoleGetPayload<{ include: { _count: { select: { members: true } } } }>;
type StaffRow = Prisma.UserGetPayload<{
  include: { appRoles: { include: { appRole: { select: { id: true; nameAr: true } } } } };
}>;

function toAppRoleView(r: RoleRow): AppRoleView {
  return {
    id: r.id,
    nameAr: r.nameAr,
    description: r.description,
    permissions: r.permissions,
    isSystem: r.isSystem,
    membersCount: r._count.members,
  };
}

function toStaffView(u: StaffRow): StaffView {
  return {
    id: u.id,
    name: u.name,
    phone: u.phone,
    status: u.status,
    isSuperAdmin: u.roles.includes(Role.SUPER_ADMIN),
    roles: u.appRoles.map((a) => ({ id: a.appRole.id, nameAr: a.appRole.nameAr })),
    lastLoginAt: u.lastLoginAt?.toISOString() ?? null,
  };
}

/**
 * RBAC administration: the super admin defines roles (permission bundles) and
 * distributes them to staff. The permission *catalog* is code (shared), so this
 * service only ever persists role→permission-key bundles and user→role links.
 */
@Injectable()
export class RbacService {
  constructor(private readonly prisma: PrismaService) {}

  // ─────────────── Permission catalog (read-only, from code) ───────────────

  permissionCatalog(): PermissionGroupView[] {
    return PERMISSION_GROUPS.map((group) => ({
      group,
      permissions: PERMISSIONS.filter((p) => p.group === group).map((p) => ({
        key: p.key,
        label: p.label,
      })),
    }));
  }

  // ─────────────── Roles ───────────────

  async listRoles(): Promise<AppRoleView[]> {
    const rows = await this.prisma.appRole.findMany({
      include: { _count: { select: { members: true } } },
      orderBy: { createdAt: 'asc' },
    });
    return rows.map(toAppRoleView);
  }

  async createRole(dto: CreateRoleDto): Promise<AppRoleView> {
    const role = await this.prisma.appRole.create({
      data: {
        key: `custom-${randomUUID()}`,
        nameAr: dto.nameAr,
        description: dto.description ?? null,
        permissions: dedupe(dto.permissions),
      },
      include: { _count: { select: { members: true } } },
    });
    return toAppRoleView(role);
  }

  async updateRole(id: string, dto: UpdateRoleDto): Promise<AppRoleView> {
    const role = await this.assertRole(id);
    if (role.isSystem) throw new DomainException('FORBIDDEN', 'الدور ده مقفول — مينفعش يتعدل');

    const role2 = await this.prisma.appRole.update({
      where: { id },
      data: {
        nameAr: dto.nameAr,
        description: dto.description === undefined ? undefined : dto.description,
        permissions: dto.permissions ? dedupe(dto.permissions) : undefined,
      },
      include: { _count: { select: { members: true } } },
    });
    return toAppRoleView(role2);
  }

  async deleteRole(id: string): Promise<void> {
    const role = await this.assertRole(id);
    if (role.isSystem) throw new DomainException('FORBIDDEN', 'الدور ده مقفول — مينفعش يتحذف');
    // UserAppRole rows cascade-delete; affected staff simply lose this bundle.
    await this.prisma.appRole.delete({ where: { id } });
  }

  private async assertRole(id: string) {
    const role = await this.prisma.appRole.findUnique({ where: { id } });
    if (!role) throw new DomainException('NOT_FOUND', 'الدور مش موجود');
    return role;
  }

  // ─────────────── Staff ───────────────

  async listStaff(): Promise<StaffView[]> {
    const rows = await this.prisma.user.findMany({
      where: { roles: { hasSome: [Role.ADMIN, Role.SUPER_ADMIN] } },
      include: { appRoles: { include: { appRole: { select: { id: true, nameAr: true } } } } },
      orderBy: { createdAt: 'asc' },
    });
    return rows.map(toStaffView);
  }

  async createStaff(dto: CreateStaffDto): Promise<{ id: string; phone: string; name: string | null }> {
    await this.assertRoleIds(dto.roleIds);

    try {
      const existing = await this.prisma.user.findUnique({
        where: { phone: dto.phone },
        select: { roles: true },
      });
      // Grant admin-area access while preserving any roles they already had.
      const roles = dedupeRoles([...(existing?.roles ?? [Role.CUSTOMER]), Role.ADMIN]);

      const staff = await this.prisma.user.upsert({
        where: { phone: dto.phone },
        update: {
          name: dto.name,
          passwordHash: hashPassword(dto.password),
          roles: { set: roles },
          appRoles: { deleteMany: {}, create: dto.roleIds.map((appRoleId) => ({ appRoleId })) },
        },
        create: {
          phone: dto.phone,
          name: dto.name,
          passwordHash: hashPassword(dto.password),
          roles,
          appRoles: { create: dto.roleIds.map((appRoleId) => ({ appRoleId })) },
        },
      });
      return { id: staff.id, phone: staff.phone, name: staff.name };
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        throw new DomainException('VALIDATION_ERROR', 'فيه حساب بنفس الرقم');
      }
      throw err;
    }
  }

  async setStaffRoles(userId: string, roleIds: string[]): Promise<StaffView> {
    const target = await this.assertStaff(userId);
    if (target.roles.includes(Role.SUPER_ADMIN)) {
      throw new DomainException('FORBIDDEN', 'السوبر أدمن معندهوش حدود — مفيش أدوار تتحط له');
    }
    await this.assertRoleIds(roleIds);

    await this.prisma.userAppRole.deleteMany({ where: { userId } });
    if (roleIds.length) {
      await this.prisma.userAppRole.createMany({
        data: roleIds.map((appRoleId) => ({ userId, appRoleId })),
      });
    }
    return this.getStaff(userId);
  }

  async setStaffStatus(callerId: string, userId: string, status: 'ACTIVE' | 'BLOCKED'): Promise<StaffView> {
    if (callerId === userId) throw new DomainException('FORBIDDEN', 'مينفعش توقف حسابك بنفسك');
    const target = await this.assertStaff(userId);
    if (target.roles.includes(Role.SUPER_ADMIN)) {
      throw new DomainException('FORBIDDEN', 'مينفعش توقف حساب سوبر أدمن');
    }
    await this.prisma.user.update({ where: { id: userId }, data: { status } });
    return this.getStaff(userId);
  }

  private async getStaff(userId: string): Promise<StaffView> {
    const row = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { appRoles: { include: { appRole: { select: { id: true, nameAr: true } } } } },
    });
    if (!row) throw new DomainException('NOT_FOUND', 'الموظف مش موجود');
    return toStaffView(row);
  }

  private async assertStaff(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { roles: true } });
    if (!user || !user.roles.some((r) => r === Role.ADMIN || r === Role.SUPER_ADMIN)) {
      throw new DomainException('NOT_FOUND', 'الموظف مش موجود');
    }
    return user;
  }

  private async assertRoleIds(roleIds: string[]): Promise<void> {
    if (roleIds.length === 0) return;
    const count = await this.prisma.appRole.count({ where: { id: { in: roleIds } } });
    if (count !== new Set(roleIds).size) throw new DomainException('VALIDATION_ERROR', 'فيه دور مش موجود');
  }
}

function dedupe(keys: string[]): string[] {
  return [...new Set(keys)];
}

function dedupeRoles(roles: Role[]): Role[] {
  return [...new Set(roles)];
}
