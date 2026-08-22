import type { CourierTaskView } from '@sprintgo/shared';
import { formatMoney, poundsToPiasters, vehicleLabel } from '@sprintgo/shared';
import { Banknote, Check, ChevronRight, MapPin, Phone, ShoppingBasket, Truck } from 'lucide-react';
import { MapLink } from '../components/MapLink';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { enterGoodsCost, getTasks, markDelivered, pickupTask } from '../lib/courier';
import { useHeartbeat } from '../lib/useHeartbeat';
import { useRealtimeEvent } from '../lib/realtime';

export function ActiveDeliveryScreen() {
  const navigate = useNavigate();
  const [task, setTask] = useState<CourierTaskView | null>(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const [cost, setCost] = useState('');
  const [error, setError] = useState('');

  function load() {
    getTasks()
      .then((t) => {
        const first = t[0] ?? null;
        setTask(first);
        // pre-fill the goods cost with the price the customer expected, if any
        if (first?.purchaseBudget && first.purchaseBudget > 0) {
          setCost((c) => c || String(Math.round(first.purchaseBudget! / 100)));
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }
  useEffect(load, []);

  // a live delivery is exactly when the customer is watching the map
  useHeartbeat(true, task?.orderId);

  // the customer may cancel while we are on the way — hear it instead of polling
  useRealtimeEvent('order:status', load);
  useRealtimeEvent('order:cancelled', load);
  const pickedUp = task?.assignmentStatus === 'PICKED_UP';
  const isErrand = task?.flowType === 'ERRAND';
  // a specific pickup place was named (customer's optional spot, or a store); otherwise the
  // courier just buys the item from anywhere — there is no "pickup from X" step.
  const pickupPlace = task?.pickup?.name && task.pickup.name !== 'نقطة الاستلام' ? task.pickup.name : task?.pickup?.text || '';
  const hasPickupPlace = pickupPlace.trim().length > 0;

  async function advance() {
    if (!task || acting) return;
    setError('');

    if (!pickedUp) {
      // step 1 — courier got the order. For a purchase errand, record what they paid first.
      if (isErrand) {
        const pounds = Number(cost);
        if (!cost.trim() || !Number.isFinite(pounds) || pounds < 0) {
          return setError('اكتب المبلغ اللي دفعته في الطلب من فضلك');
        }
        setActing(true);
        try {
          await enterGoodsCost(task.orderId, poundsToPiasters(pounds));
          await pickupTask(task.orderId);
          load();
        } catch {
          setError('حصلت مشكلة بسيطة، حاوِل تاني من فضلك');
        } finally {
          setActing(false);
        }
        return;
      }
      // catalog order — just confirm pickup
      setActing(true);
      try {
        await pickupTask(task.orderId);
        load();
      } catch {
        setError('حصلت مشكلة بسيطة، حاوِل تاني من فضلك');
      } finally {
        setActing(false);
      }
      return;
    }

    // step 2 — delivered to the customer
    setActing(true);
    try {
      await markDelivered(task.orderId);
      navigate('/', { replace: true });
    } catch {
      setError('حصلت مشكلة بسيطة، حاوِل تاني من فضلك');
    } finally {
      setActing(false);
    }
  }

  if (loading) return <div className="sg-screen" />;
  if (!task) {
    return (
      <div className="sg-screen" style={{ alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: 32 }}>
        <div style={{ fontSize: 20, fontWeight: 700, color: '#0F172A' }}>مفيش توصيلة جارية</div>
        <button type="button" onClick={() => navigate('/')} className="sg-btn sg-btn-primary" style={{ width: '100%', marginTop: 20 }}>الرجوع للرئيسية</button>
      </div>
    );
  }

  const stepTitle = pickedUp
    ? 'وصّل الطلب للعميل'
    : isErrand
      ? hasPickupPlace ? `روح هات الطلب من ${pickupPlace}` : 'روح هات الطلب'
      : `روح استلم من ${pickupPlace || 'المحل'}`;
  const stepKicker = pickedUp ? 'التسليم للعميل' : isErrand ? 'إحضار الطلب' : 'استلام الطلب';

  return (
    <div className="sg-screen">
      <div style={{ padding: '14px 20px 0' }}>
        <button type="button" onClick={() => navigate('/')} style={{ width: 44, height: 44, borderRadius: 14, background: '#fff', boxShadow: '0 8px 20px rgba(15,23,42,.07)', display: 'grid', placeItems: 'center', border: 'none', cursor: 'pointer' }}>
          <ChevronRight size={24} strokeWidth={1.75} color="#0F172A" />
        </button>
      </div>

      <div className="sg-scroll" style={{ padding: '18px 20px 0' }}>
        {/* progress */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 20 }}>
          <div style={{ height: 6, flex: 1, borderRadius: 999, background: '#2563EB' }} />
          <div style={{ height: 6, flex: 1, borderRadius: 999, background: pickedUp ? '#2563EB' : '#E2E8F0' }} />
        </div>

        <div style={{ fontSize: 13, fontWeight: 700, color: '#2563EB' }}>{stepKicker}</div>
        <div style={{ fontSize: 26, fontWeight: 800, color: '#0F172A', marginTop: 4 }}>{stepTitle}</div>
        {task.vehicleType && (
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 7,
              marginTop: 10,
              background: '#EDE9FE',
              color: '#5B21B6',
              borderRadius: 999,
              padding: '7px 14px',
              fontSize: 14,
              fontWeight: 800,
            }}
          >
            <Truck size={17} strokeWidth={1.9} /> {vehicleLabel(task.vehicleType)}
          </div>
        )}

        {/* what to bring / where to deliver */}
        {!pickedUp ? (
          <>
            {/* the request itself */}
            <div className="sg-card" style={{ padding: 18, marginTop: 18, display: 'flex', gap: 14, alignItems: 'flex-start' }}>
              <div style={{ width: 48, height: 48, borderRadius: 16, background: '#EFF6FF', display: 'grid', placeItems: 'center', color: '#2563EB', flex: 'none' }}>
                <ShoppingBasket size={24} strokeWidth={1.75} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#94A3B8', marginBottom: 4 }}>المطلوب</div>
                <div style={{ fontSize: 17, fontWeight: 700, color: '#0F172A', lineHeight: 1.5 }}>{task.instructions || '—'}</div>
              </div>
            </div>

            {/* where to pick up — the pin turns into real directions */}
            {(hasPickupPlace || task.pickup?.lat != null) && (
              <div className="sg-card" style={{ padding: 18, marginTop: 14 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#94A3B8', marginBottom: 4 }}>مكان الاستلام</div>
                <div style={{ fontSize: 17, fontWeight: 700, color: '#0F172A', lineHeight: 1.5 }}>
                  {pickupPlace || 'المكان اللي حدده العميل على الخريطة'}
                </div>
                <MapLink lat={task.pickup?.lat} lng={task.pickup?.lng} label="روح لمكان الاستلام" />
              </div>
            )}

            {/* purchase errand → record what it cost */}
            {isErrand && (
              <div style={{ marginTop: 14, background: '#FFF7ED', borderRadius: 20, padding: 18 }}>
                <div style={{ fontSize: 15, fontWeight: 800, color: '#9A3412' }}>كام دفعت في الطلب؟</div>
                <p style={{ fontSize: 13, color: '#C2410C', margin: '6px 0 12px', lineHeight: 1.5 }}>
                  اكتب المبلغ اللي دفعته، وهنحصّله من العميل مع أجرة التوصيل عند التسليم.
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#fff', borderRadius: 16, padding: '4px 16px', border: '1.5px solid #FED7AA' }}>
                  <input
                    value={cost}
                    onChange={(e) => setCost(e.target.value.replace(/[^\d]/g, ''))}
                    type="tel"
                    inputMode="numeric"
                    placeholder="0"
                    style={{ flex: 1, height: 54, border: 'none', outline: 'none', fontSize: 22, fontWeight: 800, color: '#0F172A', background: 'transparent', fontFamily: 'inherit' }}
                  />
                  <span style={{ fontSize: 15, fontWeight: 700, color: '#C2410C' }}>جنيه</span>
                </div>
              </div>
            )}
          </>
        ) : (
          <>
            {/* dropoff */}
            <div style={{ marginTop: 18, background: '#F8FAFC', borderRadius: 22, padding: 16, display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ width: 52, height: 52, borderRadius: 16, background: '#FFF7ED', display: 'grid', placeItems: 'center', color: '#EA580C', flex: 'none' }}>
                <MapPin size={26} strokeWidth={1.75} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 17, fontWeight: 700, color: '#0F172A' }}>{task.dropoff?.zoneName || '—'}</div>
                <div style={{ fontSize: 13, color: '#64748B', marginTop: 2 }}>
                  {task.dropoff?.street || '—'}{task.dropoff?.landmark ? ' · ' + task.dropoff.landmark : ''}
                </div>
              </div>
              {task.dropoff?.phone && (
                <a href={`tel:${task.dropoff.phone}`} style={{ width: 48, height: 48, borderRadius: 16, background: '#fff', boxShadow: '0 8px 18px rgba(15,23,42,.1)', display: 'grid', placeItems: 'center', color: '#2563EB', flex: 'none' }}>
                  <Phone size={22} strokeWidth={1.75} />
                </a>
              )}
              <MapLink lat={task.dropoff?.lat} lng={task.dropoff?.lng} label="افتح خريطة التسليم" compact />
            </div>

            {/* what they ordered, for reference */}
            {task.instructions && (
              <div className="sg-card" style={{ padding: 16, marginTop: 12 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#94A3B8', marginBottom: 4 }}>الطلب</div>
                <div style={{ fontSize: 15, color: '#0F172A', lineHeight: 1.5 }}>{task.instructions}</div>
              </div>
            )}

            {/* cash to collect (goods + delivery) */}
            <div style={{ marginTop: 12, background: '#FFF7ED', borderRadius: 18, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 40, height: 40, borderRadius: 12, background: '#fff', display: 'grid', placeItems: 'center', color: '#EA580C', flex: 'none' }}>
                <Banknote size={22} strokeWidth={1.75} />
              </div>
              <div style={{ flex: 1, fontSize: 15, fontWeight: 600, color: '#9A3412' }}>تحصّل من العميل عند التسليم</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: '#C2410C' }}>{formatMoney(task.cashToCollect)}</div>
            </div>
          </>
        )}

        {error && (
          <div style={{ marginTop: 16, background: '#FEF2F2', color: '#DC2626', borderRadius: 14, padding: '12px 16px', fontSize: 14, fontWeight: 600, textAlign: 'center' }}>
            {error}
          </div>
        )}
      </div>

      <div style={{ padding: '16px 20px 34px' }}>
        <button type="button" onClick={advance} disabled={acting} className={`sg-btn ${pickedUp ? 'sg-btn-success' : 'sg-btn-primary'}`} style={{ width: '100%', height: 62, fontSize: 19, opacity: acting ? 0.6 : 1 }}>
          {pickedUp ? 'تم التسليم' : isErrand ? 'جبت الطلب وطالع للعميل' : 'استلمت الطلب'}
          {pickedUp && <Check size={22} strokeWidth={2} />}
        </button>
      </div>
    </div>
  );
}
