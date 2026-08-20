import { createErrandSchema, formatMoney, poundsToPiasters } from '@sprintgo/shared';
import type { CreateErrandDto, ErrandQuoteView, ErrandSourceView, ZoneView } from '@sprintgo/shared';
import { ArrowLeft, Check, ChevronRight, LocateFixed, MapPin, Package, ShoppingBasket, Store, Truck } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ApiError } from '../lib/api';
import { createErrand, getErrandQuote, getZones } from '../lib/orders';
import { getErrandSources } from '../lib/catalog';

export function OrderFlowScreen() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  // "buy" = اشتري لي (write it, courier buys) · "send" = وصّل طرد من مكان لمكان
  const send = params.get('mode') === 'send';
  const [step, setStep] = useState(1);
  const [zones, setZones] = useState<ZoneView[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // what + price (step 1)
  const [instructions, setInstructions] = useState('');
  const [budget, setBudget] = useState('');
  // where to deliver + optional source shop / pickup (step 2)
  const [dropZoneId, setDropZoneId] = useState('');
  const [street, setStreet] = useState('');
  const [pickupText, setPickupText] = useState('');
  const [sources, setSources] = useState<ErrandSourceView[]>([]);
  const [sourceStoreId, setSourceStoreId] = useState('');
  // GPS + live fee preview
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [locating, setLocating] = useState(false);
  const [locError, setLocError] = useState('');
  const [quote, setQuote] = useState<ErrandQuoteView | null>(null);

  useEffect(() => {
    getZones().then(setZones).catch(() => {});
    getErrandSources().then(setSources).catch(() => {});
  }, []);

  // live delivery-fee preview whenever the zone / shop / location changes
  useEffect(() => {
    if (!dropZoneId) {
      setQuote(null);
      return;
    }
    let alive = true;
    getErrandQuote({ zoneId: dropZoneId, sourceStoreId: sourceStoreId || undefined, lat: coords?.lat, lng: coords?.lng })
      .then((q) => alive && setQuote(q))
      .catch(() => alive && setQuote(null));
    return () => {
      alive = false;
    };
  }, [dropZoneId, sourceStoreId, coords]);

  function locate() {
    setLocError('');
    if (!('geolocation' in navigator)) {
      setLocError('جهازك مش بيدعم تحديد الموقع — هنحسب التوصيل بالمنطقة.');
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocating(false);
      },
      () => {
        setLocError('مقدرناش نجيب موقعك — فعّل الـ GPS أو هنحسب التوصيل بالمنطقة.');
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 8000 },
    );
  }

  function back() {
    if (step === 1) navigate(-1);
    else setStep((s) => s - 1);
  }

  function next() {
    setError('');
    if (instructions.trim().length < 3) return setError('اكتب طلبك بالتفصيل من فضلك');
    setStep(2);
  }

  async function submit() {
    setError('');
    if (!dropZoneId) return setError('اختار منطقتك من فضلك');
    if (street.trim().length < 2) return setError('اكتب عنوانك من فضلك');
    if (send && !pickupText.trim() && !sourceStoreId) return setError('قولنا من فين نستلم الطلب');

    const dto: CreateErrandDto = {
      instructions: instructions.trim(),
      sourceStoreId: sourceStoreId || undefined,
      pickupText: pickupText.trim() || undefined,
      dropoff: { zoneId: dropZoneId, street: street.trim(), lat: coords?.lat, lng: coords?.lng },
      // "send" is a parcel move, not a purchase → no budget
      purchaseBudget: !send && budget ? poundsToPiasters(Number(budget)) : undefined,
    };
    const parsed = createErrandSchema.safeParse(dto);
    if (!parsed.success) return setError(parsed.error.issues[0]?.message ?? 'راجِع البيانات من فضلك');

    setSubmitting(true);
    try {
      const order = await createErrand(parsed.data);
      navigate(`/track/${order.id}`, { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'حصلت مشكلة بسيطة، حاوِل تاني من فضلك');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="sg-screen">
      {/* header */}
      <div style={{ padding: '14px 20px 0', display: 'flex', alignItems: 'center', gap: 14 }}>
        <button type="button" onClick={back} style={backBtn}>
          <ChevronRight size={24} strokeWidth={1.75} color="#0F172A" />
        </button>
        <div style={{ display: 'flex', gap: 6, flex: 1 }}>
          {[1, 2].map((i) => (
            <div key={i} style={{ height: 6, flex: 1, borderRadius: 999, background: i <= step ? '#2563EB' : '#E2E8F0' }} />
          ))}
        </div>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#64748B' }}>{step} / 2</div>
      </div>

      <div className="sg-scroll" style={{ padding: '24px 20px 0' }}>
        {step === 1 ? (
          <>
            {send ? (
              <Title icon={Package} title="بتبعت إيه؟" sub="قولنا الحاجة اللي هننقلها وكفاية." />
            ) : (
              <Title icon={ShoppingBasket} title="عايز إيه؟" sub="اكتب طلبك وكفاية — إحنا نظبّط الباقي." />
            )}
            <label style={label}>{send ? 'الحاجة اللي هتتبعت' : 'طلبك'}</label>
            <textarea
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              placeholder={send ? 'مثلاً: ظرف مستندات، أو شنطة صغيرة.' : 'مثلاً: ٢ كيلو طماطم من أقرب محل خضار.'}
              rows={4}
              style={{ ...field, resize: 'none', paddingTop: 14 }}
            />

            {!send && (
              <>
                <label style={{ ...label, marginTop: 18 }}>كام تحب تدفع للطلب؟ (اختياري)</label>
                <input
                  value={budget}
                  onChange={(e) => setBudget(e.target.value.replace(/[^\d]/g, ''))}
                  type="tel"
                  inputMode="numeric"
                  placeholder="السعر بالجنيه"
                  style={field}
                />
                <p style={{ fontSize: 13, color: '#94A3B8', marginTop: 8, lineHeight: 1.5 }}>
                  سيبها فاضية لو مش عارف السعر — المندوب هيجيبه ويحصّل الحساب عند التسليم.
                </p>
              </>
            )}
          </>
        ) : (
          <>
            <Title icon={MapPin} title="نوصّلك فين؟" sub="قولنا منطقتك وعنوانك." />
            <label style={label}>منطقتك</label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {zones.map((z) => (
                <button
                  key={z.id}
                  type="button"
                  onClick={() => setDropZoneId(z.id)}
                  style={{
                    borderRadius: 999,
                    border: `1.5px solid ${dropZoneId === z.id ? '#2563EB' : '#E2E8F0'}`,
                    background: dropZoneId === z.id ? '#EFF6FF' : '#fff',
                    color: dropZoneId === z.id ? '#1D4ED8' : '#334155',
                    padding: '10px 16px',
                    fontSize: 14,
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  {z.nameAr}
                </button>
              ))}
            </div>

            <label style={{ ...label, marginTop: 18 }}>عنوانك</label>
            <input value={street} onChange={(e) => setStreet(e.target.value)} placeholder="الشارع والعلامة المميزة" style={field} />

            {/* location + live fee preview */}
            <button
              type="button"
              onClick={locate}
              disabled={locating}
              style={{ marginTop: 12, width: '100%', minHeight: 52, borderRadius: 16, border: `1.5px solid ${coords ? '#22C55E' : '#2563EB'}`, background: coords ? '#F0FDF4' : '#EFF6FF', color: coords ? '#15803D' : '#1D4ED8', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}
            >
              <LocateFixed size={20} strokeWidth={1.75} />
              {locating ? 'بنحدد موقعك…' : coords ? 'تمام، موقعك اتحدّد ✓' : 'حدّد موقعك (عشان نحسب التوصيل بالظبط)'}
            </button>
            {locError && <p style={{ fontSize: 13, color: '#EA580C', marginTop: 8, lineHeight: 1.5 }}>{locError}</p>}

            {quote && (
              <div style={{ marginTop: 12, background: '#fff', borderRadius: 16, padding: '14px 16px', boxShadow: 'var(--shadow-card)', display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 42, height: 42, borderRadius: 13, background: '#EFF6FF', display: 'grid', placeItems: 'center', color: '#2563EB', flex: 'none' }}>
                  <Truck size={20} strokeWidth={1.75} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, color: '#64748B' }}>التوصيل المتوقّع</div>
                  <div style={{ fontSize: 12, color: '#94A3B8', marginTop: 2 }}>
                    {quote.distanceKm != null ? `المسافة ~${quote.distanceKm.toFixed(1)} كم` : 'حدّد موقعك لسعر أدق'}
                  </div>
                </div>
                <div style={{ fontSize: 20, fontWeight: 800, color: '#2563EB' }}>{formatMoney(quote.deliveryFee)}</div>
              </div>
            )}

            {/* pickup — required for a "send" parcel, optional for a "buy" errand */}
            <div style={{ marginTop: 20, background: send ? '#fff' : '#F8FAFC', border: send ? '1.5px solid #E2E8F0' : 'none', borderRadius: 18, padding: 16 }}>
              <label style={{ ...label, marginBottom: 6 }}>{send ? 'من فين نستلمه؟' : 'من فين نجيبه؟ (اختياري)'}</label>
              <p style={{ fontSize: 13, color: '#94A3B8', marginBottom: 10, lineHeight: 1.5 }}>
                {send ? 'اختار محل معروف أو اكتب مكان الاستلام بالظبط.' : 'اختار محل معروف، أو اكتب المكان، أو سيبها للمندوب يختار الأقرب.'}
              </p>
              {sources.length > 0 && (
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
                  {sources.map((s) => {
                    const on = sourceStoreId === s.id;
                    return (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => {
                          setSourceStoreId(on ? '' : s.id);
                          if (!on) setPickupText('');
                        }}
                        style={{ display: 'flex', alignItems: 'center', gap: 6, borderRadius: 999, border: `1.5px solid ${on ? '#2563EB' : '#E2E8F0'}`, background: on ? '#EFF6FF' : '#fff', color: on ? '#1D4ED8' : '#334155', padding: '9px 14px', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
                      >
                        <Store size={15} strokeWidth={1.75} /> {s.name}
                      </button>
                    );
                  })}
                </div>
              )}
              <input
                value={pickupText}
                onChange={(e) => {
                  setPickupText(e.target.value);
                  if (e.target.value) setSourceStoreId('');
                }}
                placeholder="أو اكتب المكان بنفسك"
                style={{ ...field, background: '#fff' }}
              />
            </div>
          </>
        )}

        {error && <div style={{ color: '#DC2626', fontSize: 14, fontWeight: 600, textAlign: 'center', marginTop: 16 }}>{error}</div>}
      </div>

      <div style={{ padding: '16px 20px 34px' }}>
        <button
          type="button"
          onClick={step === 1 ? next : submit}
          disabled={submitting}
          className="sg-btn sg-btn-primary"
          style={{ width: '100%', opacity: submitting ? 0.6 : 1 }}
        >
          {step === 1 ? 'متابعة' : submitting ? 'بنجهّز مشوارك…' : 'اطلب المندوب'}
          {!submitting && (step === 1 ? <ArrowLeft size={20} strokeWidth={1.75} /> : <Check size={22} strokeWidth={2} />)}
        </button>
      </div>
    </div>
  );
}

function Title({ icon: Icon, title, sub }: { icon: typeof MapPin; title: string; sub: string }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ width: 52, height: 52, borderRadius: 18, background: 'linear-gradient(145deg,#DBEAFE,#EFF6FF)', display: 'grid', placeItems: 'center', color: '#2563EB', marginBottom: 14 }}>
        <Icon size={26} strokeWidth={1.75} />
      </div>
      <div style={{ fontSize: 26, fontWeight: 800, color: '#0F172A' }}>{title}</div>
      <div style={{ fontSize: 15, color: '#64748B', marginTop: 6 }}>{sub}</div>
    </div>
  );
}

const field: React.CSSProperties = {
  width: '100%',
  minHeight: 54,
  borderRadius: 16,
  border: '1.5px solid #E2E8F0',
  background: '#fff',
  padding: '0 16px',
  fontSize: 16,
  color: '#0F172A',
  outline: 'none',
  fontFamily: 'inherit',
};

const label: React.CSSProperties = {
  display: 'block',
  fontSize: 13,
  fontWeight: 700,
  color: '#64748B',
  marginBottom: 8,
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
