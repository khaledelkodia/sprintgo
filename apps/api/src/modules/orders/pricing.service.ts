import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { Store } from '@prisma/client';
import type { OrderItemInput } from '@sprintgo/shared';

type ProductWithOptions = Prisma.ProductGetPayload<{
  include: { optionGroups: { include: { options: true } } };
}>;
import { PrismaService } from '../../core/prisma/prisma.service';
import { DomainException } from '../../common/errors/domain.exception';

export interface PricedItemOption {
  groupName: string;
  optionName: string;
  priceDelta: number;
}

export interface PricedItem {
  productId: string;
  name: string;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
  options: PricedItemOption[];
  notes: string | null;
}

export interface PricedCart {
  store: Store;
  items: PricedItem[];
  subtotal: number;
}

/**
 * Server-authoritative pricing (ADR-007). Every price is re-derived from the
 * database; option-group rules (min/max select, availability) are enforced here.
 * The client's displayed total is compared elsewhere for drift only.
 */
@Injectable()
export class PricingService {
  constructor(private readonly prisma: PrismaService) {}

  async priceCart(storeId: string, items: OrderItemInput[]): Promise<PricedCart> {
    const store = await this.prisma.store.findFirst({
      where: { id: storeId, status: 'ACTIVE', deletedAt: null },
    });
    if (!store) throw new DomainException('NOT_FOUND', 'المحل ده مش موجود');
    if (!store.isAcceptingOrders) {
      throw new DomainException('STORE_CLOSED', 'المحل مش بيستقبل طلبات دلوقتي');
    }

    const productIds = [...new Set(items.map((i) => i.productId))];
    const products = await this.prisma.product.findMany({
      where: { id: { in: productIds }, storeId, deletedAt: null },
      include: { optionGroups: { include: { options: true } } },
    });
    const byId = new Map(products.map((p) => [p.id, p]));

    const priced: PricedItem[] = items.map((item) => this.priceLine(item, byId));
    const subtotal = priced.reduce((sum, i) => sum + i.lineTotal, 0);

    return { store, items: priced, subtotal };
  }

  private priceLine(item: OrderItemInput, byId: Map<string, ProductWithOptions>): PricedItem {
    const product = byId.get(item.productId);
    if (!product) {
      throw new DomainException('PRODUCT_UNAVAILABLE', 'صنف من اللي في السلة مبقاش متاح', {
        productId: item.productId,
      });
    }
    if (!product.isAvailable) {
      throw new DomainException('PRODUCT_UNAVAILABLE', `"${product.name}" مش متاح دلوقتي`, {
        productId: item.productId,
      });
    }

    const selectedIds = new Set(item.optionIds);
    const options: PricedItemOption[] = [];
    let optionsDelta = 0;

    for (const group of product.optionGroups) {
      const chosen = group.options.filter((o) => selectedIds.has(o.id));

      if (chosen.length < group.minSelect || chosen.length > group.maxSelect) {
        throw new DomainException(
          'VALIDATION_ERROR',
          `اختياراتك في "${group.name}" مش مظبوطة`,
          { productId: product.id, group: group.name },
        );
      }
      for (const opt of chosen) {
        if (!opt.isAvailable) {
          throw new DomainException('PRODUCT_UNAVAILABLE', `"${opt.name}" مش متاح دلوقتي`);
        }
        optionsDelta += opt.priceDelta;
        options.push({ groupName: group.name, optionName: opt.name, priceDelta: opt.priceDelta });
        selectedIds.delete(opt.id);
      }
    }

    // any leftover selected id didn't belong to this product's groups
    if (selectedIds.size > 0) {
      throw new DomainException('VALIDATION_ERROR', 'اختيار إضافة مش تابع للصنف ده');
    }

    const unitPrice = product.price + optionsDelta;
    return {
      productId: product.id,
      name: product.name,
      unitPrice,
      quantity: item.quantity,
      lineTotal: unitPrice * item.quantity,
      options,
      notes: item.notes ?? null,
    };
  }
}
