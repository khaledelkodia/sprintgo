import { Injectable } from '@nestjs/common';
import type { CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import type { Role } from '@sprintgo/shared';
import { DomainException } from '../errors/domain.exception';
import { ROLES_KEY } from '../decorators/roles.decorator';

/** Coarse role check — layer 2 of 3 (docs/architecture/05 §4). */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<Role[] | undefined>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required || required.length === 0) return true;

    const req = context.switchToHttp().getRequest<Request>();
    const user = req.user;
    if (!user) throw new DomainException('AUTH_REQUIRED', 'سجل دخولك الأول');
    if (!user.roles.some((role) => required.includes(role))) {
      throw new DomainException('FORBIDDEN', 'الخطوة دي مش ضمن صلاحياتك');
    }
    return true;
  }
}
