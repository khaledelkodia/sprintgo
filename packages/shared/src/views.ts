import type {
  FlowType,
  FulfillmentType,
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
  StoreListingType,
  UserStatus,
  VehicleType,
} from './enums';
import type { ServiceTypeConfig } from './schemas/service-type-config.schema';

/**
 * API response shapes ("views") — the exact JSON the web app consumes.
 * Kept here so the frontend imports typed responses from the contract,
 * never redeclaring them (docs/architecture/01 §4).
 */

export interface ServiceTypeView {
  id: string;
  slug: string;
  nameAr: string;
  nameEn: string;
  icon: string;
  flowType: FlowType;
  config: ServiceTypeConfig;
  sortOrder: number;
}

export interface ZoneView {
  id: string;
  city: string;
  nameAr: string;
  nameEn: string | null;
}

/** Zone as the admin manages it (includes inactive + coordinates). */
export interface ZoneAdminRow {
  id: string;
  city: string;
  nameAr: string;
  nameEn: string | null;
  lat: number | null;
  lng: number | null;
  isActive: boolean;
  ordersCount: number;
}

export interface StoreCardView {
  id: string;
  slug: string;
  name: string;
  listingType: StoreListingType;
  logoUrl: string | null;
  coverUrl: string | null;
  ratingAvg: number;
  ratingCount: number;
  minOrderTotal: number;
  prepTimeMins: number;
  isAcceptingOrders: boolean;
  isOpenNow: boolean;
  serviceType: { slug: string; nameAr: string };
  /** null when the store doesn't serve the requested zone */
  delivery: { fee: number; etaMins: number | null } | null;
}

/** A shop the customer can point an errand at ("هات من ..."). */
export interface ErrandSourceView {
  id: string;
  name: string;
  listingType: StoreListingType;
  addressText: string;
  logoUrl: string | null;
  serviceType: { slug: string; nameAr: string };
}

export interface ProductOptionView {
  id: string;
  name: string;
  priceDelta: number;
  isAvailable: boolean;
}

export interface OptionGroupView {
  id: string;
  name: string;
  minSelect: number;
  maxSelect: number;
  options: ProductOptionView[];
}

export interface ProductView {
  id: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  price: number;
  isAvailable: boolean;
  optionGroups: OptionGroupView[];
}

export interface MenuCategoryView {
  id: string;
  name: string;
  products: ProductView[];
}

export interface StoreDetailView extends StoreCardView {
  description: string | null;
  contactPhone: string;
  addressText: string;
  categories: MenuCategoryView[];
}

export interface AddressView {
  id: string;
  label: string;
  zoneId: string;
  zoneName: string;
  street: string;
  building: string | null;
  floor: string | null;
  apartment: string | null;
  landmark: string | null;
  contactPhone: string | null;
  lat: number | null;
  lng: number | null;
  isDefault: boolean;
}

export interface OrderItemOptionView {
  groupName: string;
  optionName: string;
  priceDelta: number;
}

export interface OrderItemView {
  id: string;
  name: string;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
  options: OrderItemOptionView[];
  notes: string | null;
}

export interface OrderTimelineEntry {
  status: OrderStatus;
  label: string;
  at: string;
  note: string | null;
}

/** Compact shape for the "my orders" list. */
export interface OrderCardView {
  id: string;
  code: string;
  status: OrderStatus;
  statusLabel: string;
  storeName: string | null;
  serviceTypeSlug: string;
  itemsCount: number;
  total: number;
  placedAt: string;
}

/** Full order for the tracking screen. */
export interface OrderView {
  id: string;
  code: string;
  status: OrderStatus;
  statusLabel: string;
  flowType: FlowType;
  fulfillmentType: FulfillmentType;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  store: { name: string; slug: string; contactPhone: string } | null;
  serviceType: { slug: string; nameAr: string };
  addressSnapshot: AddressSnapshot | null;
  items: OrderItemView[];
  customerNotes: string | null;
  subtotal: number;
  deliveryFee: number;
  discount: number;
  total: number;
  placedAt: string;
  estimatedReadyAt: string | null;
  timeline: OrderTimelineEntry[];
  canCancel: boolean;
}

/** Frozen copy of the delivery address stored on the order. */
export interface AddressSnapshot {
  label: string;
  zoneName: string;
  street: string;
  building: string | null;
  floor: string | null;
  apartment: string | null;
  landmark: string | null;
  contactPhone: string | null;
  /** the exact spot, when the customer shared it — powers the courier's map button */
  lat: number | null;
  lng: number | null;
}

// ─────────────── Merchant / Courier / Dispatch views ───────────────

/** Order as the merchant board sees it — adds customer contact + fulfillment. */
export interface MerchantOrderView {
  id: string;
  code: string;
  status: OrderStatus;
  statusLabel: string;
  fulfillmentType: FulfillmentType;
  paymentMethod: PaymentMethod;
  customerName: string | null;
  customerPhone: string;
  addressSnapshot: AddressSnapshot | null;
  customerNotes: string | null;
  items: OrderItemView[];
  subtotal: number;
  deliveryFee: number;
  total: number;
  placedAt: string;
  estimatedReadyAt: string | null;
  hasCourier: boolean;
}

export interface MerchantStatsView {
  ordersCount: number;
  revenue: number;
  avgPrepMins: number;
}

