import { Injectable } from '@nestjs/common';
import type { CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import type { MerchantPermissionKey } from '@sprintgo/shared';
import { hasMerchantPermission } from '@sprintgo/shared';
import { PrismaService } from '../../core/prisma/prisma.service';
import { DomainException } from '../errors/domain.exception';
import { STORE_PERMISSION_KEY } from '../decorators/store-permission.decorator';

/**
 * Store-scoped permission check for the merchant dashboard. Reads the required
 * `@RequireStorePermission(...)` off the handler and confirms the caller's owned
 * store grants it (`Store.managerPermissions`; empty = all). Runs a lightweight
 * store lookup so permission changes take effect immediately (no re-login).
 */
@Injectable()
export class MerchantPermissionsGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const required = this.reflector.getAllAndOverride<MerchantPermissionKey | undefined>(STORE_PERMISSION_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required) return true; // unguarded read

    const req = context.switchToHttp().getRequest<Request>();
    const user = req.user;
    if (!user) throw new DomainException('AUTH_REQUIRED', 'سجل دخولك الأول');

    const store = await this.prisma.store.findFirst({
      where: { ownerId: user.id, deletedAt: null },
      select: { managerPermissions: true },
    });
    if (!store) throw new DomainException('NOT_FOUND', 'مفيش محل مربوط بحسابك — كلّم الإدارة');

    if (!hasMerchantPermission(store.managerPermissions, required)) {
      throw new DomainException('FORBIDDEN', 'الخطوة دي مش ضمن صلاحياتك في المحل — كلّم الإدارة');
    }
    return true;
  }
}
