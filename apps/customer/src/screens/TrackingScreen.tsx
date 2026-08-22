import { formatMoney, vehicleLabel } from '@sprintgo/shared';
import type { OrderCourierView, OrderView } from '@sprintgo/shared';
import { Check, ChevronRight, MapPin, PartyPopper, Phone, Truck, X } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { cancelOrder, getOrder, getOrderCourier } from '../lib/orders';
import { useOrderRoom, useRealtimeEvent } from '../lib/realtime';
import { CourierMap } from '../components/CourierMap';

export function TrackingScreen() {
  const navigate = useNavigate();
  const { id = '' } = useParams();
  const [order, setOrder] = useState<OrderView | null>(null);
  const [courier, setCourier] = useState<OrderCourierView | null>(null);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    getOrder(id)
      .then(setOrder)
      .catch(() => setError('حصلت مشكلة بسيطة في تحميل حالة الطلب'));
    // who is bringing it + where they are; null until a courier accepts
    getOrderCourier(id)
      .then(setCourier)
      .catch(() => {});
  }, [id]);

  // one read on open; after that the server tells us when something changed —
  // no polling, so a screen left open all evening costs nothing
  useEffect(load, [load]);
  useOrderRoom(id);
  useRealtimeEvent('order:status', load);
  useRealtimeEvent('order:assigned', load);
  useRealtimeEvent('order:cancelled', load);
  // a dropped socket may have missed an event — catch up once on reconnect
  useRealtimeEvent('connect', load);

  // the courier's position arrives as coordinates; no need to refetch anything
  useRealtimeEvent('courier:location', (payload) => {
    const p = payload as { orderId?: string; lat?: number; lng?: number };
    if (p?.orderId !== id || typeof p.lat !== 'number' || typeof p.lng !== 'number') return;
    setCourier((c) => (c ? { ...c, lat: p.lat!, lng: p.lng!, at: new Date().toISOString() } : c));
  });

  const status = order?.status;
  const searching = status === 'PLACED' || status === 'PREPARING' || status === 'READY';
  const onWay = status === 'OUT_FOR_DELIVERY';
  const done = status === 'DELIVERED' || status === 'COMPLETED';
  const cancelled = status === 'CANCELLED';

  async function onCancel() {
    if (!order) return;
    try {
      await cancelOrder(order.id);
      navigate('/', { replace: true });
    } catch {
      setError('الإلغاء مش متاح دلوقتي');
    }
  }

  return (
    <div className="sg-screen">
      <div style={{ padding: '14px 20px 0' }}>
        <button type="button" onClick={() => navigate('/')} style={backBtn}>
          <ChevronRight size={24} strokeWidth={1.75} color="#0F172A" />
        </button>
      </div>

      {/* searching for a courier */}
      {searching && (
        <div style={center}>
          <Radar />
          <div style={{ fontSize: 26, fontWeight: 800, color: '#0F172A', marginTop: 32 }}>بندوّرلك على أقرب مندوب</div>
          <div style={{ fontSize: 16, color: '#64748B', marginTop: 10, lineHeight: 1.5 }}>
            عادةً أقل من دقيقة، وأول ما مندوب يقبل هنبلّغك فورًا.
          </div>
          {order && (
            <div className="sg-card" style={{ padding: 16, marginTop: 28, width: '100%', textAlign: 'start' }}>
              <div style={{ fontSize: 13, color: '#94A3B8' }}>رقم الطلب</div>
              <div dir="ltr" style={{ fontSize: 16, fontWeight: 700, color: '#0F172A' }}>#{order.code}</div>
            </div>
          )}
        </div>
      )}

      {/* courier on the way */}
      {onWay && order && (
        <div className="sg-scroll" style={{ padding: '10px 20px 0' }}>
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <div style={{ width: 92, height: 92, borderRadius: 32, margin: '0 auto', background: 'linear-gradient(145deg,#DBEAFE,#EFF6FF)', display: 'grid', placeItems: 'center', color: '#2563EB' }}>
              <Truck size={46} strokeWidth={1.75} />
            </div>
            <div style={{ fontSize: 26, fontWeight: 800, color: '#0F172A', marginTop: 18 }}>المندوب في الطريق</div>
            <div style={{ fontSize: 15, color: '#64748B', marginTop: 6 }}>مشوارك بدأ — تقدر تتابعه من هنا.</div>
          </div>

          {/* who is bringing it — with a one-tap call, the way elderly users prefer */}
          {courier && (
            <div className="sg-card" style={{ padding: 16, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 14 }}>
              <div
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: 999,
                  background: 'linear-gradient(145deg,#DBEAFE,#F1F5F9)',
                  display: 'grid',
                  placeItems: 'center',
                  fontSize: 22,
                  fontWeight: 800,
                  color: '#2563EB',
                  flex: 'none',
                }}
              >
                {(courier.name ?? '؟').slice(0, 1)}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 17, fontWeight: 800, color: '#0F172A' }}>{courier.name ?? 'المندوب'}</div>
                <div style={{ fontSize: 13, color: '#64748B', marginTop: 2 }}>{vehicleLabel(courier.vehicleType)}</div>
              </div>
              <a
                href={`tel:${courier.phone}`}
                aria-label="اتصل بالمندوب"
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: 18,
                  background: '#22C55E',
                  display: 'grid',
                  placeItems: 'center',
                  color: '#fff',
                  flex: 'none',
                  boxShadow: '0 8px 18px rgba(34,197,94,.35)',
                }}
              >
                <Phone size={24} strokeWidth={2} />
              </a>
            </div>
          )}

          {/* live map — only once the courier's phone has actually reported a position */}
          {courier?.lat != null && courier.lng != null && (
            <div style={{ marginBottom: 14 }}>
              <CourierMap
                lat={courier.lat}
                lng={courier.lng}
                dropLat={order.addressSnapshot?.lat}
                dropLng={order.addressSnapshot?.lng}
              />
            </div>
          )}

          <Timeline order={order} />
        </div>
      )}

      {/* delivered */}
      {done && (
        <div style={center}>
          <div style={{ width: 100, height: 100, borderRadius: 999, background: 'linear-gradient(145deg,#DCFCE7,#F0FDF4)', display: 'grid', placeItems: 'center', color: '#16A34A' }}>
            <PartyPopper size={48} strokeWidth={1.75} />
          </div>
          <div style={{ fontSize: 28, fontWeight: 800, color: '#0F172A', marginTop: 24 }}>اتسلّم بنجاح 🎉</div>
          <div style={{ fontSize: 16, color: '#64748B', marginTop: 10 }}>شكراً إنك اخترت سبرنت جو 🌟</div>
        </div>
      )}

      {cancelled && (
        <div style={center}>
          <div style={{ width: 92, height: 92, borderRadius: 999, background: '#FEF2F2', display: 'grid', placeItems: 'center', color: '#DC2626' }}>
            <X size={46} strokeWidth={2} />
          </div>
          <div style={{ fontSize: 26, fontWeight: 800, color: '#0F172A', marginTop: 22 }}>الطلب اتلغى</div>
        </div>
      )}

      {error && !order && <div style={{ ...center, color: '#DC2626', fontWeight: 600 }}>{error}</div>}

      {/* footer actions */}
      {order && (
        <div style={{ padding: '16px 20px 34px' }}>
          {onWay && (
            <div className="sg-card" style={{ padding: 16, display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
              <div style={{ width: 44, height: 44, borderRadius: 14, background: '#EFF6FF', display: 'grid', placeItems: 'center', color: '#2563EB' }}>
                <MapPin size={22} strokeWidth={1.75} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: '#0F172A' }}>التسليم إلى</div>
                <div style={{ fontSize: 13, color: '#64748B' }}>{order.addressSnapshot?.zoneName} · {order.addressSnapshot?.street}</div>
              </div>
              <div style={{ fontSize: 16, fontWeight: 800, color: '#0F172A' }}>{formatMoney(order.total)}</div>
            </div>
          )}
          {searching && order.canCancel && (
            <button type="button" onClick={onCancel} style={{ width: '100%', height: 56, borderRadius: 18, background: '#F1F5F9', color: '#475569', border: 'none', fontSize: 16, fontWeight: 700, cursor: 'pointer' }}>
              إلغاء الطلب
            </button>
          )}
          {done && (
            <button type="button" onClick={() => navigate('/')} className="sg-btn sg-btn-primary" style={{ width: '100%' }}>
              تمام <Check size={20} strokeWidth={2} />
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function Timeline({ order }: { order: OrderView }) {
  const steps = order.timeline ?? [];
  return (
    <div className="sg-card" style={{ padding: 18 }}>
      {steps.map((s, i) => (
        <div key={i} style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{ width: 12, height: 12, borderRadius: 999, background: '#22C55E' }} />
            {i < steps.length - 1 && <div style={{ width: 2, height: 28, background: '#E2E8F0' }} />}
          </div>
          <div style={{ paddingBottom: i < steps.length - 1 ? 14 : 0 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#0F172A' }}>{s.label}</div>
            <div style={{ fontSize: 12, color: '#94A3B8', marginTop: 2 }}>{new Date(s.at).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

function Radar() {
  return (
    <div style={{ position: 'relative', width: 180, height: 180, display: 'grid', placeItems: 'center' }}>
      <div style={{ position: 'absolute', width: 180, height: 180, borderRadius: 999, background: '#2563EB', animation: 'sgPulse 2.6s ease-out infinite' }} />
      <div style={{ position: 'absolute', width: 180, height: 180, borderRadius: 999, background: '#2563EB', animation: 'sgPulse 2.6s ease-out infinite', animationDelay: '.9s' }} />
      <div style={{ position: 'absolute', width: 160, height: 160, borderRadius: 999, border: '4px solid #E2E8F0', borderTopColor: '#2563EB', animation: 'sgSpin 1.4s linear infinite' }} />
      <div style={{ position: 'relative', width: 88, height: 88, borderRadius: 30, background: '#fff', boxShadow: '0 18px 40px rgba(37,99,235,.22)', display: 'grid', placeItems: 'center', color: '#2563EB' }}>
        <Truck size={44} strokeWidth={1.75} />
      </div>
    </div>
  );
}

const center: React.CSSProperties = {
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  textAlign: 'center',
  padding: '0 32px',
};

const backBtn: React.CSSProperties = {
  width: 44,
  height: 44,
  borderRadius: 14,
  background: '#fff',
  boxShadow: '0 8px 20px rgba(15,23,42,.07)',
  display: 'grid',
  placeItems: 'center',
  border: 'none',
  cursor: 'pointer',
};
