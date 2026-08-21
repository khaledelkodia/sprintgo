import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import {
  adminUpdateStoreSchema,
  createDriverSchema,
  createStoreSchema,
  createZoneSchema,
  errandPricingSchema,
  recordRemittanceSchema,
  toggleAvailabilitySchema,
  updateZoneSchema,
  updateDriverVehicleSchema,
  upsertProductSchema,
} from '@sprintgo/shared';
import type {
  AdminUpdateStoreDto,
  CreateDriverDto,
  CreateStoreDto,
  CreateZoneDto,
  ErrandPricingDto,
  RecordRemittanceDto,
  ToggleAvailabilityDto,
  UpdateDriverVehicleDto,
  UpdateZoneDto,
  UpsertProductDto,
} from '@sprintgo/shared';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import type { AuthUser } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { DeliveryService } from '../delivery/delivery.service';
import { AdminService } from './admin.service';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@Roles('ADMIN', 'SUPER_ADMIN')
export class AdminController {
  constructor(
    private readonly admin: AdminService,
    private readonly delivery: DeliveryService,
  ) {}

  // ── stores ──
  @Post('stores')
  @RequirePermissions('stores.create')
  createStore(@CurrentUser() actor: AuthUser, @Body(new ZodValidationPipe(createStoreSchema)) dto: CreateStoreDto) {
    return this.admin.createStore(actor.id, dto);
  }

  @Get('stores')
  @RequirePermissions('stores.view')
  listStores(@Query('status') status?: string) {
    return this.admin.listStores(status);
  }

  @Get('stores/:id')
  @RequirePermissions('stores.view')
  getStore(@Param('id') id: string) {
    return this.admin.getStore(id);
  }

  @Patch('stores/:id')
  @RequirePermissions('stores.edit')
  updateStore(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(adminUpdateStoreSchema)) dto: AdminUpdateStoreDto,
  ) {
    return this.admin.updateStore(id, dto);
  }

  @Post('stores/:id/suspend')
  @RequirePermissions('stores.suspend')
  suspend(@Param('id') id: string) {
    return this.admin.setStoreStatus(id, 'SUSPENDED');
  }

  @Post('stores/:id/activate')
  @RequirePermissions('stores.suspend')
  activate(@Param('id') id: string) {
    return this.admin.setStoreStatus(id, 'ACTIVE');
  }

  // ── a store's products (super admin drill-in) ──
  @Get('stores/:id/products')
  @RequirePermissions('products.manage')
  listProducts(@Param('id') id: string) {
    return this.admin.listProducts(id);
  }

  @Post('stores/:id/products')
  @RequirePermissions('products.manage')
  createProduct(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(upsertProductSchema)) dto: UpsertProductDto,
  ) {
    return this.admin.createProduct(id, dto);
  }

  @Patch('stores/:id/products/:pid')
  @RequirePermissions('products.manage')
  updateProduct(
    @Param('id') id: string,
    @Param('pid') pid: string,
    @Body(new ZodValidationPipe(upsertProductSchema)) dto: UpsertProductDto,
  ) {
    return this.admin.updateProduct(id, pid, dto);
  }

  @Patch('stores/:id/products/:pid/availability')
  @RequirePermissions('products.manage')
  setAvailability(
    @Param('id') id: string,
    @Param('pid') pid: string,
    @Body(new ZodValidationPipe(toggleAvailabilitySchema)) dto: ToggleAvailabilityDto,
  ) {
    return this.admin.setProductAvailability(id, pid, dto.isAvailable);
  }

  @Delete('stores/:id/products/:pid')
  @RequirePermissions('products.manage')
  async deleteProduct(@Param('id') id: string, @Param('pid') pid: string) {
    await this.admin.deleteProduct(id, pid);
    return { ok: true };
  }

  // ── drivers ──
  @Post('drivers')
  @RequirePermissions('drivers.manage')
  createDriver(@Body(new ZodValidationPipe(createDriverSchema)) dto: CreateDriverDto) {
    return this.admin.createDriver(dto);
  }

  @Get('drivers')
  @RequirePermissions('drivers.view')
  listDrivers() {
    return this.admin.listDrivers();
  }

  // ── driver settlement (wallet dues + remittances) ──
  @Get('drivers/settlements')
  @RequirePermissions('drivers.view')
  driverSettlements() {
    return this.delivery.driverSettlements();
  }

  @Post('drivers/:id/remittances')
  @RequirePermissions('drivers.manage')
  async recordRemittance(
    @CurrentUser() actor: AuthUser,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(recordRemittanceSchema)) dto: RecordRemittanceDto,
  ) {
    await this.delivery.recordRemittance(id, dto.amount, actor.id, dto.note);
    return { ok: true };
  }

  @Get('drivers/:id/report')
  @RequirePermissions('drivers.view')
  driverReport(@Param('id') id: string, @Query('month') month?: string) {
    return this.delivery.courierReport(id, month);
  }

  @Patch('drivers/:id/vehicle')
  @RequirePermissions('drivers.manage')
  setDriverVehicle(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateDriverVehicleSchema)) dto: UpdateDriverVehicleDto,
  ) {
    return this.admin.setDriverVehicle(id, dto.vehicleType);
  }

  @Post('drivers/:id/block')
  @RequirePermissions('drivers.manage')
  blockDriver(@Param('id') id: string) {
    return this.admin.setDriverStatus(id, 'BLOCKED');
  }

  @Post('drivers/:id/activate')
  @RequirePermissions('drivers.manage')
  activateDriver(@Param('id') id: string) {
    return this.admin.setDriverStatus(id, 'ACTIVE');
  }

  // ── errand pricing + commission ──
  @Get('errand-pricing')
  @RequirePermissions('pricing.manage')
  getErrandPricing() {
    return this.admin.getErrandPricing();
  }

  @Patch('errand-pricing')
  @RequirePermissions('pricing.manage')
  updateErrandPricing(@Body(new ZodValidationPipe(errandPricingSchema)) dto: ErrandPricingDto) {
    return this.admin.updateErrandPricing(dto);
  }

  // ── zones (delivery areas) ──
  @Get('zones')
  @RequirePermissions('zones.manage')
  listZones() {
    return this.admin.listZones();
  }

  @Post('zones')
  @RequirePermissions('zones.manage')
  createZone(@Body(new ZodValidationPipe(createZoneSchema)) dto: CreateZoneDto) {
    return this.admin.createZone(dto);
  }

  @Patch('zones/:id')
  @RequirePermissions('zones.manage')
  updateZone(@Param('id') id: string, @Body(new ZodValidationPipe(updateZoneSchema)) dto: UpdateZoneDto) {
    return this.admin.updateZone(id, dto);
  }

  @Post('zones/:id/activate')
  @RequirePermissions('zones.manage')
  activateZone(@Param('id') id: string) {
    return this.admin.setZoneActive(id, true);
  }

  @Post('zones/:id/deactivate')
  @RequirePermissions('zones.manage')
  deactivateZone(@Param('id') id: string) {
    return this.admin.setZoneActive(id, false);
  }
}
