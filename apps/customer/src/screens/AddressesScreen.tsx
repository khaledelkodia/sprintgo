import type { AddressView, CreateAddressDto, ZoneView } from '@sprintgo/shared';
import { Check, ChevronRight, Home, LocateFixed, MapPin, Pencil, Plus, Star, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ApiError } from '../lib/api';
import { createAddress, deleteAddress, getAddresses, updateAddress } from '../lib/catalog';
import { getZones } from '../lib/orders';

type Draft = {
  id: string | null;
  label: string;
  zoneId: string;
  street: string;
  building: string;
  landmark: string;
  lat: number | null;
  lng: number | null;
};

const emptyDraft = (): Draft => ({
  id: null,
  label: '',
  zoneId: '',
  street: '',
  building: '',
  landmark: '',
  lat: null,
  lng: null,
});

/**
 * The customer's address book. Saving an address with its pin is what lets a
 * catalog order reach the courier with a map — typing the street each time never
 * could. The default address is the one checkout preselects.
 */
export function AddressesScreen() {
  const navigate = useNavigate();
  const [list, setList] = useState<AddressView[]>([]);
  const [zones, setZones] = useState<ZoneView[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [saving, setSaving] = useState(false);
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState('');

  function load() {
    getAddresses()
      .then(setList)
      .catch(() => setError('مقدرناش نجيب عناوينك دلوقتي'))
      .finally(() => setLoading(false));
  }
  useEffect(() => {
    load();
    getZones().then(setZones).catch(() => {});
  }, []);

  function openNew() {
    setError('');
    setDraft(emptyDraft());
  }

  function openEdit(a: AddressView) {
    setError('');
    setDraft({
      id: a.id,
      label: a.label,
      zoneId: a.zoneId,
      street: a.street,
      building: a.building ?? '',
      landmark: a.landmark ?? '',
      lat: a.lat,
      lng: a.lng,
    });
  }

  function locate() {
    if (!draft || !('geolocation' in navigator)) {
      setError('جهازك مش بيدعم تحديد الموقع — اكتب العنوان وكفاية.');
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setDraft((d) => (d ? { ...d, lat: pos.coords.latitude, lng: pos.coords.longitude } : d));
        setLocating(false);
      },
      () => {
        setError('مقدرناش نجيب موقعك — فعّل الـ GPS أو اكتب العنوان بنفسك.');
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 8000 },
    );
  }

  async function save() {
    if (!draft || saving) return;
    setError('');
    if (!draft.label.trim()) return setError('اكتب اسم للعنوان زي "البيت"');
    if (!draft.zoneId) return setError('اختار منطقتك');
    if (draft.street.trim().length < 2) return setError('اكتب اسم الشارع');

    const body: CreateAddressDto = {
      label: draft.label.trim(),
      zoneId: draft.zoneId,
      street: draft.street.trim(),
      building: draft.building.trim() || undefined,
      landmark: draft.landmark.trim() || undefined,
      lat: draft.lat ?? undefined,
      lng: draft.lng ?? undefined,
    };

    setSaving(true);
    try {
      if (draft.id) await updateAddress(draft.id, body);
      else await createAddress(body);
      setDraft(null);
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'حصلت مشكلة بسيطة، حاوِل تاني من فضلك');
    } finally {
      setSaving(false);
    }
  }

  async function makeDefault(a: AddressView) {
    if (a.isDefault) return;
    try {
      await updateAddress(a.id, { isDefault: true });
      load();
    } catch {
      setError('مقدرناش نغيّر العنوان الأساسي دلوقتي');
    }
  }

  async function remove(a: AddressView) {
    if (!window.confirm(`تحب نمسح عنوان "${a.label}"؟`)) return;
    try {
      await deleteAddress(a.id);
      load();
    } catch {
      setError('مقدرناش نمسح العنوان دلوقتي');
    }
  }

  return (
    <div className="sg-screen">
      <div style={{ padding: '14px 20px 0', display: 'flex', alignItems: 'center', gap: 14 }}>
        <button type="button" onClick={() => (draft ? setDraft(null) : navigate('/profile'))} style={backBtn}>
          <ChevronRight size={24} strokeWidth={1.75} color="#0F172A" />
        </button>
        <div style={{ fontSize: 22, fontWeight: 800, color: '#0F172A' }}>{draft ? (draft.id ? 'تعديل العنوان' : 'عنوان جديد') : 'عناويني'}</div>
      </div>

      <div className="sg-scroll" style={{ padding: '20px 20px 0' }}>
        {error && (
          <div style={{ background: '#FEF2F2', color: '#DC2626', borderRadius: 14, padding: '12px 16px', fontSize: 14, fontWeight: 600, marginBottom: 14 }}>
            {error}
          </div>
        )}

        {draft ? (
          <>
            <label style={label}>اسم العنوان</label>
            <input value={draft.label} onChange={(e) => setDraft({ ...draft, label: e.target.value })} placeholder="البيت / الشغل" style={field} />

            <label style={{ ...label, marginTop: 18 }}>المنطقة</label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {zones.map((z) => {
                const on = draft.zoneId === z.id;
                return (
                  <button
                    key={z.id}
                    type="button"
                    onClick={() => setDraft({ ...draft, zoneId: z.id })}
                    style={{
                      borderRadius: 999,
                      border: `1.5px solid ${on ? '#2563EB' : '#E2E8F0'}`,
                      background: on ? '#EFF6FF' : '#fff',
                      color: on ? '#1D4ED8' : '#334155',
                      padding: '10px 16px',
                      fontSize: 14,
                      fontWeight: 600,
                      cursor: 'pointer',
                      fontFamily: 'inherit',
                    }}
                  >
                    {z.nameAr}
                  </button>
                );
              })}
            </div>

            <label style={{ ...label, marginTop: 18 }}>الشارع</label>
            <input value={draft.street} onChange={(e) => setDraft({ ...draft, street: e.target.value })} placeholder="اسم الشارع ورقمه" style={field} />

            <label style={{ ...label, marginTop: 18 }}>العمارة والدور (اختياري)</label>
            <input value={draft.building} onChange={(e) => setDraft({ ...draft, building: e.target.value })} placeholder="عمارة 12 — الدور 3" style={field} />

            <label style={{ ...label, marginTop: 18 }}>علامة مميزة (اختياري)</label>
            <input value={draft.landmark} onChange={(e) => setDraft({ ...draft, landmark: e.target.value })} placeholder="جنب صيدلية العزبي" style={field} />

            <button
              type="button"
              onClick={locate}
              disabled={locating}
              style={{
                marginTop: 18,
                width: '100%',
                minHeight: 54,
                borderRadius: 16,
                border: `1.5px solid ${draft.lat != null ? '#22C55E' : '#2563EB'}`,
                background: draft.lat != null ? '#F0FDF4' : '#EFF6FF',
                color: draft.lat != null ? '#15803D' : '#1D4ED8',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 10,
                fontSize: 15,
                fontWeight: 700,
                cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >
              <LocateFixed size={20} strokeWidth={1.75} />
              {locating ? 'بنحدد موقعك…' : draft.lat != null ? 'تمام، المكان اتحدّد ✓' : 'حدّد المكان على الخريطة'}
            </button>
            <p style={{ fontSize: 13, color: '#94A3B8', marginTop: 8, lineHeight: 1.5 }}>
              لما تحدد المكان، المندوب بيلاقيك على طول من غير ما يتصل يسأل.
            </p>
          </>
        ) : loading ? null : list.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 20px' }}>
            <div style={{ width: 88, height: 88, borderRadius: 999, margin: '0 auto', background: 'linear-gradient(145deg,#DBEAFE,#EFF6FF)', display: 'grid', placeItems: 'center', color: '#2563EB' }}>
              <MapPin size={42} strokeWidth={1.5} />
            </div>
            <div style={{ fontSize: 22, fontWeight: 800, color: '#0F172A', marginTop: 22 }}>مفيش عناوين محفوظة</div>
            <div style={{ fontSize: 15, color: '#64748B', marginTop: 8, lineHeight: 1.6 }}>
              احفظ عنوانك مرة واحدة، وكل طلب بعد كده يبقى أسرع.
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {list.map((a) => (
              <div key={a.id} className="sg-card" style={{ padding: 16 }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                  <div style={{ width: 46, height: 46, borderRadius: 15, background: a.isDefault ? '#EFF6FF' : '#F1F5F9', display: 'grid', placeItems: 'center', color: a.isDefault ? '#2563EB' : '#64748B', flex: 'none' }}>
                    <Home size={22} strokeWidth={1.75} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 17, fontWeight: 800, color: '#0F172A' }}>{a.label}</span>
                      {a.isDefault && (
                        <span style={{ fontSize: 12, fontWeight: 700, color: '#1D4ED8', background: '#EFF6FF', borderRadius: 999, padding: '3px 10px' }}>
                          الأساسي
                        </span>
                      )}
                      {a.lat != null && (
                        <span style={{ fontSize: 12, fontWeight: 700, color: '#15803D', background: '#F0FDF4', borderRadius: 999, padding: '3px 10px' }}>
                          على الخريطة ✓
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: 14, color: '#64748B', marginTop: 4, lineHeight: 1.5 }}>
                      {a.zoneName} · {a.street}
                      {a.building ? ` · ${a.building}` : ''}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
                  {!a.isDefault && (
                    <button type="button" onClick={() => makeDefault(a)} style={rowBtn('#EFF6FF', '#1D4ED8')}>
                      <Star size={17} strokeWidth={1.9} /> خليه الأساسي
                    </button>
                  )}
                  <button type="button" onClick={() => openEdit(a)} style={rowBtn('#F1F5F9', '#334155')}>
                    <Pencil size={17} strokeWidth={1.9} /> تعديل
                  </button>
                  <button type="button" onClick={() => remove(a)} style={rowBtn('#FEF2F2', '#DC2626')}>
                    <Trash2 size={17} strokeWidth={1.9} /> مسح
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ padding: '16px 20px 34px' }}>
        {draft ? (
          <button type="button" onClick={save} disabled={saving} className="sg-btn sg-btn-primary" style={{ width: '100%', opacity: saving ? 0.6 : 1 }}>
            {saving ? 'بنحفظ…' : 'احفظ العنوان'}
            {!saving && <Check size={22} strokeWidth={2} />}
          </button>
        ) : (
          <button type="button" onClick={openNew} className="sg-btn sg-btn-primary" style={{ width: '100%' }}>
            <Plus size={22} strokeWidth={2} /> ضيف عنوان جديد
          </button>
        )}
      </div>
    </div>
  );
}

const rowBtn = (bg: string, color: string): React.CSSProperties => ({
  display: 'flex',
  alignItems: 'center',
  gap: 6,
  borderRadius: 14,
  border: 'none',
  background: bg,
  color,
  padding: '10px 14px',
  fontSize: 14,
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
