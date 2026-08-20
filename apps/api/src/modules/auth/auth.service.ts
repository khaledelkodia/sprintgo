import { Injectable } from '@nestjs/common';
import type { PublicUser } from '@sprintgo/shared';
import { DomainException } from '../../common/errors/domain.exception';
import { PermissionsService } from '../../core/permissions/permissions.service';
import { toPublicUser, UsersService } from '../users/users.service';
import { OtpService } from './otp.service';
import { TokensService } from './tokens.service';
import type { TokenMeta, TokenPair } from './tokens.service';
import { verifyPassword } from './password';

export interface VerifiedLogin {
  user: PublicUser;
  isNewUser: boolean;
  pair: TokenPair;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly otp: OtpService,
    private readonly tokens: TokensService,
    private readonly users: UsersService,
    private readonly permissions: PermissionsService,
  ) {}

  requestOtp(phone: string, ip?: string) {
    return this.otp.request(phone, ip);
  }

  async verifyOtp(phone: string, code: string, meta: TokenMeta): Promise<VerifiedLogin> {
    await this.otp.verify(phone, code);

    const { user, isNew } = await this.users.upsertByPhone(phone);
    if (user.status !== 'ACTIVE') {
      throw new DomainException('FORBIDDEN', 'الحساب موقوف — كلم خدمة العملاء');
    }

    const perms = await this.permissions.resolveForUser(user);
    const pair = await this.tokens.issue({ id: user.id, roles: user.roles }, meta, undefined, perms);
    await this.users.touchLogin(user.id);

    return { user: toPublicUser(user, perms), isNewUser: isNew, pair };
  }

  /** Password login for staff (merchants/admins) created by the super admin. */
  async passwordLogin(phone: string, password: string, meta: TokenMeta): Promise<VerifiedLogin> {
    const user = await this.users.findByPhone(phone);
    // uniform error + always run the hash compare to avoid user enumeration / timing leaks
    if (!verifyPassword(password, user?.passwordHash) || !user) {
      throw new DomainException('AUTH_INVALID_OTP', 'الرقم أو الباسورد غلط');
    }
    if (user.status !== 'ACTIVE') {
      throw new DomainException('FORBIDDEN', 'الحساب موقوف — كلم الإدارة');
    }
    const perms = await this.permissions.resolveForUser(user);
    const pair = await this.tokens.issue({ id: user.id, roles: user.roles }, meta, undefined, perms);
    await this.users.touchLogin(user.id);
    return { user: toPublicUser(user, perms), isNewUser: false, pair };
  }
}
