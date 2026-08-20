import { createParamDecorator } from '@nestjs/common';
import type { ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import { DomainException } from '../errors/domain.exception';
import type { AuthUser } from '../guards/jwt-auth.guard';

export const CurrentUser = createParamDecorator((_data: unknown, ctx: ExecutionContext): AuthUser => {
  const req = ctx.switchToHttp().getRequest<Request>();
  if (!req.user) throw new DomainException('AUTH_REQUIRED', 'سجل دخولك الأول');
  return req.user;
});
