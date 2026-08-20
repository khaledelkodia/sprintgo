import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import type { User } from '@prisma/client';
import type { Role } from '@sprintgo/shared';
import { env } from '../../core/config/env';
import { PrismaService } from '../../core/prisma/prisma.service';
import { PermissionsService } from '../../core/permissions/permissions.service';
import { DomainException } from '../../common/errors/domain.exception';

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  refreshExpiresAt: Date;
  /** Effective permissions embedded in the access token (echoed for the login response). */
  perms: string[];
}

export interface TokenMeta {
  ip?: string;
  deviceInfo?: string;
}

/**
 * Access: short-lived JWT. Refresh: opaque token stored as sha256,
 * rotated on every use; presenting an already-rotated token revokes the
 * whole family (reuse detection) — docs/architecture/05 §3.
 */
@Injectable()
export class TokensService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly permissions: PermissionsService,
  ) {}

  private hash(raw: string): string {
    return createHash('sha256').update(raw).digest('hex');
  }

  async issue(
    user: { id: string; roles: Role[] },
    meta: TokenMeta,
    familyId: string = randomUUID(),
    perms?: string[],
  ): Promise<TokenPair> {
    const raw = randomBytes(48).toString('base64url');
    const refreshExpiresAt = new Date(Date.now() + env.REFRESH_TOKEN_TTL_DAYS * 86_400_000);
    // Resolve fresh unless the caller already computed them (e.g. login flow).
    const effectivePerms = perms ?? (await this.permissions.resolveForUser(user));

    await this.prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: this.hash(raw),
        familyId,
        expiresAt: refreshExpiresAt,
        ip: meta.ip,
        deviceInfo: meta.deviceInfo?.slice(0, 250),
      },
    });

    return {
      accessToken: this.jwt.sign({ sub: user.id, roles: user.roles, perms: effectivePerms }),
      refreshToken: raw,
      refreshExpiresAt,
      perms: effectivePerms,
    };
  }

  async rotate(rawOld: string, meta: TokenMeta): Promise<{ pair: TokenPair; user: User }> {
    const row = await this.prisma.refreshToken.findUnique({
      where: { tokenHash: this.hash(rawOld) },
      include: { user: true },
    });

    if (!row || row.revokedAt || row.expiresAt < new Date()) {
      throw new DomainException('AUTH_REQUIRED', 'جلستك انتهت — سجل دخولك تاني');
    }

    if (row.rotatedAt) {
      // Reuse of a rotated token = likely theft → kill the whole family.
      await this.prisma.refreshToken.updateMany({
        where: { familyId: row.familyId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      throw new DomainException('AUTH_REQUIRED', 'لأمانك سجّلنا خروجك — ادخل تاني');
    }

    if (row.user.status !== 'ACTIVE') {
      throw new DomainException('FORBIDDEN', 'الحساب موقوف — كلم خدمة العملاء');
    }

    await this.prisma.refreshToken.update({
      where: { id: row.id },
      data: { rotatedAt: new Date() },
    });

    const pair = await this.issue({ id: row.user.id, roles: row.user.roles }, meta, row.familyId);
    return { pair, user: row.user };
  }

  async revoke(raw: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { tokenHash: this.hash(raw) },
      data: { revokedAt: new Date() },
    });
  }
}
