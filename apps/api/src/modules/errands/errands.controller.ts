import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { createDeliveryRequestSchema, createErrandSchema, errandQuoteSchema } from '@sprintgo/shared';
import type { CreateDeliveryRequestDto, CreateErrandDto, ErrandQuoteDto } from '@sprintgo/shared';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { MerchantPermissionsGuard } from '../../common/guards/merchant-permissions.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { RequireStorePermission } from '../../common/decorators/store-permission.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthUser } from '../../common/guards/jwt-auth.guard';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { ErrandsService } from './errands.service';

@Controller('errands')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('CUSTOMER')
export class ErrandsController {
  constructor(private readonly errands: ErrandsService) {}

  @Post()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  create(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(createErrandSchema)) dto: CreateErrandDto,
  ) {
    return this.errands.createCustomerErrand(user.id, dto);
  }

  /** Live delivery-fee preview before the customer confirms. */
  @Get('quote')
  quote(@Query(new ZodValidationPipe(errandQuoteSchema)) dto: ErrandQuoteDto) {
    return this.errands.quote(dto);
  }
}

@Controller('merchant/delivery-requests')
@UseGuards(JwtAuthGuard, RolesGuard, MerchantPermissionsGuard)
@Roles('MERCHANT')
export class MerchantDeliveryController {
  constructor(private readonly errands: ErrandsService) {}

  @Post()
  @RequireStorePermission('merchant.orders')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  create(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(createDeliveryRequestSchema)) dto: CreateDeliveryRequestDto,
  ) {
    return this.errands.createDeliveryRequest(user.id, dto);
  }
}
