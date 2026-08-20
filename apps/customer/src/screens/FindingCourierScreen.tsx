import { Truck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const shimmer =
  'linear-gradient(90deg,#F1F5F9,#E7EDF4,#F1F5F9)';

export function FindingCourierScreen() {
  const navigate = useNavigate();

  return (
    <div className="sg-screen">
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '0 36px',
          textAlign: 'center',
        }}
      >
        {/* radar */}
        <div style={{ position: 'relative', width: 190, height: 190, display: 'grid', placeItems: 'center', marginBottom: 36 }}>
          <div style={{ position: 'absolute', width: 190, height: 190, borderRadius: 999, background: '#2563EB', animation: 'sgPulse 2.6s ease-out infinite' }} />
          <div style={{ position: 'absolute', width: 190, height: 190, borderRadius: 999, background: '#2563EB', animation: 'sgPulse 2.6s ease-out infinite', animationDelay: '.9s' }} />
          <div
            style={{
              position: 'absolute',
              width: 170,
              height: 170,
              borderRadius: 999,
              border: '4px solid #E2E8F0',
              borderTopColor: '#2563EB',
              animation: 'sgSpin 1.4s linear infinite',
            }}
          />
          <div
            style={{
              position: 'relative',
              width: 92,
              height: 92,
              borderRadius: 32,
              background: '#fff',
              boxShadow: '0 18px 40px rgba(37,99,235,.22)',
              display: 'grid',
              placeItems: 'center',
              color: '#2563EB',
            }}
          >
            <Truck size={46} strokeWidth={1.75} />
          </div>
        </div>

        <div style={{ fontSize: 26, fontWeight: 800, color: '#0F172A' }}>نبحث عن مندوب لك</div>
        <div style={{ fontSize: 16, color: '#64748B', marginTop: 10, lineHeight: 1.5 }}>
          عادةً أقل من دقيقة، وسنخبرك فوراً.
        </div>

        {/* skeletons */}
        <div style={{ width: '100%', marginTop: 30, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <SkeletonRow />
          <SkeletonRow dim />
        </div>
      </div>

      <div style={{ padding: '18px 20px 40px' }}>
        <button
          type="button"
          onClick={() => navigate('/')}
          style={{
            width: '100%',
            height: 58,
            borderRadius: 20,
            background: '#F1F5F9',
            color: '#475569',
            border: 'none',
            fontSize: 17,
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          إلغاء
        </button>
      </div>
    </div>
  );
}

function SkeletonRow({ dim }: { dim?: boolean }) {
  return (
    <div
      style={{
        height: 66,
        borderRadius: 22,
        background: '#fff',
        boxShadow: 'var(--shadow-soft)',
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        padding: '0 16px',
        opacity: dim ? 0.6 : 1,
      }}
    >
      <div
        style={{
          width: 44,
          height: 44,
          borderRadius: 14,
          background: shimmer,
          backgroundSize: '320px 100%',
          animation: 'sgShimmer 1.5s linear infinite',
        }}
      />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ height: 12, width: '60%', borderRadius: 999, background: shimmer, backgroundSize: '320px 100%', animation: 'sgShimmer 1.5s linear infinite' }} />
        <div style={{ height: 10, width: '38%', borderRadius: 999, background: shimmer, backgroundSize: '320px 100%', animation: 'sgShimmer 1.5s linear infinite' }} />
      </div>
    </div>
  );
}
