import { Body, Controller, Ip, Post, Req, Res } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import { passwordLoginSchema, requestOtpSchema, verifyOtpSchema } from '@sprintgo/shared';
import type { PasswordLoginDto, RequestOtpDto, VerifyOtpDto } from '@sprintgo/shared';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { DomainException } from '../../common/errors/domain.exception';
import { AuthService } from './auth.service';
import { TokensService } from './tokens.service';
import { clearAuthCookies, REFRESH_COOKIE, setAuthCookies } from './cookies';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly tokens: TokensService,
  ) {}

  /** Per-IP: 10/hour (docs/architecture/09 §2). Per-phone limits live in OtpService. */
  @Post('otp/request')
  @Throttle({ default: { limit: 10, ttl: 3_600_000 } })
  requestOtp(@Body(new ZodValidationPipe(requestOtpSchema)) dto: RequestOtpDto, @Ip() ip: string) {
    return this.auth.requestOtp(dto.phone, ip);
  }

  @Post('otp/verify')
  @Throttle({ default: { limit: 10, ttl: 600_000 } })
  async verifyOtp(
    @Body(new ZodValidationPipe(verifyOtpSchema)) dto: VerifyOtpDto,
    @Ip() ip: string,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { user, isNewUser, pair } = await this.auth.verifyOtp(dto.phone, dto.code, {
      ip,
      deviceInfo: req.headers['user-agent'],
    });
    setAuthCookies(res, pair);
    // token is for native apps (Bearer) — the web ignores it and uses the httpOnly cookie
    return { user, isNewUser, token: pair.accessToken };
  }

  /** Staff (merchant/admin) password login — accounts are created by the super admin. */
  @Post('login')
  @Throttle({ default: { limit: 10, ttl: 900_000 } })
  async login(
    @Body(new ZodValidationPipe(passwordLoginSchema)) dto: PasswordLoginDto,
    @Ip() ip: string,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { user, pair } = await this.auth.passwordLogin(dto.phone, dto.password, {
      ip,
      deviceInfo: req.headers['user-agent'],
    });
    setAuthCookies(res, pair);
    return { user, token: pair.accessToken };
  }

  @Post('refresh')
  async refresh(@Req() req: Request, @Ip() ip: string, @Res({ passthrough: true }) res: Response) {
    const raw = (req.cookies as Record<string, string> | undefined)?.[REFRESH_COOKIE];
    if (!raw) throw new DomainException('AUTH_REQUIRED', 'سجل دخولك الأول');

    const { pair } = await this.tokens.rotate(raw, { ip, deviceInfo: req.headers['user-agent'] });
    setAuthCookies(res, pair);
    return { ok: true };
  }

  @Post('logout')
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const raw = (req.cookies as Record<string, string> | undefined)?.[REFRESH_COOKIE];
    if (raw) await this.tokens.revoke(raw);
    clearAuthCookies(res);
    return { ok: true };
  }
}
