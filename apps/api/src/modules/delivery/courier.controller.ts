import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import {
  courierHeartbeatSchema,
  enterGoodsCostSchema,
  markDeliveredSchema,
  setAvailabilitySchema,
} from '@sprintgo/shared';
import type {
  CourierHeartbeatDto,
  EnterGoodsCostDto,
  MarkDeliveredDto,
  SetAvailabilityDto,
} from '@sprintgo/shared';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthUser } from '../../common/guards/jwt-auth.guard';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { DeliveryService } from './delivery.service';

@Controller('courier')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('COURIER')
export class CourierController {
  constructor(private readonly delivery: DeliveryService) {}

  @Patch('availability')
  setAvailability(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(setAvailabilitySchema)) dto: SetAvailabilityDto,
  ) {
    return this.delivery.setAvailability(user.id, dto.isAvailable);
  }

  @Patch('heartbeat')
  async heartbeat(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(courierHeartbeatSchema)) dto: CourierHeartbeatDto,
  ) {
    await this.delivery.heartbeat(user.id, dto.lat, dto.lng);
    return { ok: true };
  }

  @Get('offer')
  currentOffer(@CurrentUser() user: AuthUser) {
    return this.delivery.currentOffer(user.id);
  }

  @Post('offer/:orderId/accept')
  async acceptOffer(@CurrentUser() user: AuthUser, @Param('orderId') orderId: string) {
    await this.delivery.acceptOffer(user.id, orderId);
    return { ok: true };
  }

  @Post('offer/:orderId/reject')
  async rejectOffer(@CurrentUser() user: AuthUser, @Param('orderId') orderId: string) {
    await this.delivery.rejectOffer(user.id, orderId);
    return { ok: true };
  }

  @Get('tasks')
  tasks(@CurrentUser() user: AuthUser) {
    return this.delivery.tasks(user.id);
  }

  @Post('tasks/:orderId/pickup')
  pickup(@CurrentUser() user: AuthUser, @Param('orderId') orderId: string) {
    return this.delivery.pickup(user.id, orderId);
  }

  @Post('tasks/:orderId/goods-cost')
  async goodsCost(
    @CurrentUser() user: AuthUser,
    @Param('orderId') orderId: string,
    @Body(new ZodValidationPipe(enterGoodsCostSchema)) dto: EnterGoodsCostDto,
  ) {
    await this.delivery.enterGoodsCost(user.id, orderId, dto.actualGoodsCost);
    return { ok: true };
  }

  @Post('tasks/:orderId/delivered')
  delivered(
    @CurrentUser() user: AuthUser,
    @Param('orderId') orderId: string,
    @Body(new ZodValidationPipe(markDeliveredSchema)) dto: MarkDeliveredDto,
  ) {
    return this.delivery.delivered(user.id, orderId, dto.cashCollected);
  }

  @Get('summary/today')
  summary(@CurrentUser() user: AuthUser) {
    return this.delivery.summaryToday(user.id);
  }

  /** Wallet: today's earnings + the standing balance the courier owes the platform. */
  @Get('wallet')
  wallet(@CurrentUser() user: AuthUser) {
    return this.delivery.wallet(user.id);
  }

  /** Daily report — last 7 days by default, or a month via ?month=YYYY-MM. */
  @Get('report')
  report(@CurrentUser() user: AuthUser, @Query('month') month?: string) {
    return this.delivery.courierReport(user.id, month);
  }
}
