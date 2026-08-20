import type { OrderCardView } from '@sprintgo/shared';
import { formatMoney } from '@sprintgo/shared';
import { Check, ChevronLeft, Navigation, Package } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { listMyOrders } from '../lib/orders';

const ACTIVE = new Set(['PLACED', 'PREPARING', 'READY', 'OUT_FOR_DELIVERY']);

export function OrdersScreen() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<OrderCardView[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'current' | 'past'>('current');

  useEffect(() => {
    listMyOrders()
      .then(setOrders)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const current = orders.filter((o) => ACTIVE.has(o.status));
  const past = orders.filter((o) => !ACTIVE.has(o.status));
  const shown = tab === 'current' ? current : past;

  return (
    <div style={{ paddingBottom: 20 }}>
      <div style={{ padding: '18px 20px 0' }}>
        <div style={{ fontSize: 30, fontWeight: 800, color: '#0F172A' }}>الطلبات</div>
      </div>

      <div style={{ padding: '18px 20px 0' }}>
        <div style={{ background: '#EEF2F7', borderRadius: 18, padding: 5, display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
          {(['current', 'past'] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              style={{
                height: 44,
                borderRadius: 14,
                border: 'none',
                cursor: 'pointer',
                background: tab === t ? '#fff' : 'transparent',
                boxShadow: tab === t ? '0 4px 12px rgba(15,23,42,.08)' : 'none',
                fontSize: 15,
                fontWeight: tab === t ? 700 : 600,
                color: tab === t ? '#0F172A' : '#64748B',
              }}
            >
              {t === 'current' ? `الحالية${current.length ? ` (${current.length})` : ''}` : 'السابقة'}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div style={{ padding: '40px 20px', textAlign: 'center', color: '#94A3B8' }}>لحظة، بنجيب طلباتك…</div>
      ) : shown.length === 0 ? (
        <div style={{ padding: '60px 36px', textAlign: 'center' }}>
          <div style={{ width: 90, height: 90, borderRadius: 28, margin: '0 auto 20px', background: 'linear-gradient(145deg,#EFF6FF,#F8FAFC)', display: 'grid', placeItems: 'center', color: '#2563EB' }}>
            <Package size={40} strokeWidth={1.5} />
          </div>
          <div style={{ fontSize: 20, fontWeight: 800, color: '#0F172A' }}>لسه مفيش طلبات</div>
          <div style={{ fontSize: 15, color: '#64748B', marginTop: 8 }}>أول ما تطلب مشوار هتلاقيه هنا بالتتبع المباشر.</div>
          <button type="button" onClick={() => navigate('/order')} className="sg-btn sg-btn-primary" style={{ width: '100%', marginTop: 24 }}>
            اطلب مشوار
          </button>
        </div>
      ) : (
        <div style={{ padding: '18px 20px 0', display: 'flex', flexDirection: 'column', gap: 12 }}>
          {shown.map((o) => {
            const active = ACTIVE.has(o.status);
            return (
              <div
                key={o.id}
                onClick={() => active && navigate(`/track/${o.id}`)}
                className="sg-card"
                style={{ padding: 18, cursor: active ? 'pointer' : 'default' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: active ? '#F0FDF4' : '#F1F5F9', borderRadius: 999, padding: '7px 14px' }}>
                    <span style={{ width: 7, height: 7, borderRadius: 999, background: active ? '#22C55E' : '#94A3B8' }} />
                    <span style={{ fontSize: 12.5, fontWeight: 700, color: active ? '#15803D' : '#64748B' }}>{o.statusLabel}</span>
                  </div>
                  <div dir="ltr" style={{ fontSize: 13, color: '#94A3B8', fontWeight: 600 }}>#{o.code}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 16 }}>
                  <div style={{ width: 50, height: 50, borderRadius: 16, background: active ? 'linear-gradient(145deg,#DBEAFE,#EFF6FF)' : '#F0FDF4', display: 'grid', placeItems: 'center', color: active ? '#2563EB' : '#16A34A', flex: 'none' }}>
                    {active ? <Package size={26} strokeWidth={1.75} /> : <Check size={26} strokeWidth={1.75} />}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 16, fontWeight: 700, color: '#0F172A' }}>{o.storeName ?? 'مشوار'}</div>
                    <div style={{ fontSize: 13, color: '#64748B', marginTop: 3 }}>
                      {new Date(o.placedAt).toLocaleDateString('ar-EG', { day: 'numeric', month: 'long' })} · {formatMoney(o.total)}
                    </div>
                  </div>
                  {active ? <Navigation size={20} strokeWidth={1.75} color="#2563EB" /> : <ChevronLeft size={20} strokeWidth={1.75} color="#CBD5E1" />}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
