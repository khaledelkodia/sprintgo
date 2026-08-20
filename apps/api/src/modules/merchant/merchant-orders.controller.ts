import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { acceptOrderSchema, rejectOrderSchema } from '@sprintgo/shared';
import type { AcceptOrderDto, OrderStatus, RejectOrderDto } from '@sprintgo/shared';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { MerchantPermissionsGuard } from '../../common/guards/merchant-permissions.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { RequireStorePermission } from '../../common/decorators/store-permission.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthUser } from '../../common/guards/jwt-auth.guard';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { MerchantOrdersService } from './merchant-orders.service';

@Controller('merchant/orders')
@UseGuards(JwtAuthGuard, RolesGuard, MerchantPermissionsGuard)
@Roles('MERCHANT')
export class MerchantOrdersController {
  constructor(private readonly orders: MerchantOrdersService) {}

  @Get()
  board(@CurrentUser() user: AuthUser, @Query('status') status?: OrderStatus) {
    return this.orders.board(user.id, status);
  }

  @Post(':id/accept')
  @RequireStorePermission('merchant.orders')
  accept(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(acceptOrderSchema)) dto: AcceptOrderDto,
  ) {
    return this.orders.accept(user.id, id, dto);
  }

  @Post(':id/reject')
  @RequireStorePermission('merchant.orders')
  reject(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(rejectOrderSchema)) dto: RejectOrderDto,
  ) {
    return this.orders.reject(user.id, id, dto.reason);
  }

  @Post(':id/ready')
  @RequireStorePermission('merchant.orders')
  ready(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.orders.ready(user.id, id);
  }

  @Post(':id/handover')
  @RequireStorePermission('merchant.orders')
  handover(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.orders.handover(user.id, id);
  }
}

@Controller('merchant/stats')
@UseGuards(JwtAuthGuard, RolesGuard, MerchantPermissionsGuard)
@Roles('MERCHANT')
export class MerchantStatsController {
  constructor(private readonly orders: MerchantOrdersService) {}

  @Get('today')
  @RequireStorePermission('merchant.reports')
  today(@CurrentUser() user: AuthUser) {
    return this.orders.statsToday(user.id);
  }
}
