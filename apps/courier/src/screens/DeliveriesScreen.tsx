import type { CourierTaskView } from '@sprintgo/shared';
import { formatMoney } from '@sprintgo/shared';
import { Navigation, Package } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getTasks } from '../lib/courier';

export function DeliveriesScreen() {
  const navigate = useNavigate();
  const [tasks, setTasks] = useState<CourierTaskView[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getTasks()
      .then(setTasks)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div style={{ paddingBottom: 20 }}>
      <div style={{ padding: '18px 20px 0' }}>
        <div style={{ fontSize: 30, fontWeight: 800, color: '#0F172A' }}>توصيلاتي</div>
      </div>

      {loading ? (
        <div style={{ padding: '40px 20px', textAlign: 'center', color: '#94A3B8' }}>لحظة واحدة…</div>
      ) : tasks.length === 0 ? (
        <div style={{ padding: '60px 36px', textAlign: 'center' }}>
          <div style={{ width: 90, height: 90, borderRadius: 28, margin: '0 auto 20px', background: 'linear-gradient(145deg,#EFF6FF,#F8FAFC)', display: 'grid', placeItems: 'center', color: '#2563EB' }}>
            <Package size={40} strokeWidth={1.5} />
          </div>
          <div style={{ fontSize: 20, fontWeight: 800, color: '#0F172A' }}>مفيش توصيلات جارية</div>
          <div style={{ fontSize: 15, color: '#64748B', marginTop: 8 }}>اشتغل أونلاين من الرئيسية عشان توصلك طلبات.</div>
        </div>
      ) : (
        <div style={{ padding: '18px 20px 0', display: 'flex', flexDirection: 'column', gap: 12 }}>
          {tasks.map((t) => {
            const pickedUp = t.assignmentStatus === 'PICKED_UP';
            return (
              <div key={t.orderId} onClick={() => navigate('/active')} className="sg-card" style={{ padding: 18, cursor: 'pointer' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#F0FDF4', borderRadius: 999, padding: '7px 14px' }}>
                    <span style={{ width: 7, height: 7, borderRadius: 999, background: '#22C55E' }} />
                    <span style={{ fontSize: 12.5, fontWeight: 700, color: '#15803D' }}>{pickedUp ? 'في الطريق للعميل' : 'روح استلم'}</span>
                  </div>
                  <div dir="ltr" style={{ fontSize: 13, color: '#94A3B8', fontWeight: 600 }}>#{t.code}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 16 }}>
                  <div style={{ width: 54, height: 54, borderRadius: 18, background: 'linear-gradient(145deg,#DBEAFE,#EFF6FF)', display: 'grid', placeItems: 'center', color: '#2563EB', flex: 'none' }}>
                    <Package size={28} strokeWidth={1.75} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 17, fontWeight: 700, color: '#0F172A' }}>{t.dropoff?.zoneName ?? 'توصيلة'}</div>
                    <div style={{ fontSize: 13, color: '#64748B', marginTop: 3 }}>تحصيل {formatMoney(t.cashToCollect)}</div>
                  </div>
                  <div style={{ width: 48, height: 48, borderRadius: 16, background: '#2563EB', display: 'grid', placeItems: 'center', color: '#fff', boxShadow: '0 10px 22px rgba(37,99,235,.32)', flex: 'none' }}>
                    <Navigation size={22} strokeWidth={1.75} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
