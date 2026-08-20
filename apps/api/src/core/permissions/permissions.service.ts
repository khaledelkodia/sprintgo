import { Injectable } from '@nestjs/common';
import { Role } from '@prisma/client';
import { WILDCARD_PERMISSION } from '@sprintgo/shared';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Resolves a user's *effective* permission set — the union of every role they
 * hold. This is the fine-grained layer on top of coarse `Role`s: SUPER_ADMIN
 * gets the `*` wildcard (satisfies any check), staff (ADMIN) get whatever their
 * assigned AppRoles grant, and everyone else gets nothing (they're gated by
 * `Role` alone). Resolved once per token issue and embedded in the JWT, so
 * request-time guards stay DB-free (docs/architecture/05 §4).
 */
@Injectable()
export class PermissionsService {
  constructor(private readonly prisma: PrismaService) {}

  async resolveForUser(user: { id: string; roles: Role[] }): Promise<string[]> {
    if (user.roles.includes(Role.SUPER_ADMIN)) return [WILDCARD_PERMISSION];
    // Only staff use the fine-grained layer; skip the query for everyone else.
    if (!user.roles.includes(Role.ADMIN)) return [];

    const rows = await this.prisma.userAppRole.findMany({
      where: { userId: user.id },
      select: { appRole: { select: { permissions: true } } },
    });

    const set = new Set<string>();
    for (const row of rows) {
      for (const key of row.appRole.permissions) {
        if (key === WILDCARD_PERMISSION) return [WILDCARD_PERMISSION];
        set.add(key);
      }
    }
    return [...set];
  }
}
