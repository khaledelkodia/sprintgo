import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import {
  toggleAvailabilitySchema,
  upsertCategorySchema,
  upsertProductSchema,
} from '@sprintgo/shared';
import type { ToggleAvailabilityDto, UpsertCategoryDto, UpsertProductDto } from '@sprintgo/shared';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { MerchantPermissionsGuard } from '../../common/guards/merchant-permissions.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { RequireStorePermission } from '../../common/decorators/store-permission.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthUser } from '../../common/guards/jwt-auth.guard';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { MerchantCatalogService } from './merchant-catalog.service';

@Controller('merchant')
@UseGuards(JwtAuthGuard, RolesGuard, MerchantPermissionsGuard)
@Roles('MERCHANT')
export class MerchantCatalogController {
  constructor(private readonly catalog: MerchantCatalogService) {}

  @Get('categories')
  listCategories(@CurrentUser() user: AuthUser) {
    return this.catalog.listCategories(user.id);
  }

  @Post('categories')
  @RequireStorePermission('merchant.products')
  createCategory(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(upsertCategorySchema)) dto: UpsertCategoryDto,
  ) {
    return this.catalog.createCategory(user.id, dto);
  }

  @Patch('categories/:id')
  @RequireStorePermission('merchant.products')
  updateCategory(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(upsertCategorySchema)) dto: UpsertCategoryDto,
  ) {
    return this.catalog.updateCategory(user.id, id, dto);
  }

  @Delete('categories/:id')
  @RequireStorePermission('merchant.products')
  async deleteCategory(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    await this.catalog.deleteCategory(user.id, id);
    return { ok: true };
  }

  @Get('products')
  listProducts(@CurrentUser() user: AuthUser) {
    return this.catalog.listProducts(user.id);
  }

  @Post('products')
  @RequireStorePermission('merchant.products')
  createProduct(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(upsertProductSchema)) dto: UpsertProductDto,
  ) {
    return this.catalog.createProduct(user.id, dto);
  }

  @Patch('products/:id')
  @RequireStorePermission('merchant.products')
  updateProduct(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(upsertProductSchema)) dto: UpsertProductDto,
  ) {
    return this.catalog.updateProduct(user.id, id, dto);
  }

  @Patch('products/:id/availability')
  @RequireStorePermission('merchant.products')
  setAvailability(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(toggleAvailabilitySchema)) dto: ToggleAvailabilityDto,
  ) {
    return this.catalog.setAvailability(user.id, id, dto.isAvailable);
  }

  @Delete('products/:id')
  @RequireStorePermission('merchant.products')
  async deleteProduct(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    await this.catalog.deleteProduct(user.id, id);
    return { ok: true };
  }
}
