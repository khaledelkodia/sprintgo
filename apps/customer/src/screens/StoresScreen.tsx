import type { StoreCardView } from '@sprintgo/shared';
import { formatMoney } from '@sprintgo/shared';
import { ChevronRight, Clock, Search, Star, Store } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getStores } from '../lib/catalog';

export function StoresScreen() {
  const navigate = useNavigate();
  const [stores, setStores] = useState<StoreCardView[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');

  useEffect(() => {
    getStores()
      .then(setStores)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(
    () => (q.trim() ? stores.filter((s) => s.name.includes(q.trim())) : stores),
    [stores, q],
  );

  return (
    <div className="sg-screen">
      <div style={{ padding: '14px 20px 0', display: 'flex', alignItems: 'center', gap: 14 }}>
        <button type="button" onClick={() => navigate('/')} style={backBtn}>
          <ChevronRight size={24} strokeWidth={1.75} color="#0F172A" />
        </button>
        <div style={{ fontSize: 22, fontWeight: 800, color: '#0F172A' }}>المحلات</div>
      </div>

      <div style={{ padding: '16px 20px 0' }}>
        <div style={{ height: 54, background: '#fff', borderRadius: 18, boxShadow: 'var(--shadow-card)', display: 'flex', alignItems: 'center', gap: 12, padding: '0 18px' }}>
          <Search size={20} strokeWidth={1.75} color="#94A3B8" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="دوّر على محل"
            style={{ flex: 1, border: 'none', outline: 'none', fontSize: 16, color: '#0F172A', background: 'transparent', fontFamily: 'inherit' }}
          />
        </div>
      </div>

      <div className="sg-scroll" style={{ padding: '18px 20px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
        {loading ? (
          <div style={{ textAlign: 'center', color: '#94A3B8', padding: 40 }}>لحظة، بنجيب المحلات…</div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', color: '#94A3B8', padding: 40 }}>مفيش محلات متاحة دلوقتي.</div>
        ) : (
          filtered.map((s) => (
            <div
              key={s.id}
              onClick={() => navigate(`/store/${s.slug}`)}
              className="sg-card"
              style={{ padding: 16, display: 'flex', alignItems: 'center', gap: 14, cursor: 'pointer' }}
            >
              <div style={{ width: 60, height: 60, borderRadius: 18, background: 'linear-gradient(145deg,#DBEAFE,#EFF6FF)', display: 'grid', placeItems: 'center', color: '#2563EB', flex: 'none' }}>
                <Store size={28} strokeWidth={1.75} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 17, fontWeight: 700, color: '#0F172A' }}>{s.name}</div>
                <div style={{ fontSize: 13, color: '#64748B', marginTop: 3 }}>{s.serviceType.nameAr}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 8, fontSize: 12.5, color: '#64748B' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#0F172A', fontWeight: 600 }}>
                    <Star size={14} strokeWidth={1.75} color="#F97316" /> {s.ratingAvg > 0 ? s.ratingAvg.toFixed(1) : 'جديد'}
                  </span>
                  {s.delivery && (
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Clock size={13} strokeWidth={1.75} /> {s.delivery.etaMins ?? s.prepTimeMins} دقيقة
                    </span>
                  )}
                  <span style={{ color: s.isOpenNow && s.isAcceptingOrders ? '#16A34A' : '#DC2626', fontWeight: 600 }}>
                    {s.isOpenNow && s.isAcceptingOrders ? 'مفتوح' : 'مقفول'}
                  </span>
                </div>
              </div>
              {s.delivery && (
                <div style={{ textAlign: 'center', flex: 'none' }}>
                  <div style={{ fontSize: 11, color: '#94A3B8' }}>التوصيل</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#2563EB' }}>{formatMoney(s.delivery.fee)}</div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

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
