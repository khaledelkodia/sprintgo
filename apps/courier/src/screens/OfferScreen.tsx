import type { CourierOfferView } from '@sprintgo/shared';
import { formatMoney, vehicleLabel } from '@sprintgo/shared';
import { Banknote, Check, MapPin, Package, ShoppingBasket, Truck, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { acceptOffer, getOffer, rejectOffer } from '../lib/courier';

const R = 34;
const C = 2 * Math.PI * R;

export function OfferScreen() {
  const navigate = useNavigate();
  const [offer, setOffer] = useState<CourierOfferView | null>(null);
  const [secs, setSecs] = useState(30);
  const [total, setTotal] = useState(30);
  const [acting, setActing] = useState(false);
  const tick = useRef<ReturnType<typeof setInterval>>();

  useEffect(() => {
    let alive = true;
    getOffer()
      .then((o) => {
        if (!alive) return;
        if (!o) return navigate('/', { replace: true });
        const t = new Date(o.expiresAt).getTime();
        const remain = Number.isFinite(t) ? Math.max(0, Math.round((t - Date.now()) / 1000)) : 30;
        if (remain <= 0) return navigate('/', { replace: true }); // expired/stale → dismiss
        setOffer(o);
        setSecs(remain);
        setTotal(remain);
      })
      .catch(() => alive && navigate('/', { replace: true }));
    return () => {
      alive = false;
    };
  }, [navigate]);

  useEffect(() => {
    if (!offer) return;
    tick.current = setInterval(() => {
      setSecs((s) => {
        if (s <= 1) {
          clearInterval(tick.current);
          navigate('/', { replace: true });
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(tick.current);
  }, [offer, navigate]);

  async function decide(accept: boolean) {
    if (!offer || acting) return;
    setActing(true);
    try {
      if (accept) {
        await acceptOffer(offer.orderId);
        navigate('/active', { replace: true });
      } else {
        await rejectOffer(offer.orderId);
        navigate('/', { replace: true });
      }
    } catch {
      navigate('/', { replace: true });
    }
  }

  if (!offer) return <div className="sg-screen" />;
  const offset = C * (1 - secs / total);
  const isErrand = offer.flowType === 'ERRAND';

  return (
    <div className="sg-screen" style={{ justifyContent: 'space-between' }}>
      <div style={{ padding: '20px 20px 0', textAlign: 'center' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#EFF6FF', color: '#1D4ED8', padding: '8px 16px', borderRadius: 999, fontSize: 13, fontWeight: 700 }}>
          <Package size={16} strokeWidth={1.75} /> طلب جديد قريب منك
        </div>
        <div style={{ position: 'relative', width: 88, height: 88, margin: '22px auto 0' }}>
          <svg width={88} height={88} style={{ transform: 'rotate(-90deg)' }}>
            <circle cx={44} cy={44} r={R} fill="none" stroke="#E2E8F0" strokeWidth={7} />
            <circle cx={44} cy={44} r={R} fill="none" stroke="#2563EB" strokeWidth={7} strokeLinecap="round" strokeDasharray={C} strokeDashoffset={offset} style={{ transition: 'stroke-dashoffset 1s linear' }} />
          </svg>
          <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', fontSize: 30, fontWeight: 800, color: '#0F172A' }}>{secs}</div>
        </div>
        <div style={{ fontSize: 14, color: '#64748B', marginTop: 10 }}>الوقت المتبقي للقبول</div>
      </div>

      <div className="sg-scroll" style={{ padding: '10px 20px 0' }}>
        {/* the courier's earning for this trip */}
        <div className="sg-card" style={{ padding: 22, textAlign: 'center' }}>
          <div style={{ fontSize: 13, color: '#64748B', fontWeight: 600 }}>{isErrand ? 'مكسبك من التوصيلة' : 'المطلوب تحصيله من العميل'}</div>
          <div style={{ fontSize: 42, fontWeight: 800, color: '#16A34A', lineHeight: 1.1, marginTop: 4 }}>
            {formatMoney(isErrand ? offer.deliveryFee : offer.cashToCollect ?? 0)}
          </div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, marginTop: 12, background: '#FFF7ED', color: '#C2410C', padding: '8px 14px', borderRadius: 999, fontSize: 13, fontWeight: 700 }}>
            <Banknote size={16} strokeWidth={1.75} />
            {offer.distanceKm != null ? `${offer.distanceKm.toFixed(1)} كم` : 'قريب'}{offer.etaMins != null ? ` · ${offer.etaMins} دقيقة` : ''}
          </div>
        </div>

        {/* what to get */}
        {isErrand && offer.instructions && (
          <div className="sg-card" style={{ padding: 18, marginTop: 14, display: 'flex', gap: 14, alignItems: 'flex-start' }}>
            <div style={{ width: 46, height: 46, borderRadius: 14, background: '#EFF6FF', display: 'grid', placeItems: 'center', color: '#2563EB', flex: 'none' }}>
              <ShoppingBasket size={22} strokeWidth={1.75} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#94A3B8' }}>المطلوب</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#0F172A', marginTop: 2, lineHeight: 1.5 }}>{offer.instructions}</div>
            </div>
          </div>
        )}

        {/* نقل: which vehicle this job was booked for */}
        {offer.vehicleType && (
          <div
            className="sg-card"
            style={{ padding: 18, marginTop: 14, display: 'flex', gap: 14, alignItems: 'center' }}
          >
            <div style={{ width: 46, height: 46, borderRadius: 14, background: '#EDE9FE', display: 'grid', placeItems: 'center', color: '#5B21B6', flex: 'none' }}>
              <Truck size={22} strokeWidth={1.75} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#94A3B8' }}>نقل بـ</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#0F172A', marginTop: 2 }}>{vehicleLabel(offer.vehicleType)}</div>
            </div>
          </div>
        )}

        {/* where to deliver */}
        <div className="sg-card" style={{ padding: 18, marginTop: 14, display: 'flex', gap: 14, alignItems: 'center' }}>
          <div style={{ width: 46, height: 46, borderRadius: 14, background: '#FFF7ED', display: 'grid', placeItems: 'center', color: '#EA580C', flex: 'none' }}>
            <MapPin size={22} strokeWidth={2} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#94A3B8' }}>التسليم</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#0F172A', marginTop: 2 }}>{offer.dropoffZone ?? '—'}</div>
            {offer.pickupText && (
              <div style={{ fontSize: 13, color: '#64748B', marginTop: 4 }}>الاستلام: {offer.pickupText}</div>
            )}
          </div>
        </div>
      </div>

      <div style={{ padding: '16px 20px 34px', display: 'flex', gap: 12 }}>
        <button type="button" onClick={() => decide(false)} disabled={acting} className="sg-btn sg-btn-secondary" style={{ flex: 1 }}>
          <X size={20} strokeWidth={2} /> رفض
        </button>
        <button type="button" onClick={() => decide(true)} disabled={acting} className="sg-btn sg-btn-success" style={{ flex: 2 }}>
          قبول التوصيلة <Check size={22} strokeWidth={2} />
        </button>
      </div>
    </div>
  );
}
