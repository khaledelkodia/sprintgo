import { createErrandSchema, formatMoney, poundsToPiasters, TRANSPORT_VEHICLES, isVehicleType } from '@sprintgo/shared';
import type { CreateErrandDto, ErrandQuoteView, ErrandSourceView, VehicleType, ZoneView } from '@sprintgo/shared';
import { ArrowLeft, Check, ChevronRight, LocateFixed, MapPin, Package, ShoppingBasket, Store, Truck } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ApiError } from '../lib/api';
import { createErrand, getErrandQuote, getZones } from '../lib/orders';
import { getErrandSources } from '../lib/catalog';

/** A shared pin: the browser GPS reading for one end of the trip. */
type Coords = { lat: number; lng: number };

export function OrderFlowScreen() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  // "buy"  = اشتري لي (write it, courier buys)
  // "send" = وصّل طرد من مكان لمكان
  // "transport" = نقل عفش/بضاعة — same trip, but it books a bigger vehicle
  const rawMode = params.get('mode');
  const transport = rawMode === 'transport';
  const send = rawMode === 'send' || transport;
  const [step, setStep] = useState(1);
  const [zones, setZones] = useState<ZoneView[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // what + price (step 1)
  const [instructions, setInstructions] = useState('');
  const [budget, setBudget] = useState('');
  // نقل: which vehicle carries it — tiles can preselect one via ?v=
  const presetVehicle = params.get('v');
  const [vehicleType, setVehicleType] = useState<VehicleType>(
    presetVehicle && isVehicleType(presetVehicle) ? presetVehicle : 'TRICYCLE',
  );
  // where to deliver + optional source shop / pickup (step 2)
  const [dropZoneId, setDropZoneId] = useState('');
  const [street, setStreet] = useState('');
  const [pickupText, setPickupText] = useState('');
  const [sources, setSources] = useState<ErrandSourceView[]>([]);
  const [sourceStoreId, setSourceStoreId] = useState('');
  // GPS pins + live fee preview
  const [coords, setCoords] = useState<Coords | null>(null);
  const [pickupCoords, setPickupCoords] = useState<Coords | null>(null);
  const [locating, setLocating] = useState<'drop' | 'pickup' | null>(null);
  const [locError, setLocError] = useState('');
  const [quote, setQuote] = useState<ErrandQuoteView | null>(null);

  useEffect(() => {
    getZones().then(setZones).catch(() => {});
    getErrandSources().then(setSources).catch(() => {});
  }, []);

  // live delivery-fee preview whenever the zone / shop / pins / vehicle change
  useEffect(() => {
    if (!dropZoneId) {
      setQuote(null);
      return;
    }
    let alive = true;
    getErrandQuote({
      zoneId: dropZoneId,
      sourceStoreId: sourceStoreId || undefined,
      lat: coords?.lat,
      lng: coords?.lng,
      pickupLat: pickupCoords?.lat,
      pickupLng: pickupCoords?.lng,
      vehicleType: transport ? vehicleType : undefined,
    })
      .then((q) => alive && setQuote(q))
      .catch(() => alive && setQuote(null));
    return () => {
      alive = false;
    };
  }, [dropZoneId, sourceStoreId, coords, pickupCoords, vehicleType, transport]);

  /** Read the device GPS for one end of the trip. */
  function locate(which: 'drop' | 'pickup') {
    setLocError('');
    if (!('geolocation' in navigator)) {
      setLocError('جهازك مش بيدعم تحديد الموقع — هنحسب التوصيل بالمنطقة.');
      return;
    }
    setLocating(which);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const pin = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        if (which === 'drop') setCoords(pin);
        else {
          setPickupCoords(pin);
          setSourceStoreId(''); // a pin of your own replaces the shop choice
        }
        setLocating(null);
      },
      () => {
        setLocError('مقدرناش نجيب موقعك — فعّل الـ GPS أو اكتب المكان بنفسك.');
        setLocating(null);
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
    if (send && !pickupText.trim() && !sourceStoreId && !pickupCoords)
      return setError('قولنا من فين نستلم الطلب');

    const dto: CreateErrandDto = {
      instructions: instructions.trim(),
      sourceStoreId: sourceStoreId || undefined,
      pickupText: pickupText.trim() || undefined,
      pickupLat: pickupCoords?.lat,
      pickupLng: pickupCoords?.lng,
      dropoff: { zoneId: dropZoneId, street: street.trim(), lat: coords?.lat, lng: coords?.lng },
      // "send" is a parcel move, not a purchase → no budget
      purchaseBudget: !send && budget ? poundsToPiasters(Number(budget)) : undefined,
      vehicleType: transport ? vehicleType : undefined,
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

  /** "من فين نستلمه" — required for a parcel/نقل, optional for a buy errand. */
  const pickupBlock = (
    <div
      key="pickup"
      style={{
        marginTop: 20,
        background: send ? '#fff' : '#F8FAFC',
        border: send ? '1.5px solid #E2E8F0' : 'none',
        borderRadius: 18,
        padding: 16,
      }}
    >
      <label style={{ ...label, marginBottom: 6 }}>{send ? 'من فين نستلمه؟' : 'من فين نجيبه؟ (اختياري)'}</label>
      <p style={{ fontSize: 13, color: '#94A3B8', marginBottom: 10, lineHeight: 1.5 }}>
        {send
          ? 'حدّد المكان على الخريطة، أو اختار محل معروف، أو اكتبه بنفسك.'
          : 'اختار محل معروف، أو اكتب المكان، أو سيبها للمندوب يختار الأقرب.'}
      </p>

      <button type="button" onClick={() => locate('pickup')} disabled={locating !== null} style={pinBtn(!!pickupCoords)}>
        <LocateFixed size={20} strokeWidth={1.75} />
        {locating === 'pickup'
          ? 'بنحدد المكان…'
          : pickupCoords
            ? 'تمام، مكان الاستلام اتحدّد ✓'
            : 'أنا واقف في مكان الاستلام دلوقتي'}
      </button>

      {sources.length > 0 && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', margin: '12px 0' }}>
          {sources.map((s) => {
            const on = sourceStoreId === s.id;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => {
                  setSourceStoreId(on ? '' : s.id);
                  if (!on) {
                    setPickupText('');
                    setPickupCoords(null);
                  }
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  borderRadius: 999,
                  border: `1.5px solid ${on ? '#2563EB' : '#E2E8F0'}`,
                  background: on ? '#EFF6FF' : '#fff',
                  color: on ? '#1D4ED8' : '#334155',
                  padding: '9px 14px',
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                }}
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
        style={{ ...field, background: '#fff', marginTop: sources.length > 0 ? 0 : 12 }}
      />
    </div>
  );

  /** "نوصّلك فين" — zone + street + the customer's own pin. */
  const dropoffBlock = (
    <div key="dropoff">
      <label style={label}>{send ? 'نوصّله فين؟' : 'منطقتك'}</label>
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
              fontFamily: 'inherit',
            }}
          >
            {z.nameAr}
          </button>
        ))}
      </div>

      <label style={{ ...label, marginTop: 18 }}>{send ? 'عنوان التسليم' : 'عنوانك'}</label>
      <input value={street} onChange={(e) => setStreet(e.target.value)} placeholder="الشارع والعلامة المميزة" style={field} />

      <button type="button" onClick={() => locate('drop')} disabled={locating !== null} style={{ ...pinBtn(!!coords), marginTop: 12 }}>
        <LocateFixed size={20} strokeWidth={1.75} />
        {locating === 'drop'
          ? 'بنحدد موقعك…'
          : coords
            ? 'تمام، موقعك اتحدّد ✓'
            : 'حدّد موقعك (المندوب هيلاقيك بسهولة)'}
      </button>
      {locError && <p style={{ fontSize: 13, color: '#EA580C', marginTop: 8, lineHeight: 1.5 }}>{locError}</p>}

      {quote && (
        <div
          style={{
            marginTop: 12,
            background: '#fff',
            borderRadius: 16,
            padding: '14px 16px',
            boxShadow: 'var(--shadow-card)',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
          }}
        >
          <div
            style={{
              width: 42,
              height: 42,
              borderRadius: 13,
              background: '#EFF6FF',
              display: 'grid',
              placeItems: 'center',
              color: '#2563EB',
              flex: 'none',
            }}
          >
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
    </div>
  );

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
            {transport ? (
              <Title icon={Truck} title="بتنقل إيه؟" sub="قولنا الحاجة واختار العربية المناسبة." />
            ) : send ? (
              <Title icon={Package} title="بتبعت إيه؟" sub="قولنا الحاجة اللي هننقلها وكفاية." />
            ) : (
              <Title icon={ShoppingBasket} title="عايز إيه؟" sub="اكتب طلبك وكفاية — إحنا نظبّط الباقي." />
            )}
            <label style={label}>{transport ? 'الحاجة اللي هتتنقل' : send ? 'الحاجة اللي هتتبعت' : 'طلبك'}</label>
            <textarea
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              placeholder={
                transport
                  ? 'مثلاً: عفش أوضة نوم — دولاب وسرير وكمودينو.'
                  : send
                    ? 'مثلاً: ظرف مستندات، أو شنطة صغيرة.'
                    : 'مثلاً: ٢ كيلو طماطم من أقرب محل خضار.'
              }
              rows={4}
              style={{ ...field, resize: 'none', paddingTop: 14 }}
            />

            {transport && (
              <>
                <label style={{ ...label, marginTop: 20 }}>العربية اللي تناسبك</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {TRANSPORT_VEHICLES.map((v) => {
                    const on = vehicleType === v.type;
                    return (
                      <button
                        key={v.type}
                        type="button"
                        onClick={() => setVehicleType(v.type)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 14,
                          width: '100%',
                          textAlign: 'right',
                          borderRadius: 18,
                          border: `1.5px solid ${on ? '#2563EB' : '#E2E8F0'}`,
                          background: on ? '#EFF6FF' : '#fff',
                          padding: 14,
                          cursor: 'pointer',
                          fontFamily: 'inherit',
                        }}
                      >
                        <div
                          style={{
                            width: 46,
                            height: 46,
                            borderRadius: 15,
                            background: on ? '#DBEAFE' : '#F1F5F9',
                            display: 'grid',
                            placeItems: 'center',
                            color: on ? '#1D4ED8' : '#64748B',
                            flex: 'none',
                          }}
                        >
                          <Truck size={22} strokeWidth={1.75} />
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 17, fontWeight: 800, color: '#0F172A' }}>{v.labelAr}</div>
                          <div style={{ fontSize: 13, color: '#64748B', marginTop: 3 }}>{v.hintAr}</div>
                        </div>
                        {on && <Check size={22} strokeWidth={2.5} color="#2563EB" />}
                      </button>
                    );
                  })}
                </div>
              </>
            )}

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
            <Title
              icon={MapPin}
              title={send ? 'من فين لفين؟' : 'نوصّلك فين؟'}
              sub={send ? 'مكان الاستلام ومكان التسليم.' : 'قولنا منطقتك وعنوانك.'}
            />
            {/* a parcel/نقل starts at the pickup; a buy errand starts at the customer */}
            {send ? [pickupBlock, dropoffBlock] : [dropoffBlock, pickupBlock]}
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
          {step === 1 ? 'متابعة' : submitting ? 'بنجهّز مشوارك…' : transport ? 'اطلب العربية' : 'اطلب المندوب'}
          {!submitting && (step === 1 ? <ArrowLeft size={20} strokeWidth={1.75} /> : <Check size={22} strokeWidth={2} />)}
        </button>
      </div>
    </div>
  );
}

function Title({ icon: Icon, title, sub }: { icon: typeof MapPin; title: string; sub: string }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div
        style={{
          width: 52,
          height: 52,
          borderRadius: 18,
          background: 'linear-gradient(145deg,#DBEAFE,#EFF6FF)',
          display: 'grid',
          placeItems: 'center',
          color: '#2563EB',
          marginBottom: 14,
        }}
      >
        <Icon size={26} strokeWidth={1.75} />
      </div>
      <div style={{ fontSize: 26, fontWeight: 800, color: '#0F172A' }}>{title}</div>
      <div style={{ fontSize: 15, color: '#64748B', marginTop: 6 }}>{sub}</div>
    </div>
  );
}

/** The "share my location" button — green once a pin is captured. */
const pinBtn = (done: boolean): React.CSSProperties => ({
  width: '100%',
  minHeight: 52,
  borderRadius: 16,
  border: `1.5px solid ${done ? '#22C55E' : '#2563EB'}`,
  background: done ? '#F0FDF4' : '#EFF6FF',
  color: done ? '#15803D' : '#1D4ED8',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 10,
  fontSize: 15,
  fontWeight: 700,
  cursor: 'pointer',
  fontFamily: 'inherit',
});

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
