import type { PrismaService } from '../core/prisma/prisma.service';
import { DomainException } from './errors/domain.exception';

/**
 * Enforce the per-store product cap set by the super admin (Store.productLimit).
 * Shared by the merchant's own catalog and the admin drill-in — one rule, one place.
 */
export async function assertProductLimit(prisma: PrismaService, storeId: string): Promise<void> {
  const store = await prisma.store.findUnique({ where: { id: storeId }, select: { productLimit: true } });
  if (store?.productLimit == null) return;
  const count = await prisma.product.count({ where: { storeId, deletedAt: null } });
  if (count >= store.productLimit) {
    throw new DomainException('VALIDATION_ERROR', `وصلت للحد الأقصى للأصناف (${store.productLimit}) — كلّم الإدارة`);
  }
}
