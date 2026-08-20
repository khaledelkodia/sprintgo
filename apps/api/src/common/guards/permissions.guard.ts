import { Injectable } from '@nestjs/common';
import type { CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import type { PermissionKey } from '@sprintgo/shared';
import { hasPermission } from '@sprintgo/shared';
import { DomainException } from '../errors/domain.exception';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';

/**
 * Fine-grained permission check — reads the caller's effective permissions off
 * the JWT (populated by JwtAuthGuard) and requires ALL of the handler's
 * `@RequirePermissions(...)`. The wildcard `*` (SUPER_ADMIN) satisfies any.
 * Runs DB-free; permission changes propagate on the next token refresh.
 */
@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<PermissionKey[] | undefined>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required || required.length === 0) return true;

    const req = context.switchToHttp().getRequest<Request>();
    const user = req.user;
    if (!user) throw new DomainException('AUTH_REQUIRED', 'سجل دخولك الأول');

    const granted = user.perms ?? [];
    if (!required.every((perm) => hasPermission(granted, perm))) {
      throw new DomainException('FORBIDDEN', 'الخطوة دي مش ضمن صلاحياتك — كلّم الإدارة');
    }
    return true;
  }
}
