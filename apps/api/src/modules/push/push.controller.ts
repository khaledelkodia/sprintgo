import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { subscribePushSchema, unsubscribePushSchema } from '@sprintgo/shared';
import type { SubscribePushDto, UnsubscribePushDto } from '@sprintgo/shared';
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
}
