/**
 * Realtime contract (docs/architecture/06). Sockets are read-only hints;
 * REST is the single write path. Event names are stable; payloads only grow.
 */
export const RT_EVENTS = {
  orderNew: 'order:new',
  orderStatus: 'order:status',
  orderAssigned: 'order:assigned',
  orderCancelled: 'order:cancelled',
  storeAvailability: 'store:availability',
  notificationNew: 'notification:new',
  courierPing: 'courier:ping', // client→server: courier reports GPS
  courierLocation: 'courier:location', // server→room: relayed courier position
  orderOffer: 'order:offer', // server→courier: an order is offered to you
  orderOfferRevoked: 'order:offer_revoked', // server→courier: offer taken back
} as const;

export const rtRooms = {
  user: (userId: string) => `user:${userId}`,
  store: (storeId: string) => `store:${storeId}`,
  order: (orderId: string) => `order:${orderId}`,
  courier: (userId: string) => `courier:${userId}`,
  admin: 'admin' as const,
};
