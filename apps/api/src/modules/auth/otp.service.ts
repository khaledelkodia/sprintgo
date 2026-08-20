import { Inject, Injectable } from '@nestjs/common';
import { createHash, randomInt, timingSafeEqual } from 'node:crypto';
import { env } from '../../core/config/env';
import { PrismaService } from '../../core/prisma/prisma.service';
import { DomainException } from '../../common/errors/domain.exception';
import { SMS_PROVIDER } from './sms/sms.provider';
import type { SmsProvider } from './sms/sms.provider';

const OTP_TTL_MS = 5 * 60_000; //        code lives 5 minutes
const RESEND_COOLDOWN_MS = 60_000; //    1 request / minute
const MAX_PER_WINDOW = 3; //             3 requests / phone / 10 minutes (docs/architecture/09 §2)
const WINDOW_MS = 10 * 60_000;
const MAX_ATTEMPTS = 5; //               then the code dies (ADR-002)

@Injectable()
export class OtpService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(SMS_PROVIDER) private readonly sms: SmsProvider,
  ) {}

  /** sha256(code:phone:pepper) — raw codes never touch the database. */
  private hash(code: string, phone: string): string {
    return createHash('sha256').update(`${code}:${phone}:${env.OTP_PEPPER}`).digest('hex');
  }

  async request(
    phone: string,
    ip?: string,
  ): Promise<{ retryAfterSec: number; expiresInSec: number; devCode?: string }> {
    const since = new Date(Date.now() - WINDOW_MS);
    const recent = await this.prisma.otpRequest.findMany({
      where: { phone, createdAt: { gte: since } },
      orderBy: { createdAt: 'desc' },
    });

    if (recent.length >= MAX_PER_WINDOW) {
      throw new DomainException('RATE_LIMITED', 'طلبت أكواد كتير — استنى 10 دقايق وجرب تاني');
    }
    const last = recent[0];
    if (last) {
      const sinceLastMs = Date.now() - last.createdAt.getTime();
      if (sinceLastMs < RESEND_COOLDOWN_MS) {
        const wait = Math.ceil((RESEND_COOLDOWN_MS - sinceLastMs) / 1000);
        throw new DomainException('RATE_LIMITED', `استنى ${wait} ثانية وبعدين اطلب كود جديد`, {
          retryAfterSec: wait,
        });
      }
    }

    const code = String(randomInt(0, 10_000)).padStart(4, '0');
    await this.prisma.otpRequest.create({
      data: {
        phone,
        codeHash: this.hash(code, phone),
        expiresAt: new Date(Date.now() + OTP_TTL_MS),
        ip,
      },
    });
    await this.sms.send(phone, `كود الدخول في سبرنت جو: ${code}`);

    const result = { retryAfterSec: RESEND_COOLDOWN_MS / 1000, expiresInSec: OTP_TTL_MS / 1000 };
    // DEV ONLY: surface the code so testers don't hunt the console.
    // Strictly gated on NODE_ENV — this can never reach a production response.
    if (env.NODE_ENV === 'development') {
      return { ...result, devCode: code };
    }
    return result;
  }

  /** Throws on failure; resolving means the code was correct and is now consumed. */
  async verify(phone: string, code: string): Promise<void> {
    const otp = await this.prisma.otpRequest.findFirst({
      where: { phone, consumedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: 'desc' },
    });

    if (!otp) {
      throw new DomainException('AUTH_OTP_EXPIRED', 'الكود انتهى أو مفيش كود مطلوب — اطلب كود جديد');
    }
    if (otp.attempts >= MAX_ATTEMPTS) {
      throw new DomainException('AUTH_OTP_EXPIRED', 'جربت كتير على الكود ده — اطلب كود جديد');
    }

    const expected = Buffer.from(otp.codeHash, 'hex');
    const actual = Buffer.from(this.hash(code, phone), 'hex');
    if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) {
      const updated = await this.prisma.otpRequest.update({
        where: { id: otp.id },
        data: { attempts: { increment: 1 } },
      });
      const left = Math.max(0, MAX_ATTEMPTS - updated.attempts);
      throw new DomainException(
        'AUTH_INVALID_OTP',
        left > 0 ? `الكود مش صح — فاضل ${left} ${left === 1 ? 'محاولة' : 'محاولات'}` : 'خلصت المحاولات — اطلب كود جديد',
        { attemptsLeft: left },
      );
    }

    await this.prisma.otpRequest.update({
      where: { id: otp.id },
      data: { consumedAt: new Date() },
    });
  }
}
