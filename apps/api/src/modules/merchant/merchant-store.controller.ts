import { Body, Controller, Get, Patch, Put, UseGuards } from '@nestjs/common';
import {
  setWorkingHoursSchema,
  toggleAvailabilitySchema,
  updateStoreSchema,
} from '@sprintgo/shared';
import type { SetWorkingHoursDto, ToggleAvailabilityDto, UpdateStoreDto } from '@sprintgo/shared';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { MerchantPermissionsGuard } from '../../common/guards/merchant-permissions.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { RequireStorePermission } from '../../common/decorators/store-permission.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthUser } from '../../common/guards/jwt-auth.guard';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { MerchantStoreService } from './merchant-store.service';

@Controller('merchant/store')
@UseGuards(JwtAuthGuard, RolesGuard, MerchantPermissionsGuard)
@Roles('MERCHANT')
export class MerchantStoreController {
  constructor(private readonly store: MerchantStoreService) {}

  @Get()
  get(@CurrentUser() user: AuthUser) {
    return this.store.getStore(user.id);
  }

  @Patch()
  @RequireStorePermission('merchant.settings')
  update(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(updateStoreSchema)) dto: UpdateStoreDto,
  ) {
    return this.store.updateStore(user.id, dto);
  }

  @Patch('accepting')
  @RequireStorePermission('merchant.settings')
  toggle(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(toggleAvailabilitySchema)) dto: ToggleAvailabilityDto,
  ) {
    return this.store.toggleAccepting(user.id, dto.isAvailable);
  }

  @Put('working-hours')
  @RequireStorePermission('merchant.settings')
  setHours(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(setWorkingHoursSchema)) dto: SetWorkingHoursDto,
  ) {
    return this.store.setWorkingHours(user.id, dto);
  }
}
