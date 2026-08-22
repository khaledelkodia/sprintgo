import {
  ArrowLeft,
  Bell,
  Check,
  ChevronDown,
  MapPin,
  Navigation,
  RotateCcw,
  Search,
  ShoppingBag,
  Star,
  Store,
  Truck,
  Zap,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { OrderCardView, StoreCardView, ZoneView } from '@sprintgo/shared';
import { formatMoney } from '@sprintgo/shared';
import { SERVICES, serviceRoute, tileGradient } from '../lib/services';
import { getStores } from '../lib/catalog';
import { getZones, listMyOrders } from '../lib/orders';
import { unreadCount } from '../lib/notifications';
import { useAuth } from '../lib/auth';

const ZONE_KEY = 'sg_zone';
/** Statuses that mean the order is still happening — anything else is history. */
const LIVE: string[] = ['PLACED', 'PREPARING', 'READY', 'OUT_FOR_DELIVERY'];

/** "صباح الخير" before noon, "مساء الخير" after — the way people actually greet. */
function greeting(): string {
  return new Date().getHours() < 12 ? 'صباح الخير' : 'مساء الخير';
}

export function HomeScreen() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [featured, setFeatured] = useState<StoreCardView[]>([]);
  const [zones, setZones] = useState<ZoneView[]>([]);
  const [zoneId, setZoneId] = useState<string>(() => {
    try {
      return localStorage.getItem(ZONE_KEY) ?? '';
    } catch {
      return '';
    }
  });
  const [zoneOpen, setZoneOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const [active, setActive] = useState<OrderCardView | null>(null);

  useEffect(() => {
    getZones().then(setZones).catch(() => {});
  }, []);

  useEffect(() => {
    if (!user) {
      setActive(null);
      return;
    }
    unreadCount()
      .then((r) => setUnread(r.count))
      .catch(() => {});
    // the live order gets a card at the top — one tap back into tracking
    listMyOrders()
      .then((list) => setActive(list.find((o) => LIVE.includes(o.status)) ?? null))
      .catch(() => {});
  }, [user]);

  // the chosen zone decides which stores actually deliver to you
  useEffect(() => {
    getStores(zoneId ? { zoneId } : undefined)
      .then((s) => setFeatured(s.slice(0, 6)))
      .catch(() => {});
  }, [zoneId]);

  function pickZone(id: string) {
    setZoneId(id);
    try {
      localStorage.setItem(ZONE_KEY, id);
    } catch {
      /* storage unavailable — the choice just won't survive a restart */
    }
    setZoneOpen(false);
  }

  const zoneName = zones.find((z) => z.id === zoneId)?.nameAr ?? 'اختار منطقتك';
  const firstName = user?.name?.trim().split(' ')[0] ?? '';

  return (
    <div style={{ paddingBottom: 24 }}>
      {/* header */}
      <div
        style={{
          padding: '12px 20px 0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div>
          <div style={{ fontSize: 26, fontWeight: 800, color: '#0F172A', lineHeight: 1.15 }}>
            {greeting()}{firstName ? `، ${firstName}` : ''}
          </div>
          <button
            type="button"
            onClick={() => setZoneOpen(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              marginTop: 8,
              color: '#64748B',
              fontSize: 14,
              background: 'none',
              border: 'none',
              padding: 0,
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            <MapPin size={16} strokeWidth={1.75} color="#2563EB" />
            <span style={{ fontWeight: 600, color: '#334155' }}>{zoneName}</span>
            <ChevronDown size={15} strokeWidth={1.75} />
          </button>
        </div>
        <button
          type="button"
          onClick={() => navigate('/notifications')}
          aria-label="الإشعارات"
          style={{
            position: 'relative',
            width: 52,
            height: 52,
            borderRadius: 999,
            background: '#fff',
            boxShadow: '0 8px 20px rgba(15,23,42,.1)',
            display: 'grid',
            placeItems: 'center',
            color: '#334155',
            border: 'none',
            cursor: 'pointer',
            flex: 'none',
          }}
        >
          <Bell size={24} strokeWidth={1.75} />
          {unread > 0 && (
            <span
              style={{
                position: 'absolute',
                top: 8,
                insetInlineEnd: 8,
                minWidth: 20,
                height: 20,
                borderRadius: 999,
                background: '#EF4444',
                color: '#fff',
                fontSize: 11,
                fontWeight: 800,
                display: 'grid',
                placeItems: 'center',
                padding: '0 5px',
                border: '2px solid #fff',
              }}
            >
              {unread > 9 ? '+9' : unread}
            </span>
          )}
        </button>
      </div>

      {/* zone picker — which stores reach you depends on this */}
      {zoneOpen && (
        <div
          onClick={() => setZoneOpen(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,.45)', zIndex: 50, display: 'flex', alignItems: 'flex-end' }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ width: '100%', background: '#fff', borderRadius: '26px 26px 0 0', padding: '20px 20px 34px', maxHeight: '70vh', overflowY: 'auto' }}
          >
            <div style={{ width: 44, height: 5, borderRadius: 999, background: '#E2E8F0', margin: '0 auto 18px' }} />
            <div style={{ fontSize: 22, fontWeight: 800, color: '#0F172A' }}>بتطلب لفين؟</div>
            <div style={{ fontSize: 14, color: '#64748B', marginTop: 6, marginBottom: 18 }}>
              هنوريك المحلات اللي بتوصّل لمنطقتك.
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {zones.map((z) => {
                const on = z.id === zoneId;
                return (
                  <button
                    key={z.id}
                    type="button"
                    onClick={() => pickZone(z.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      width: '100%',
                      textAlign: 'start',
                      borderRadius: 18,
                      border: `1.5px solid ${on ? '#2563EB' : '#E2E8F0'}`,
                      background: on ? '#EFF6FF' : '#fff',
                      padding: '14px 16px',
                      cursor: 'pointer',
                      fontFamily: 'inherit',
                    }}
                  >
                    <MapPin size={20} strokeWidth={1.75} color={on ? '#2563EB' : '#94A3B8'} />
                    <span style={{ flex: 1, fontSize: 17, fontWeight: 700, color: '#0F172A' }}>{z.nameAr}</span>
                    {on && <Check size={22} strokeWidth={2.5} color="#2563EB" />}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* search → catalog */}
      <div style={{ padding: '20px 20px 0' }}>
        <div
          onClick={() => navigate('/stores')}
          style={{
            height: 58,
            background: '#fff',
            borderRadius: 20,
            boxShadow: 'var(--shadow-card)',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '0 20px',
            cursor: 'pointer',
          }}
        >
          <Search size={22} strokeWidth={1.75} color="#94A3B8" />
          <span style={{ fontSize: 16, color: '#94A3B8' }}>دوّر على محل أو منتج…</span>
        </div>
      </div>

      {/* promo hero */}
      <div style={{ padding: '20px 20px 0' }}>
        <div
          onClick={() => navigate('/order?mode=buy')}
          style={{
            position: 'relative',
            borderRadius: 28,
            overflow: 'hidden',
            background: 'linear-gradient(135deg,#1E40AF 0%,#2563EB 55%,#3B82F6 100%)',
            boxShadow: '0 18px 40px rgba(37,99,235,.32)',
            padding: '26px 24px 24px',
            cursor: 'pointer',
          }}
        >
          <div
            style={{
              position: 'absolute',
              top: -60,
              right: -40,
              width: 190,
              height: 190,
              borderRadius: 999,
              background: 'rgba(255,255,255,.16)',
            }}
          />
          <div
            style={{
              position: 'absolute',
              bottom: -70,
              left: -30,
              width: 150,
              height: 150,
              borderRadius: 999,
              background: 'rgba(249,115,22,.35)',
            }}
          />
          <div style={{ position: 'relative' }}>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                padding: '8px 14px',
                borderRadius: 999,
                background: 'rgba(255,255,255,.22)',
                backdropFilter: 'blur(14px)',
                WebkitBackdropFilter: 'blur(14px)',
                color: '#fff',
                fontSize: 12,
                fontWeight: 600,
              }}
            >
              <Zap size={14} strokeWidth={1.75} /> توصيل مجاني هذا الأسبوع
            </div>
            <div
              style={{
                fontSize: 28,
                fontWeight: 800,
                color: '#fff',
                lineHeight: 1.15,
                marginTop: 16,
                maxWidth: 250,
              }}
            >
              أرسل أي شيء داخل المدينة
            </div>
            <div style={{ fontSize: 15, color: 'rgba(255,255,255,.82)', marginTop: 8 }}>
              لمستان فقط ويصلك المندوب.
            </div>
            <div
              style={{
                marginTop: 20,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 10,
                background: '#fff',
                color: '#1D4ED8',
                padding: '15px 24px',
                borderRadius: 16,
                fontSize: 16,
                fontWeight: 700,
                boxShadow: '0 10px 24px rgba(15,23,42,.18)',
              }}
            >
              ابدأ طلبك <ArrowLeft size={18} strokeWidth={1.75} />
            </div>
          </div>
        </div>
      </div>

      {/* active order */}
      {/* the customer's REAL live order — hidden when there isn't one */}
      {active && (
        <div style={{ padding: '20px 20px 0' }}>
          <div
            onClick={() => navigate(`/track/${active.id}`)}
            style={{ background: '#fff', borderRadius: 26, padding: 18, boxShadow: 'var(--shadow-card-lg)', cursor: 'pointer' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ position: 'relative', width: 58, height: 58, flex: 'none' }}>
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    borderRadius: 999,
                    background: '#22C55E',
                    animation: 'sgPulse 2.4s ease-out infinite',
                  }}
                />
                <div
                  style={{
                    position: 'relative',
                    width: 58,
                    height: 58,
                    borderRadius: 999,
                    background: 'linear-gradient(145deg,#DCFCE7,#E2E8F0)',
                    display: 'grid',
                    placeItems: 'center',
                    color: '#15803D',
                  }}
                >
                  <Truck size={26} strokeWidth={1.75} />
                </div>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#15803D', letterSpacing: '.04em' }}>
                    طلب شغّال
                  </span>
                  <span style={{ width: 6, height: 6, borderRadius: 999, background: '#22C55E' }} />
                  <span dir="ltr" style={{ fontSize: 12, color: '#64748B' }}>{active.code}</span>
                </div>
                <div style={{ fontSize: 18, fontWeight: 700, color: '#0F172A', marginTop: 4 }}>
                  {active.statusLabel}
                </div>
                <div style={{ fontSize: 13, color: '#64748B', marginTop: 2 }}>
                  {active.storeName ?? 'مشوار'} · {formatMoney(active.total)}
                </div>
              </div>
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 16,
                  background: '#2563EB',
                  display: 'grid',
                  placeItems: 'center',
                  color: '#fff',
                  boxShadow: '0 10px 22px rgba(37,99,235,.32)',
                  flex: 'none',
                }}
              >
                <Navigation size={22} strokeWidth={1.75} />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* services */}
      <SectionHeader title="الخدمات" action="عرض الكل" onAction={() => navigate('/services')} />
      <div
        style={{
          padding: '16px 20px 0',
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 14,
        }}
      >
        {SERVICES.map((s) => {
          const Icon = s.icon;
          return (
            <div
              key={s.id}
              onClick={() => navigate(serviceRoute(s))}
              style={{ background: '#fff', borderRadius: 24, padding: 16, boxShadow: 'var(--shadow-card)', cursor: 'pointer' }}
            >
              <div
                style={{
                  width: 60,
                  height: 60,
                  borderRadius: 20,
                  background: tileGradient(s.grad),
                  display: 'grid',
                  placeItems: 'center',
                  color: s.color,
                  marginBottom: 14,
                }}
              >
                <Icon size={30} strokeWidth={1.75} />
              </div>
              <div style={{ fontSize: 17, fontWeight: 700, color: '#0F172A' }}>{s.title}</div>
              <div style={{ fontSize: 12.5, color: '#64748B', marginTop: 4, lineHeight: 1.35 }}>{s.blurb}</div>
            </div>
          );
        })}
      </div>

      {/* quick actions */}
      <div style={{ padding: '30px 20px 0' }}>
        <div style={{ fontSize: 20, fontWeight: 800, color: '#0F172A' }}>إجراءات سريعة</div>
        <div style={{ display: 'flex', gap: 12, marginTop: 14, flexWrap: 'wrap' }}>
          <QuickChip icon={<RotateCcw size={19} strokeWidth={1.75} color="#2563EB" />} label="طلباتي" onClick={() => navigate('/orders')} />
          <QuickChip icon={<ShoppingBag size={19} strokeWidth={1.75} color="#F97316" />} label="اشتري لي" onClick={() => navigate('/order?mode=buy')} />
          <QuickChip icon={<Store size={19} strokeWidth={1.75} color="#0D9488" />} label="المحلات" onClick={() => navigate('/stores')} />
        </div>
      </div>

      {/* recent orders */}
      <SectionHeader title="آخر الطلبات" action="السجل" onAction={() => navigate('/orders')} />
      <div style={{ padding: '14px 20px 0', display: 'flex', flexDirection: 'column', gap: 12 }}>
        <RecentRow
          icon={<Check size={24} strokeWidth={1.75} color="#16A34A" />}
          iconBg="#F0FDF4"
          title="طرد إلى رأس البر"
          sub="أمس · 45 جنيه"
        />
        <RecentRow
          icon={<ShoppingBag size={24} strokeWidth={1.75} color="#EA580C" />}
          iconBg="#FFF7ED"
          title="طلب من الصيدلية"
          sub="2 أغسطس · 90 جنيه"
        />
      </div>

      {/* featured stores → real catalog */}
      {featured.length > 0 && (
        <>
          <SectionHeader title="اتسوّق من المحلات" action="عرض الكل" onAction={() => navigate('/stores')} />
          <div style={{ padding: '14px 0 0', display: 'flex', gap: 14, overflowX: 'auto', paddingRight: 20 }}>
            {featured.map((s) => (
              <StoreCard
                key={s.id}
                name={s.name}
                rating={s.ratingAvg > 0 ? s.ratingAvg.toFixed(1) : 'جديد'}
                time={s.delivery ? `${formatMoney(s.delivery.fee)} توصيل` : `${s.prepTimeMins} دقيقة`}
                onClick={() => navigate(`/store/${s.slug}`)}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function SectionHeader({ title, action, onAction }: { title: string; action: string; onAction?: () => void }) {
  return (
    <div
      style={{
        padding: '30px 20px 0',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}
    >
      <div style={{ fontSize: 20, fontWeight: 800, color: '#0F172A' }}>{title}</div>
      <div style={{ fontSize: 14, fontWeight: 600, color: '#2563EB', cursor: 'pointer' }} onClick={onAction}>
        {action}
      </div>
    </div>
  );
}

function QuickChip({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick?: () => void }) {
  return (
    <div
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        background: '#fff',
        borderRadius: 999,
        padding: '12px 18px',
        boxShadow: 'var(--shadow-soft)',
        fontSize: 15,
        fontWeight: 600,
        color: '#0F172A',
        cursor: 'pointer',
      }}
    >
      {icon} {label}
    </div>
  );
}

function RecentRow({
  icon,
  iconBg,
  title,
  sub,
}: {
  icon: React.ReactNode;
  iconBg: string;
  title: string;
  sub: string;
}) {
  return (
    <div
      style={{
        background: '#fff',
        borderRadius: 22,
        padding: 16,
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        boxShadow: 'var(--shadow-soft)',
        cursor: 'pointer',
      }}
    >
      <div
        style={{
          width: 50,
          height: 50,
          borderRadius: 16,
          background: iconBg,
          display: 'grid',
          placeItems: 'center',
          flex: 'none',
        }}
      >
        {icon}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 16, fontWeight: 700, color: '#0F172A' }}>{title}</div>
        <div style={{ fontSize: 13, color: '#64748B', marginTop: 3 }}>{sub}</div>
      </div>
      <RotateCcw size={20} strokeWidth={1.75} color="#2563EB" />
    </div>
  );
}

function StoreCard({ name, rating, time, onClick }: { name: string; rating: string; time: string; onClick?: () => void }) {
  return (
    <div
      onClick={onClick}
      style={{
        width: 220,
        flex: 'none',
        background: '#fff',
        borderRadius: 24,
        overflow: 'hidden',
        boxShadow: 'var(--shadow-card)',
        cursor: onClick ? 'pointer' : 'default',
      }}
    >
      <div
        style={{
          height: 120,
          background: 'linear-gradient(145deg,#DBEAFE,#EFF6FF)',
          display: 'grid',
          placeItems: 'center',
          color: '#2563EB',
        }}
      >
        <Store size={40} strokeWidth={1.5} />
      </div>
      <div style={{ padding: 14 }}>
        <div style={{ fontSize: 16, fontWeight: 700, color: '#0F172A' }}>{name}</div>
        <div
          style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 6, fontSize: 13, color: '#64748B' }}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#0F172A', fontWeight: 600 }}>
            <Star size={14} strokeWidth={1.75} color="#F97316" /> {rating}
          </span>
          <span>·</span>
          <span>{time}</span>
        </div>
      </div>
    </div>
  );
}
