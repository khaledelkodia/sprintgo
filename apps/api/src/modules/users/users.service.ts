import { Injectable } from '@nestjs/common';
import type { User } from '@prisma/client';
import type { PublicUser, UpdateMeDto } from '@sprintgo/shared';
import { PrismaService } from '../../core/prisma/prisma.service';

/**
 * The only user shape allowed out of the API. `perms` is the caller's resolved
 * permission set (empty for non-staff / when not yet resolved).
 */
export function toPublicUser(user: User, perms: string[] = []): PublicUser {
  return {
    id: user.id,
    phone: user.phone,
    name: user.name,
    roles: user.roles,
    status: user.status,
    language: user.language,
    perms,
  };
}

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  findById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { id } });
  }

  findByPhone(phone: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { phone } });
  }

  /** First OTP login auto-registers as CUSTOMER (docs/architecture/05 §2). */
  async upsertByPhone(phone: string): Promise<{ user: User; isNew: boolean }> {
    const existing = await this.prisma.user.findUnique({ where: { phone } });
    if (existing) return { user: existing, isNew: false };
    const user = await this.prisma.user.create({ data: { phone } });
    return { user, isNew: true };
  }

  async touchLogin(id: string): Promise<void> {
    await this.prisma.user.update({ where: { id }, data: { lastLoginAt: new Date() } });
  }

  updateMe(id: string, dto: UpdateMeDto): Promise<User> {
    return this.prisma.user.update({ where: { id }, data: dto });
  }
}
