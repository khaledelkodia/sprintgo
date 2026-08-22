import { displayPhone } from '@sprintgo/shared';
import { Bell, ChevronLeft, LogOut, MapPin, Package } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { unreadCount } from '../lib/notifications';

export function ProfileScreen() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    if (!user) return;
    unreadCount()
      .then((r) => setUnread(r.count))
      .catch(() => {});
  }, [user]);

  function onLogout() {
    logout();
    navigate('/login', { replace: true });
  }

  return (
    <div style={{ paddingBottom: 20 }}>
      {/* identity */}
      <div style={{ padding: '20px 20px 0', display: 'flex', alignItems: 'center', gap: 16 }}>
        <div
          style={{
            width: 72,
            height: 72,
            borderRadius: 999,
            background: 'linear-gradient(145deg,#DBEAFE,#F1F5F9)',
            display: 'grid',
            placeItems: 'center',
            fontSize: 28,
            fontWeight: 800,
            color: '#2563EB',
            flex: 'none',
          }}
        >
          {(user?.name ?? '؟').slice(0, 1)}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 24, fontWeight: 800, color: '#0F172A' }}>{user?.name ?? 'أهلاً بيك'}</div>
          <div dir="ltr" style={{ fontSize: 15, color: '#64748B', marginTop: 4, display: 'inline-block' }}>
            {user ? displayPhone(user.phone) : ''}
          </div>
        </div>
      </div>

      {/* menu */}
      <div style={{ padding: '24px 20px 0', display: 'flex', flexDirection: 'column', gap: 10 }}>
        <Row icon={Package} bg="#EFF6FF" color="#2563EB" label="طلباتي" onClick={() => navigate('/orders')} />
        <Row icon={MapPin} bg="#F0FDF4" color="#16A34A" label="عناويني" onClick={() => navigate('/addresses')} />
        <Row icon={Bell} bg="#FFF7ED" color="#EA580C" label="الإشعارات" badge={unread} onClick={() => navigate('/notifications')} />
        <Row icon={LogOut} bg="#FEF2F2" color="#DC2626" label="تسجيل الخروج" danger onClick={onLogout} />
      </div>
    </div>
  );
}

function Row({
  icon: Icon,
  bg,
  color,
  label,
  danger,
  badge,
  onClick,
}: {
  icon: LucideIcon;
  bg: string;
  color: string;
  label: string;
  danger?: boolean;
  /** unread counter — hidden at zero so the row stays calm */
  badge?: number;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="sg-card-soft"
      style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 16, cursor: 'pointer', border: 'none', width: '100%', textAlign: 'start', background: '#fff' }}
    >
      <div style={{ width: 50, height: 50, borderRadius: 16, background: bg, display: 'grid', placeItems: 'center', color, flex: 'none' }}>
        <Icon size={26} strokeWidth={1.75} />
      </div>
      <div style={{ flex: 1, fontSize: 17, fontWeight: 600, color: danger ? '#DC2626' : '#0F172A' }}>{label}</div>
      {!!badge && badge > 0 && (
        <div
          style={{
            minWidth: 26,
            height: 26,
            borderRadius: 999,
            background: '#EF4444',
            color: '#fff',
            fontSize: 13,
            fontWeight: 800,
            display: 'grid',
            placeItems: 'center',
            padding: '0 8px',
          }}
        >
          {badge > 9 ? '+9' : badge}
        </div>
      )}
      {!danger && <ChevronLeft size={22} strokeWidth={1.75} color="#CBD5E1" />}
    </button>
  );
}
