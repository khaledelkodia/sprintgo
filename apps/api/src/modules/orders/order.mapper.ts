import { Prisma } from '@prisma/client';
import { statusLabel } from '@sprintgo/shared';
import type {
  AddressSnapshot,
  OrderCardView,
  OrderItemOptionView,
  OrderItemView,
  OrderView,
} from '@sprintgo/shared';

export const ORDER_DETAIL_INCLUDE = {
  items: true,
  statusEvents: { orderBy: { createdAt: 'asc' } },
  store: true,
  serviceType: true,
} satisfies Prisma.OrderInclude;

export const ORDER_CARD_INCLUDE = {
  store: true,
  serviceType: true,
  _count: { select: { items: true } },
} satisfies Prisma.OrderInclude;

type OrderDetail = Prisma.OrderGetPayload<{ include: typeof ORDER_DETAIL_INCLUDE }>;
type OrderCard = Prisma.OrderGetPayload<{ include: typeof ORDER_CARD_INCLUDE }>;

function toItemView(item: OrderDetail['items'][number]): OrderItemView {
  return {
    id: item.id,
    name: item.name,
    unitPrice: item.unitPrice,
    quantity: item.quantity,
    lineTotal: item.lineTotal,
    options: (item.options as OrderItemOptionView[] | null) ?? [],
    notes: item.notes,
  };
}

export function toOrderView(order: OrderDetail): OrderView {
  const flowType = order.serviceType.flowType;
  return {
    id: order.id,
    code: order.code,
    status: order.status,
    statusLabel: statusLabel(flowType, order.status),
    flowType,
    fulfillmentType: order.fulfillmentType,
    paymentMethod: order.paymentMethod,
    paymentStatus: order.paymentStatus,
    store: order.store
      ? { name: order.store.name, slug: order.store.slug, contactPhone: order.store.contactPhone }
      : null,
    serviceType: { slug: order.serviceType.slug, nameAr: order.serviceType.nameAr },
    addressSnapshot: (order.addressSnapshot as AddressSnapshot | null) ?? null,
    items: order.items.map(toItemView),
    customerNotes: order.customerNotes,
    subtotal: order.subtotal,
    deliveryFee: order.deliveryFee,
    discount: order.discount,
    total: order.total,
    placedAt: order.placedAt.toISOString(),
    estimatedReadyAt: order.estimatedReadyAt?.toISOString() ?? null,
    timeline: order.statusEvents.map((e) => ({
      status: e.toStatus,
      label: statusLabel(flowType, e.toStatus),
      at: e.createdAt.toISOString(),
      note: e.note,
    })),
    canCancel: order.status === 'PLACED',
  };
}

export function toOrderCardView(order: OrderCard): OrderCardView {
  return {
    id: order.id,
    code: order.code,
    status: order.status,
    statusLabel: statusLabel(order.serviceType.flowType, order.status),
    storeName: order.store?.name ?? null,
    serviceTypeSlug: order.serviceType.slug,
    itemsCount: order._count.items,
    total: order.total,
    placedAt: order.placedAt.toISOString(),
  };
}
