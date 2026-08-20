import { ChevronLeft, Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { SERVICES, serviceRoute, tileGradient } from '../lib/services';

export function ServicesScreen() {
  const navigate = useNavigate();

  return (
    <div style={{ paddingBottom: 20 }}>
      <div style={{ padding: '18px 20px 0' }}>
        <div style={{ fontSize: 30, fontWeight: 800, color: '#0F172A' }}>كل الخدمات</div>
        <div style={{ fontSize: 16, color: '#64748B', marginTop: 8 }}>
          كل ما تستطيع سبرينت جو فعله من أجلك.
        </div>
      </div>

      <div style={{ padding: '18px 20px 0' }}>
        <div
          onClick={() => navigate('/stores')}
          style={{
            height: 56,
            background: '#fff',
            borderRadius: 20,
            boxShadow: 'var(--shadow-soft)',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '0 20px',
            cursor: 'pointer',
          }}
        >
          <Search size={22} strokeWidth={1.75} color="#94A3B8" />
          <span style={{ fontSize: 16, color: '#94A3B8' }}>دوّر على محل أو منتج…</span>
        </div>
      </div>

      <div style={{ padding: '18px 20px 0', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {SERVICES.map((s) => {
          const Icon = s.icon;
          return (
            <div
              key={s.id}
              onClick={() => navigate(serviceRoute(s))}
              style={{
                background: '#fff',
                borderRadius: 22,
                padding: 16,
                display: 'flex',
                alignItems: 'center',
                gap: 16,
                boxShadow: 'var(--shadow-soft)',
                cursor: 'pointer',
              }}
            >
              <div
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: 18,
                  background: tileGradient(s.grad),
                  display: 'grid',
                  placeItems: 'center',
                  color: s.color,
                  flex: 'none',
                }}
              >
                <Icon size={28} strokeWidth={1.75} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 17, fontWeight: 700, color: '#0F172A' }}>{s.title}</div>
                <div style={{ fontSize: 13, color: '#64748B', marginTop: 3 }}>{s.desc}</div>
              </div>
              <ChevronLeft size={22} strokeWidth={1.75} color="#CBD5E1" />
            </div>
          );
        })}
      </div>
    </div>
  );
}
