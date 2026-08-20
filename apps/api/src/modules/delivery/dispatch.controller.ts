import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { assignCourierSchema, reassignCourierSchema } from '@sprintgo/shared';
import type { AssignCourierDto, ReassignCourierDto } from '@sprintgo/shared';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthUser } from '../../common/guards/jwt-auth.guard';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { DeliveryService } from './delivery.service';

@Controller('admin/dispatch')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@Roles('ADMIN', 'SUPER_ADMIN')
export class DispatchController {
  constructor(private readonly delivery: DeliveryService) {}

  @Get('queue')
  @RequirePermissions('dispatch.view')
  queue() {
    return this.delivery.dispatchQueue();
  }

  @Get('couriers')
  @RequirePermissions('dispatch.view')
  couriers(@Query('available') available?: string) {
    return this.delivery.listCouriers(available === '1' || available === 'true');
  }

  @Get('orders/:orderId/suggestions')
  @RequirePermissions('dispatch.view')
  suggestions(@Param('orderId') orderId: string) {
    return this.delivery.suggestCouriers(orderId);
  }

  @Post('orders/:orderId/assign-nearest')
  @RequirePermissions('dispatch.assign')
  assignNearest(@CurrentUser() user: AuthUser, @Param('orderId') orderId: string) {
    return this.delivery.assignNearest(user.id, orderId);
  }

  @Post('orders/:orderId/assign')
  @RequirePermissions('dispatch.assign')
  async assign(
    @CurrentUser() user: AuthUser,
    @Param('orderId') orderId: string,
    @Body(new ZodValidationPipe(assignCourierSchema)) dto: AssignCourierDto,
  ) {
    await this.delivery.assign(user.id, orderId, dto.courierId);
    return { ok: true };
  }

  @Post('orders/:orderId/reassign')
  @RequirePermissions('dispatch.assign')
  async reassign(
    @CurrentUser() user: AuthUser,
    @Param('orderId') orderId: string,
    @Body(new ZodValidationPipe(reassignCourierSchema)) dto: ReassignCourierDto,
  ) {
    await this.delivery.reassign(user.id, orderId, dto.courierId, dto.reason);
    return { ok: true };
  }
}
