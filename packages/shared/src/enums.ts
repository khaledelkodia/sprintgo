/**
 * Canonical enums — the single source of truth for both apps.
 * Prisma enums mirror these names exactly (docs/architecture/03-database-schema.md).
 */

export const ROLES = ['CUSTOMER', 'MERCHANT', 'COURIER', 'ADMIN', 'SUPER_ADMIN'] as const;
export type Role = (typeof ROLES)[number];

export const ORDER_STATUSES = [
  'PLACED',
  'PREPARING',
  'READY',
  'OUT_FOR_DELIVERY',
  'DELIVERED',
  'COMPLETED',
  'CANCELLED',
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const FLOW_TYPES = ['DELIVERY', 'ERRAND', 'BOOKING'] as const;
export type FlowType = (typeof FLOW_TYPES)[number];

export const FULFILLMENT_TYPES = ['DELIVERY', 'PICKUP'] as const;
export type FulfillmentType = (typeof FULFILLMENT_TYPES)[number];

export const PAYMENT_METHODS = ['COD', 'CARD', 'WALLET'] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const PAYMENT_STATUSES = ['PENDING', 'PAID', 'FAILED', 'REFUNDED'] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export const STORE_STATUSES = ['PENDING', 'ACTIVE', 'SUSPENDED', 'CLOSED'] as const;
export type StoreStatus = (typeof STORE_STATUSES)[number];

/** PICKUP_POINT = a named shop the customer can point an errand at; CATALOG = a browsable store with products + its own dashboard. */
export const STORE_LISTING_TYPES = ['PICKUP_POINT', 'CATALOG'] as const;
export type StoreListingType = (typeof STORE_LISTING_TYPES)[number];

export const ASSIGNMENT_STATUSES = ['ASSIGNED', 'PICKED_UP', 'DELIVERED', 'CANCELLED'] as const;
export type AssignmentStatus = (typeof ASSIGNMENT_STATUSES)[number];

export const FEE_PAYERS = ['RECIPIENT', 'SENDER'] as const;
export type FeePayer = (typeof FEE_PAYERS)[number];

export const USER_STATUSES = ['ACTIVE', 'BLOCKED'] as const;
export type UserStatus = (typeof USER_STATUSES)[number];
