import { Injectable } from '@nestjs/common';
import type { UpsertCategoryDto, UpsertProductDto } from '@sprintgo/shared';
import { PrismaService } from '../../core/prisma/prisma.service';
import { DomainException } from '../../common/errors/domain.exception';
import { assertProductLimit } from '../../common/product-limit';
import { resolveOwnedStore } from './merchant.helpers';

@Injectable()
export class MerchantCatalogService {
  constructor(private readonly prisma: PrismaService) {}

  // ── categories ──
  async listCategories(ownerId: string) {
    const store = await resolveOwnedStore(this.prisma, ownerId);
    return this.prisma.menuCategory.findMany({ where: { storeId: store.id }, orderBy: { sortOrder: 'asc' } });
  }

  async createCategory(ownerId: string, dto: UpsertCategoryDto) {
    const store = await resolveOwnedStore(this.prisma, ownerId);
    return this.prisma.menuCategory.create({ data: { storeId: store.id, ...dto } });
  }

  async updateCategory(ownerId: string, id: string, dto: UpsertCategoryDto) {
    await this.ownedCategory(ownerId, id);
    return this.prisma.menuCategory.update({ where: { id }, data: dto });
  }

  async deleteCategory(ownerId: string, id: string) {
    await this.ownedCategory(ownerId, id);
    await this.prisma.menuCategory.delete({ where: { id } });
  }

  private async ownedCategory(ownerId: string, id: string) {
    const store = await resolveOwnedStore(this.prisma, ownerId);
    const cat = await this.prisma.menuCategory.findFirst({ where: { id, storeId: store.id }, select: { id: true } });
    if (!cat) throw new DomainException('NOT_FOUND', 'القسم مش موجود');
  }

  // ── products ──
  async listProducts(ownerId: string) {
    const store = await resolveOwnedStore(this.prisma, ownerId);
    return this.prisma.product.findMany({
      where: { storeId: store.id, deletedAt: null },
      orderBy: [{ categoryId: 'asc' }, { sortOrder: 'asc' }],
    });
  }

  async createProduct(ownerId: string, dto: UpsertProductDto) {
    const store = await resolveOwnedStore(this.prisma, ownerId);
    await assertProductLimit(this.prisma, store.id);
    if (dto.categoryId) await this.assertCategoryInStore(store.id, dto.categoryId);
    return this.prisma.product.create({ data: { storeId: store.id, ...dto } });
  }

  async updateProduct(ownerId: string, id: string, dto: UpsertProductDto) {
    const store = await this.ownedProduct(ownerId, id);
    if (dto.categoryId) await this.assertCategoryInStore(store.id, dto.categoryId);
    return this.prisma.product.update({ where: { id }, data: dto });
  }

  async setAvailability(ownerId: string, id: string, isAvailable: boolean) {
    await this.ownedProduct(ownerId, id);
    return this.prisma.product.update({ where: { id }, data: { isAvailable } });
  }

  async deleteProduct(ownerId: string, id: string) {
    await this.ownedProduct(ownerId, id);
    await this.prisma.product.update({ where: { id }, data: { deletedAt: new Date() } });
  }

  private async ownedProduct(ownerId: string, id: string) {
    const store = await resolveOwnedStore(this.prisma, ownerId);
    const product = await this.prisma.product.findFirst({
      where: { id, storeId: store.id, deletedAt: null },
      select: { id: true },
    });
    if (!product) throw new DomainException('NOT_FOUND', 'الصنف مش موجود');
    return store;
  }

  private async assertCategoryInStore(storeId: string, categoryId: string) {
    const cat = await this.prisma.menuCategory.findFirst({ where: { id: categoryId, storeId }, select: { id: true } });
    if (!cat) throw new DomainException('VALIDATION_ERROR', 'القسم ده مش تابع لمحلك');
  }
}
