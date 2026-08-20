import type { AddressView, ZoneView } from '@sprintgo/shared';
import { formatMoney } from '@sprintgo/shared';
import { ChevronRight, MapPin, Minus, Plus, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ApiError } from '../lib/api';
import { useCart } from '../lib/cart';
import { createAddress, getAddresses, getStore, placeOrder } from '../lib/catalog';
import { getZones } from '../lib/orders';

export function CartScreen() {
  const navigate = useNavigate();
  const { cart, subtotal, setQty, clear } = useCart();

  const [addresses, setAddresses] = useState<AddressView[]>([]);
  const [zones, setZones] = useState<ZoneView[]>([]);
  const [selectedId, setSelectedId] = useState<string>('');
  const [adding, setAdding] = useState(false);
  // new-address fields (label kept simple for elderly-first UX)
  const label = 'البيت';
  const [zoneId, setZoneId] = useState('');
  const [street, setStreet] = useState('');

  const [deliveryFee, setDeliveryFee] = useState<number | null>(null);
  const [feeLoading, setFeeLoading] = useState(false);
  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    getZones().then(setZones).catch(() => {});
    getAddresses()
      .then((list) => {
        setAddresses(list);
        if (list.length) {
          const def = list.find((a) => a.isDefault) ?? list[0]!;
          setSelectedId(def.id);
        } else {
          setAdding(true);
        }
      })
      .catch(() => setAdding(true));
  }, []);

  // resolve the delivery fee for the chosen zone (store fee is per-zone)
  const activeZoneId = adding ? zoneId : addresses.find((a) => a.id === selectedId)?.zoneId ?? '';
  useEffect(() => {
    if (!cart || !activeZoneId) {
      setDeliveryFee(null);
      return;
    }
    let alive = true;
    setFeeLoading(true);
    getStore(cart.storeSlug, activeZoneId)
      .then((s) => {
        if (alive) setDeliveryFee(s.delivery ? s.delivery.fee : null);
      })
      .catch(() => alive && setDeliveryFee(null))
      .finally(() => alive && setFeeLoading(false));
    return () => {
      alive = false;
    };
  }, [cart, activeZoneId]);

  if (!cart) {
    return (
      <div className="sg-screen" style={{ alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: 32 }}>
        <div style={{ fontSize: 20, fontWeight: 700, color: '#0F172A' }}>سلتك فاضية</div>
        <button type="button" onClick={() => navigate('/stores')} className="sg-btn sg-btn-primary" style={{ width: '100%', marginTop: 20 }}>اتفرّج على المحلات</button>
      </div>
    );
  }

  const belowMin = subtotal < cart.minOrderTotal;
  const total = subtotal + (deliveryFee ?? 0);
  const notServed = !!activeZoneId && !feeLoading && deliveryFee === null;
  const canPlace = !belowMin && !!activeZoneId && deliveryFee !== null && !placing && (!adding || street.trim().length >= 2);

  async function place() {
    if (!cart) return;
    setError('');
    if (belowMin) return setError(`أقل طلب من المحل ده ${formatMoney(cart.minOrderTotal)}`);

    let addressId = selectedId;
    try {
      setPlacing(true);
      if (adding) {
        if (!zoneId) return setError('اختار منطقتك');
        if (street.trim().length < 2) return setError('اكتب عنوانك');
        const addr = await createAddress({ label: label.trim() || 'البيت', zoneId, street: street.trim() });
        addressId = addr.id;
      }
      if (!addressId) return setError('اختار مكان التوصيل');
      if (deliveryFee === null) return setError('للأسف المحل ده مبيوصلش لمنطقتك');

      const order = await placeOrder({
        storeId: cart.storeId,
        fulfillmentType: 'DELIVERY',
        addressId,
        paymentMethod: 'COD',
        items: cart.lines.map((l) => ({ productId: l.productId, quantity: l.quantity, optionIds: l.optionIds })),
        clientTotal: subtotal + deliveryFee,
      });
      clear();
      navigate(`/track/${order.id}`, { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'حصلت مشكلة بسيطة، حاوِل تاني من فضلك');
    } finally {
      setPlacing(false);
    }
  }

  return (
    <div className="sg-screen">
      <div style={{ padding: '14px 20px 0', display: 'flex', alignItems: 'center', gap: 14 }}>
        <button type="button" onClick={() => navigate(-1)} style={backBtn}>
          <ChevronRight size={24} strokeWidth={1.75} color="#0F172A" />
        </button>
        <div>
          <div style={{ fontSize: 22, fontWeight: 800, color: '#0F172A' }}>سلتك</div>
          <div style={{ fontSize: 13, color: '#64748B' }}>{cart.storeName}</div>
        </div>
      </div>

      <div className="sg-scroll" style={{ padding: '18px 20px', paddingBottom: 140 }}>
        {/* lines */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {cart.lines.map((l) => (
            <div key={l.key} className="sg-card" style={{ padding: 14, display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 16, fontWeight: 700, color: '#0F172A' }}>{l.name}</div>
                {l.optionLabels.length > 0 && <div style={{ fontSize: 12.5, color: '#94A3B8', marginTop: 2 }}>{l.optionLabels.join('، ')}</div>}
                <div style={{ fontSize: 14, fontWeight: 700, color: '#2563EB', marginTop: 6 }}>{formatMoney(l.unitPrice * l.quantity)}</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <button type="button" onClick={() => setQty(l.key, l.quantity - 1)} style={stepBtn}>
                  {l.quantity === 1 ? <Trash2 size={16} strokeWidth={1.75} color="#DC2626" /> : <Minus size={16} strokeWidth={2} color="#0F172A" />}
                </button>
                <span style={{ fontSize: 16, fontWeight: 700, minWidth: 18, textAlign: 'center' }}>{l.quantity}</span>
                <button type="button" onClick={() => setQty(l.key, l.quantity + 1)} style={{ ...stepBtn, background: '#2563EB' }}>
                  <Plus size={16} strokeWidth={2} color="#fff" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {belowMin && (
          <div style={{ marginTop: 12, background: '#FFF7ED', color: '#C2410C', borderRadius: 14, padding: '12px 16px', fontSize: 13.5, fontWeight: 600, textAlign: 'center' }}>
            أقل طلب من المحل ده {formatMoney(cart.minOrderTotal)} — زوّد شوية.
          </div>
        )}

        {/* delivery address */}
        <div style={{ fontSize: 17, fontWeight: 800, color: '#0F172A', margin: '24px 0 12px' }}>نوصّلك فين؟</div>
        {addresses.length > 0 && !adding && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {addresses.map((a) => (
              <button
                key={a.id}
                type="button"
                onClick={() => setSelectedId(a.id)}
                style={{ display: 'flex', alignItems: 'center', gap: 12, background: '#fff', border: `1.5px solid ${selectedId === a.id ? '#2563EB' : '#E2E8F0'}`, borderRadius: 16, padding: '14px 16px', cursor: 'pointer', textAlign: 'start', fontFamily: 'inherit' }}
              >
                <MapPin size={20} strokeWidth={1.75} color={selectedId === a.id ? '#2563EB' : '#94A3B8'} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 15, fontWeight: 700, color: '#0F172A' }}>{a.label}</div>
                  <div style={{ fontSize: 13, color: '#64748B', marginTop: 2 }}>{a.zoneName} · {a.street}</div>
                </div>
              </button>
            ))}
            <button type="button" onClick={() => setAdding(true)} style={{ fontSize: 14, fontWeight: 700, color: '#2563EB', background: 'transparent', border: 'none', cursor: 'pointer', padding: '6px 0', textAlign: 'start' }}>
              + عنوان جديد
            </button>
          </div>
        )}

        {adding && (
          <div className="sg-card" style={{ padding: 16 }}>
            <label style={lbl}>منطقتك</label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {zones.map((z) => (
                <button key={z.id} type="button" onClick={() => setZoneId(z.id)} style={{ borderRadius: 999, border: `1.5px solid ${zoneId === z.id ? '#2563EB' : '#E2E8F0'}`, background: zoneId === z.id ? '#EFF6FF' : '#fff', color: zoneId === z.id ? '#1D4ED8' : '#334155', padding: '9px 15px', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                  {z.nameAr}
                </button>
              ))}
            </div>
            <label style={{ ...lbl, marginTop: 16 }}>عنوانك</label>
            <input value={street} onChange={(e) => setStreet(e.target.value)} placeholder="الشارع والعلامة المميزة" style={field} />
            {addresses.length > 0 && (
              <button type="button" onClick={() => setAdding(false)} style={{ fontSize: 14, fontWeight: 700, color: '#64748B', background: 'transparent', border: 'none', cursor: 'pointer', padding: '10px 0 0', textAlign: 'start' }}>
                ← اختار من عناويني
              </button>
            )}
          </div>
        )}

        {notServed && (
          <div style={{ marginTop: 12, background: '#FEF2F2', color: '#DC2626', borderRadius: 14, padding: '12px 16px', fontSize: 13.5, fontWeight: 600, textAlign: 'center' }}>
            للأسف المحل ده مبيوصلش للمنطقة دي — اختار منطقة تانية.
          </div>
        )}
        {error && <div style={{ marginTop: 14, color: '#DC2626', fontSize: 14, fontWeight: 600, textAlign: 'center' }}>{error}</div>}
      </div>

      {/* checkout footer */}
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, background: '#fff', borderTop: '1px solid #F1F5F9', padding: '14px 20px 22px', boxShadow: '0 -8px 24px rgba(15,23,42,.06)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13.5, color: '#64748B', marginBottom: 4 }}>
          <span>الطلبات</span><span>{formatMoney(subtotal)}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13.5, color: '#64748B', marginBottom: 8 }}>
          <span>التوصيل</span><span>{deliveryFee === null ? '—' : formatMoney(deliveryFee)}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 18, fontWeight: 800, color: '#0F172A', marginBottom: 12 }}>
          <span>الإجمالي</span><span>{formatMoney(total)}</span>
        </div>
        <button type="button" onClick={place} disabled={!canPlace} className="sg-btn sg-btn-primary" style={{ width: '100%', height: 58, opacity: canPlace ? 1 : 0.5 }}>
          {placing ? 'بنأكّد طلبك…' : 'أكّد الطلب — الدفع كاش'}
        </button>
      </div>
    </div>
  );
}

const backBtn: React.CSSProperties = { width: 44, height: 44, borderRadius: 14, background: '#fff', boxShadow: '0 8px 20px rgba(15,23,42,.07)', display: 'grid', placeItems: 'center', border: 'none', cursor: 'pointer' };
const stepBtn: React.CSSProperties = { width: 34, height: 34, borderRadius: 12, background: '#F1F5F9', border: 'none', display: 'grid', placeItems: 'center', cursor: 'pointer', flex: 'none' };
const field: React.CSSProperties = { width: '100%', minHeight: 52, borderRadius: 14, border: '1.5px solid #E2E8F0', background: '#fff', padding: '0 16px', fontSize: 16, color: '#0F172A', outline: 'none', fontFamily: 'inherit' };
const lbl: React.CSSProperties = { display: 'block', fontSize: 13, fontWeight: 700, color: '#64748B', marginBottom: 8 };
