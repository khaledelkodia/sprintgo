import { ChevronRight, Clock, Sparkles } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';

export function ComingSoonScreen() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const name = params.get('s') || 'الخدمة دي';

  return (
    <div className="sg-screen">
      <div style={{ padding: '14px 20px 0' }}>
        <button type="button" onClick={() => navigate('/')} style={backBtn}>
          <ChevronRight size={24} strokeWidth={1.75} color="#0F172A" />
        </button>
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '0 32px' }}>
        <div style={{ position: 'relative', width: 104, height: 104, display: 'grid', placeItems: 'center' }}>
          <div style={{ position: 'absolute', inset: 0, borderRadius: 999, background: 'linear-gradient(145deg,#DBEAFE,#EFF6FF)' }} />
          <Clock size={48} strokeWidth={1.5} color="#2563EB" style={{ position: 'relative' }} />
        </div>
        <div style={{ fontSize: 26, fontWeight: 800, color: '#0F172A', marginTop: 26 }}>{name} — قريبًا</div>
        <div style={{ fontSize: 16, color: '#64748B', marginTop: 10, lineHeight: 1.6 }}>
          بنجهّزها كويس عشان تطلع سهلة وحلوة. لحد ما تجهز، تقدر تستخدم المشوار أو تتسوّق من المحلات.
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 30, width: '100%' }}>
          <button type="button" onClick={() => navigate('/order?mode=buy')} className="sg-btn sg-btn-primary" style={{ width: '100%' }}>
            <Sparkles size={20} strokeWidth={1.75} /> اطلب مشوار
          </button>
          <button type="button" onClick={() => navigate('/stores')} style={{ width: '100%', height: 56, borderRadius: 18, background: '#F1F5F9', color: '#334155', border: 'none', fontSize: 16, fontWeight: 700, cursor: 'pointer' }}>
            اتسوّق من المحلات
          </button>
        </div>
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
