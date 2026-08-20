import { displayPhone } from '@sprintgo/shared';
import { formatMoney } from '@sprintgo/shared';
import type { CourierSummaryView } from '@sprintgo/shared';
import { Bike, ChevronLeft, FileText, LifeBuoy, LogOut, Settings } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useAuth } from '../lib/auth';
import { getSummary } from '../lib/courier';

export function ProfileScreen() {
  const { user, logout } = useAuth();
  const [summary, setSummary] = useState<CourierSummaryView | null>(null);

  useEffect(() => {
    getSummary().then(setSummary).catch(() => {});
  }, []);

  return (
    <div style={{ paddingBottom: 20 }}>
      {/* identity */}
      <div style={{ padding: '20px 20px 0', display: 'flex', alignItems: 'center', gap: 16 }}>
        <div style={{ width: 72, height: 72, borderRadius: 999, background: 'linear-gradient(145deg,#DCFCE7,#F0FDF4)', display: 'grid', placeItems: 'center', fontSize: 28, fontWeight: 800, color: '#16A34A', flex: 'none' }}>
          {(user?.name ?? 'ك').slice(0, 1)}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 24, fontWeight: 800, color: '#0F172A' }}>كابتن {user?.name ?? ''}</div>
          <div dir="ltr" style={{ fontSize: 14, color: '#64748B', marginTop: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Bike size={15} strokeWidth={1.75} /> {user ? displayPhone(user.phone) : ''}
          </div>
        </div>
      </div>

      {/* cash to remit */}
      <div style={{ padding: '20px 20px 0' }}>
        <div style={{ position: 'relative', borderRadius: 26, overflow: 'hidden', background: 'linear-gradient(135deg,#C2410C,#EA580C 60%,#F97316)', padding: 22, boxShadow: '0 16px 36px rgba(234,88,12,.28)' }}>
          <div style={{ position: 'absolute', top: -50, right: -30, width: 160, height: 160, borderRadius: 999, background: 'rgba(255,255,255,.14)' }} />
          <div style={{ position: 'relative', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,.85)', fontWeight: 600 }}>مطلوب توريده للمنصة</div>
              <div style={{ fontSize: 34, fontWeight: 800, color: '#fff', lineHeight: 1.1, marginTop: 6 }}>{formatMoney(summary?.feesToRemit ?? 0)}</div>
            </div>
          </div>
        </div>
      </div>

      {/* menu */}
      <div style={{ padding: '20px 20px 0', display: 'flex', flexDirection: 'column', gap: 10 }}>
        <Row icon={FileText} bg="#F5F3FF" color="#7C3AED" label="مستنداتي" />
        <Row icon={Settings} bg="#F1F5F9" color="#475569" label="الإعدادات" />
        <Row icon={LifeBuoy} bg="#F1F5F9" color="#475569" label="مركز المساعدة" />
        <Row icon={LogOut} bg="#FEF2F2" color="#DC2626" label="تسجيل الخروج" danger onClick={logout} />
      </div>
    </div>
  );
}

function Row({ icon: Icon, bg, color, label, danger, onClick }: { icon: LucideIcon; bg: string; color: string; label: string; danger?: boolean; onClick?: () => void }) {
  return (
    <button type="button" onClick={onClick} className="sg-card-soft" style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 16, cursor: 'pointer', border: 'none', width: '100%', textAlign: 'start', background: '#fff' }}>
      <div style={{ width: 50, height: 50, borderRadius: 16, background: bg, display: 'grid', placeItems: 'center', color, flex: 'none' }}>
        <Icon size={26} strokeWidth={1.75} />
      </div>
      <div style={{ flex: 1, fontSize: 17, fontWeight: 600, color: danger ? '#DC2626' : '#0F172A' }}>{label}</div>
      {!danger && <ChevronLeft size={22} strokeWidth={1.75} color="#CBD5E1" />}
    </button>
  );
}
