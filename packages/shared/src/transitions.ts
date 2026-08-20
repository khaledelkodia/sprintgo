import type { FlowType, OrderStatus, Role } from './enums';

/**
 * Order state machine — one definition consumed by the API guard,
 * the UI buttons, and the tests (docs/architecture/02, §4).
 *
 * Courier transitions additionally require an ACTIVE DeliveryAssignment —
 * that check lives in the API's transitions service, not here.
 */
export type TransitionActor = Role | 'SYSTEM';

export interface TransitionRule {
  to: OrderStatus;
  actors: readonly TransitionActor[];
}

export type TransitionMap = Partial<Record<OrderStatus, readonly TransitionRule[]>>;

const ADMINS = ['ADMIN', 'SUPER_ADMIN'] as const;

export const DELIVERY_TRANSITIONS: TransitionMap = {
  PLACED: [
    { to: 'PREPARING', actors: ['MERCHANT', ...ADMINS] },
    { to: 'CANCELLED', actors: ['CUSTOMER', 'MERCHANT', ...ADMINS, 'SYSTEM'] },
  ],
  PREPARING: [
    { to: 'READY', actors: ['MERCHANT', ...ADMINS] },
    { to: 'CANCELLED', actors: ['MERCHANT', ...ADMINS] },
  ],
  READY: [
    { to: 'OUT_FOR_DELIVERY', actors: ['COURIER', ...ADMINS] },
    // pickup orders: merchant hands over directly to the customer
    { to: 'COMPLETED', actors: ['MERCHANT', ...ADMINS] },
  ],
  OUT_FOR_DELIVERY: [{ to: 'DELIVERED', actors: ['COURIER', ...ADMINS] }],
  DELIVERED: [{ to: 'COMPLETED', actors: ['CUSTOMER', ...ADMINS, 'SYSTEM'] }],
};

export const ERRAND_TRANSITIONS: TransitionMap = {
  PLACED: [
    { to: 'OUT_FOR_DELIVERY', actors: ['COURIER', ...ADMINS] },
    { to: 'CANCELLED', actors: ['CUSTOMER', ...ADMINS, 'SYSTEM'] },
  ],
  OUT_FOR_DELIVERY: [{ to: 'DELIVERED', actors: ['COURIER', ...ADMINS] }],
  DELIVERED: [{ to: 'COMPLETED', actors: ['CUSTOMER', ...ADMINS, 'SYSTEM'] }],
};

export function transitionsFor(flow: FlowType): TransitionMap {
  return flow === 'ERRAND' ? ERRAND_TRANSITIONS : DELIVERY_TRANSITIONS;
}

export function canTransition(
  flow: FlowType,
  from: OrderStatus,
  to: OrderStatus,
  actor: TransitionActor,
): boolean {
  const rules = transitionsFor(flow)[from];
  if (!rules) return false;
  return rules.some((r) => r.to === to && r.actors.includes(actor));
}

/** Terminal statuses — no transitions out. */
export const TERMINAL_STATUSES: readonly OrderStatus[] = ['COMPLETED', 'CANCELLED'];