/** A courier's active/assigned task. */
export interface CourierTaskView {
  orderId: string;
  code: string;
  status: OrderStatus;
  assignmentStatus: 'ASSIGNED' | 'PICKED_UP';
  flowType: FlowType;
  pickup: { name: string; phone: string; text: string | null; lat: number | null; lng: number | null } | null;
  dropoff: { name: string; phone: string | null; zoneName: string; street: string; landmark: string | null; lat: number | null; lng: number | null } | null;
  cashToCollect: number;
  purchaseBudget: number | null;
  instructions: string | null;
  assignedAt: string;
  /** the vehicle this job was booked for — null = مشوار عادي */
  vehicleType: VehicleType | null;
}

export interface CourierSummaryView {
  deliveries: number;
  cashInHand: number;
  feesToRemit: number;
}

/** The courier's money picture: today's work + the standing balance owed to the platform. */
export interface CourierWalletView {
  deliveriesToday: number;
  earningsToday: number; // the courier's own profit today (fees − commission)
  cashInHand: number; // net cash the courier is physically holding
  dueToday: number; // المطلوب توريده النهارده — resets each day (today's dues − today's remittances)
  balanceDue: number; // total still owed (all-time unremitted) — powers the block
  remittanceLimit: number; // 0 = no limit
  isBlocked: boolean; // true when balanceDue ≥ limit or the admin suspended them
  blockReason: string | null;
}

/** One day of a courier's work, for the daily report (week view, filter by month). */
export interface CourierDailyReportRow {
  date: string; // YYYY-MM-DD
  deliveries: number;
  earnings: number; // the courier's profit that day
  dues: number; // owed to the platform that day (commission + any goods held)
  remitted: number; // handed in that day
}

/** Live errand price preview. */
export interface ErrandQuoteView {
  deliveryFee: number;
  distanceKm: number | null;
}

/** A courier as the admin settles with them (dues + remittance history). */
export interface DriverSettlementRow {
  id: string;
  name: string | null;
  phone: string;
  status: UserStatus;
  isAvailable: boolean;
  vehicleType: VehicleType;
  deliveries: number;
  earnings: number;
  balanceDue: number;
  totalRemitted: number;
  lastRemittanceAt: string | null;
}

/** An order in the dispatch queue awaiting (or missing) a courier. */
export interface DispatchItemView {
  orderId: string;
  code: string;
  status: OrderStatus;
  flowType: FlowType;
  storeName: string | null;
  zoneName: string | null;
  total: number;
  placedAt: string;
  courier: { id: string; name: string | null; assignmentStatus: string } | null;
}

export interface CourierListItemView {
  id: string;
  name: string | null;
  phone: string;
  isAvailable: boolean;
  activeTasks: number;
  vehicleType: VehicleType;
}

/** An available courier ranked by proximity to an order's pickup point. */
export interface CourierSuggestionView {
  id: string;
  name: string | null;
  phone: string;
  activeTasks: number;
  distanceKm: number | null; // null when the courier hasn't reported a location
  etaMins: number | null;
  vehicleType: VehicleType;
}

export interface NotificationView {
  id: string;
  type: string;
  title: string;
  body: string;
  data: Record<string, unknown> | null;
  read: boolean;
  createdAt: string;
}

// ─────────────── RBAC (roles / staff) views ───────────────

/** One permission the super admin can tick when building a role. */
export interface PermissionView {
  key: string;
  label: string;
}

/** Catalog grouped for the roles editor UI. */
export interface PermissionGroupView {
  group: string;
  permissions: PermissionView[];
}

/** A role = a named, distributable bundle of permission keys. */
export interface AppRoleView {
  id: string;
  nameAr: string;
  description: string | null;
  permissions: string[];
  isSystem: boolean;
  membersCount: number;
}

/** A dashboard staff member and the roles they hold. */
export interface StaffView {
  id: string;
  name: string | null;
  phone: string;
  status: UserStatus;
  isSuperAdmin: boolean;
  roles: { id: string; nameAr: string }[];
  lastLoginAt: string | null;
}

/** Live courier position relayed to an order room (docs/architecture/06 §5). */
export interface CourierLocation {
  orderId: string;
  lat: number;
  lng: number;
  at: number;
}

/** A delivery auto-offered to a courier, awaiting accept/reject. */
export interface CourierOfferView {
  orderId: string;
  code: string;
  flowType: FlowType;
  storeName: string | null;
  pickupText: string | null;
  dropoffZone: string | null;
  /** What the errand is (e.g. "٢ كيلو طماطم") — the courier's task at a glance. */
  instructions: string | null;
  /** The courier's earning for this trip (delivery fee). */
  deliveryFee: number;
  cashToCollect: number;
  distanceKm: number | null;
  etaMins: number | null;
  expiresAt: string;
  /** which vehicle the job needs — null = أي مندوب */
  vehicleType: VehicleType | null;
}

/** The courier's own registration — what they drive decides which jobs reach them. */
export interface CourierProfileView {
  name: string | null;
  phone: string;
  vehicleType: VehicleType;
  isAvailable: boolean;
}

/**
 * Who is bringing the order and where they are right now — the customer's live
 * map. `lat`/`lng` come from the courier's heartbeat, so they are null until the
 * courier's phone has reported a position.
 */
export interface OrderCourierView {
  name: string | null;
  phone: string;
  vehicleType: VehicleType;
  lat: number | null;
  lng: number | null;
  /** when the position was last reported (ISO) — the UI can age it out */
  at: string | null;
}
