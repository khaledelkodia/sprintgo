import { Injectable, Logger } from '@nestjs/common';

export const SMS_PROVIDER = Symbol('SMS_PROVIDER');

/** Port for OTP delivery — real providers (SMS Misr / WhatsApp) plug in behind it. */
export interface SmsProvider {
  send(phoneE164: string, text: string): Promise<void>;
}

/** Dev/test provider: prints the message (and thus the OTP) to the api console. */
@Injectable()
export class MockSmsProvider implements SmsProvider {
  private readonly logger = new Logger('SMS');

  async send(phoneE164: string, text: string): Promise<void> {
    this.logger.warn(`[MOCK SMS → ${phoneE164}] ${text}`);
  }
}
