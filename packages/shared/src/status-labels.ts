import type { FlowType, OrderStatus } from './enums';

/**
 * Customer-facing status copy (ar-EG). Flow-aware:
 * the ERRAND flow overrides some labels (docs/architecture/02, §4).
 * Consumed by the web UI *and* notification texts — one voice everywhere.
 */
const DELIVERY_LABELS: Record<OrderStatus, string> = {
  PLACED: 'استلمنا طلبك',
  PREPARING: 'المحل بيجهّز طلبك',
  READY: 'طلبك جاهز',
  OUT_FOR_DELIVERY: 'طلبك في الطريق إليك',
  DELIVERED: 'تم التوصيل — بالهنا!',
  COMPLETED: 'اكتمل الطلب',
  CANCELLED: 'الطلب اتلغى',
};

const ERRAND_LABELS: Partial<Record<OrderStatus, string>> = {
  PLACED: 'بندوّر لك على مندوب',
  OUT_FOR_DELIVERY: 'المندوب جاب طلبك وجاي لك',
  DELIVERED: 'تم التسليم — في خدمتك دايمًا',
};

export function statusLabel(flow: FlowType, status: OrderStatus): string {
  if (flow === 'ERRAND') return ERRAND_LABELS[status] ?? DELIVERY_LABELS[status];
  return DELIVERY_LABELS[status];
}
