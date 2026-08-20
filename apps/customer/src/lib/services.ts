import type { LucideIcon } from 'lucide-react';
import { Bike, Package, Repeat, ShoppingBag, Sofa, Store, Wrench, Zap } from 'lucide-react';

/**
 * The SprintGo service catalog. Each tile maps to ONE of the app's real engines
 * so a tap does what the service actually means — never the same generic form:
 *  - errand-buy : "اشتري لي" (write it, courier buys it)         → /order?mode=buy
 *  - errand-send: "وصّل من مكان لمكان" (a parcel, no purchase)     → /order?mode=send
 *  - catalog    : browse partner stores and order products        → /stores
 *  - soon       : a real idea we haven't launched yet             → /soon (honest)
 */
export type ServiceKind = 'errand-buy' | 'errand-send' | 'catalog' | 'soon';

export interface ServiceDef {
  id: string;
  kind: ServiceKind;
  icon: LucideIcon;
  title: string;
  /** short blurb on the Home grid */
  blurb: string;
  /** longer description on the Services list */
  desc: string;
  color: string;
  /** 145deg gradient pair for the icon tile */
  grad: [string, string];
}

export const SERVICES: ServiceDef[] = [
  {
    id: 'buy',
    kind: 'errand-buy',
    icon: ShoppingBag,
    title: 'اشترِ لي',
    blurb: 'اكتب طلبك والمندوب يجيبه',
    desc: 'اكتب اللي عايزه والسعر، والمندوب يشتريه ويوصّله',
    color: '#EA580C',
    grad: ['#FFEDD5', '#FFF7ED'],
  },
  {
    id: 'package',
    kind: 'errand-send',
    icon: Package,
    title: 'توصيل طرد',
    blurb: 'ابعت حاجة من مكان لمكان',
    desc: 'حدّد مكان الاستلام والتسليم، والمندوب ينقله',
    color: '#2563EB',
    grad: ['#DBEAFE', '#EFF6FF'],
  },
  {
    id: 'stores',
    kind: 'catalog',
    icon: Store,
    title: 'اتسوّق من المحلات',
    blurb: 'افتح المحل واطلب منتجاته',
    desc: 'اتفرّج على محلات دمياط واطلب اللي يعجبك',
    color: '#0D9488',
    grad: ['#CCFBF1', '#F0FDFA'],
  },
  {
    id: 'roundtrip',
    kind: 'errand-send',
    icon: Repeat,
    title: 'استلام وتسليم',
    blurb: 'استلم من حتة وسلّم في حتة',
    desc: 'محطة استلام ومحطة تسليم في مشوار واحد',
    color: '#0891B2',
    grad: ['#CFFAFE', '#ECFEFF'],
  },
  {
    id: 'bike',
    kind: 'errand-send',
    icon: Bike,
    title: 'توصيل سريع',
    blurb: 'الأسرع للحاجات الصغيرة',
    desc: 'مشوار سريع للحاجات الخفيفة',
    color: '#16A34A',
    grad: ['#DCFCE7', '#F0FDF4'],
  },
  {
    id: 'furniture',
    kind: 'soon',
    icon: Sofa,
    title: 'نقل أثاث',
    blurb: 'شاحنة مع عمّال — قريبًا',
    desc: 'شاحنة وعمّال لنقل العفش — بنجهّزها',
    color: '#7C3AED',
    grad: ['#EDE9FE', '#F5F3FF'],
  },
  {
    id: 'home-services',
    kind: 'soon',
    icon: Wrench,
    title: 'خدمات منزلية',
    blurb: 'تنظيف وسباكة — قريبًا',
    desc: 'تنظيف، تكييف، سباكة — بنجهّزها',
    color: '#DB2777',
    grad: ['#FCE7F3', '#FDF2F8'],
  },
  {
    id: 'electricity',
    kind: 'soon',
    icon: Zap,
    title: 'شحن كهرباء',
    blurb: 'شحن العدّاد — قريبًا',
    desc: 'شحن كارت الكهرباء — بنجهّزها',
    color: '#D97706',
    grad: ['#FEF3C7', '#FFFBEB'],
  },
];

/** Where a service tile should go, based on its kind. */
export function serviceRoute(s: ServiceDef): string {
  switch (s.kind) {
    case 'errand-buy':
      return '/order?mode=buy';
    case 'errand-send':
      return '/order?mode=send';
    case 'catalog':
      return '/stores';
    case 'soon':
      return `/soon?s=${encodeURIComponent(s.title)}`;
  }
}

/** inline background for a 145deg icon-tile gradient */
export function tileGradient(grad: [string, string]): string {
  return `linear-gradient(145deg, ${grad[0]}, ${grad[1]})`;
}
