import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import {
  registerDeviceSchema,
  subscribePushSchema,
  unregisterDeviceSchema,
  unsubscribePushSchema,
} from '@sprintgo/shared';
import type {
  RegisterDeviceDto,
  SubscribePushDto,
  UnregisterDeviceDto,
  UnsubscribePushDto,
} from '@sprintgo/shared';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthUser } from '../../common/guards/jwt-auth.guard';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { PushService } from './push.service';

@Controller('push')
export class PushController {
  constructor(private readonly push: PushService) {}

  /** The VAPID public key the browser needs to subscribe (null when push is off). */
  @Get('public-key')
  publicKey() {
    return { publicKey: this.push.publicKey };
  }

  @Post('subscribe')
  @UseGuards(JwtAuthGuard)
  async subscribe(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(subscribePushSchema)) dto: SubscribePushDto,
  ) {
    await this.push.subscribe(user.id, dto.subscription);
    return { ok: true };
  }

  @Post('unsubscribe')
  @UseGuards(JwtAuthGuard)
  async unsubscribe(@Body(new ZodValidationPipe(unsubscribePushSchema)) dto: UnsubscribePushDto) {
    await this.push.unsubscribe(dto.endpoint);
    return { ok: true };
  }

  /** A phone hands over its FCM token so push reaches it while the app is closed. */
  @Post('device')
  @UseGuards(JwtAuthGuard)
  async registerDevice(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(registerDeviceSchema)) dto: RegisterDeviceDto,
  ) {
    await this.push.registerDevice(user.id, dto);
    return { ok: true };
  }

  /** On logout — this phone should stop receiving the previous user's alerts. */
  @Post('device/unregister')
  @UseGuards(JwtAuthGuard)
  async unregisterDevice(@Body(new ZodValidationPipe(unregisterDeviceSchema)) dto: UnregisterDeviceDto) {
    await this.push.unregisterDevice(dto.token);
    return { ok: true };
  }
}
