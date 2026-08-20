import { Injectable } from '@nestjs/common';
import type { CanActivate, ExecutionContext } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';
import type { Role } from '@sprintgo/shared';
import { DomainException } from '../errors/domain.exception';

export interface AuthUser {
  id: string;
  roles: Role[];
  /** Effective fine-grained permission keys (`['*']` = super admin). */
  perms: string[];
}

/**
 * Authenticates via the `sg_at` httpOnly cookie (browsers) or a
 * Bearer header (future native apps) — docs/architecture/05 §3.
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly jwt: JwtService) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<Request>();
    const token = this.extract(req);
    if (!token) throw new DomainException('AUTH_REQUIRED', 'سجل دخولك الأول');

    try {
      const payload = this.jwt.verify<{ sub: string; roles?: Role[]; perms?: string[] }>(token);
      req.user = { id: payload.sub, roles: payload.roles ?? [], perms: payload.perms ?? [] };
      return true;
    } catch {
      throw new DomainException('AUTH_REQUIRED', 'جلستك انتهت — سجل دخولك تاني');
    }
  }

  private extract(req: Request): string | null {
    const cookies = req.cookies as Record<string, string> | undefined;
    if (cookies?.sg_at) return cookies.sg_at;
    const header = req.headers.authorization;
    if (header?.startsWith('Bearer ')) return header.slice(7);
    return null;
  }
}
