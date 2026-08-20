import type { Store } from '@prisma/client';
import { PrismaService } from '../../core/prisma/prisma.service';
import { DomainException } from '../../common/errors/domain.exception';

/**
 * Resolve the store owned by the authenticated merchant. Ownership is the
 * query, not an afterthought (docs/architecture/05 §4) — everything the
 * merchant touches is scoped through this store.
 */
export async function resolveOwnedStore(prisma: PrismaService, ownerId: string): Promise<Store> {
  const store = await prisma.store.findFirst({ where: { ownerId, deletedAt: null } });
  if (!store) throw new DomainException('NOT_FOUND', 'مفيش محل مربوط بحسابك — كلّم الإدارة');
  return store;
}
