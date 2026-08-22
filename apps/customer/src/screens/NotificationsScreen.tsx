import type { NotificationView } from '@sprintgo/shared';
import { Bell, BellOff, CheckCheck, ChevronRight } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { listNotifications, markAllRead, markRead } from '../lib/notifications';

/** Relative time in plain Egyptian — "من ٥ دقايق" reads faster than a timestamp. */
function ago(iso: string): string {
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return 'دلوقتي';
  if (mins < 60) return `من ${mins} دقيقة`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `من ${hours} ساعة`;
  const days = Math.round(hours / 24);
  return days === 1 ? 'إمبارح' : `من ${days} يوم`;
}

/**
 * The notification centre. Tapping one marks it read and, when it carries an
 * order, opens that order's tracking screen — a notification the customer can't
 * act on is just noise.
 */
export function NotificationsScreen() {
  const navigate = useNavigate();
  const [items, setItems] = useState<NotificationView[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  function load() {
    listNotifications()
      .then(setItems)
      .catch(() => setError('مقدرناش نجيب الإشعارات دلوقتي'))
      .finally(() => setLoading(false));
  }
  useEffect(load, []);

  async function open(n: NotificationView) {
    if (!n.read) {
      setItems((list) => list.map((x) => (x.id === n.id ? { ...x, read: true } : x)));
      markRead(n.id).catch(() => {});
    }
    const orderId = typeof n.data?.orderId === 'string' ? n.data.orderId : null;
    if (orderId) navigate(`/track/${orderId}`);
  }

  async function readAll() {
    setItems((list) => list.map((x) => ({ ...x, read: true })));
    try {
      await markAllRead();
    } catch {
      load(); // put the truth back if the server disagreed
    }
  }

  const unread = items.filter((n) => !n.read).length;

  return (
    <div className="sg-screen">
      <div style={{ padding: '14px 20px 0', display: 'flex', alignItems: 'center', gap: 14 }}>
        <button type="button" onClick={() => navigate('/profile')} style={backBtn}>
          <ChevronRight size={24} strokeWidth={1.75} color="#0F172A" />
        </button>
        <div style={{ flex: 1, fontSize: 22, fontWeight: 800, color: '#0F172A' }}>الإشعارات</div>
        {unread > 0 && (
          <button
            type="button"
            onClick={readAll}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              border: 'none',
              background: '#EFF6FF',
              color: '#1D4ED8',
              borderRadius: 999,
              padding: '9px 14px',
              fontSize: 13,
              fontWeight: 700,
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            <CheckCheck size={17} strokeWidth={2} /> علّم الكل مقروء
          </button>
        )}
      </div>

      <div className="sg-scroll" style={{ padding: '20px 20px 24px' }}>
        {error && (
          <div style={{ background: '#FEF2F2', color: '#DC2626', borderRadius: 14, padding: '12px 16px', fontSize: 14, fontWeight: 600 }}>
            {error}
          </div>
        )}

        {!loading && !error && items.length === 0 && (
          <div style={{ textAlign: 'center', padding: '56px 20px' }}>
            <div style={{ width: 88, height: 88, borderRadius: 999, margin: '0 auto', background: 'linear-gradient(145deg,#F1F5F9,#F8FAFC)', display: 'grid', placeItems: 'center', color: '#94A3B8' }}>
              <BellOff size={40} strokeWidth={1.5} />
            </div>
            <div style={{ fontSize: 22, fontWeight: 800, color: '#0F172A', marginTop: 22 }}>مفيش إشعارات لسه</div>
            <div style={{ fontSize: 15, color: '#64748B', marginTop: 8, lineHeight: 1.6 }}>
              أول ما يحصل جديد في طلبك، هتلاقيه هنا.
            </div>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {items.map((n) => (
            <button
              key={n.id}
              type="button"
              onClick={() => open(n)}
              className="sg-card"
              style={{
                padding: 16,
                display: 'flex',
                gap: 14,
                alignItems: 'flex-start',
                textAlign: 'start',
                border: 'none',
                width: '100%',
                cursor: 'pointer',
                background: n.read ? '#fff' : '#F8FBFF',
                fontFamily: 'inherit',
              }}
            >
              <div
                style={{
                  width: 46,
                  height: 46,
                  borderRadius: 15,
                  background: n.read ? '#F1F5F9' : '#DBEAFE',
                  display: 'grid',
                  placeItems: 'center',
                  color: n.read ? '#64748B' : '#2563EB',
                  flex: 'none',
                }}
              >
                <Bell size={22} strokeWidth={1.75} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 16, fontWeight: 800, color: '#0F172A' }}>{n.title}</span>
                  {!n.read && <span style={{ width: 9, height: 9, borderRadius: 999, background: '#2563EB', flex: 'none' }} />}
                </div>
                <div style={{ fontSize: 14, color: '#64748B', marginTop: 4, lineHeight: 1.6 }}>{n.body}</div>
                <div style={{ fontSize: 12, color: '#94A3B8', marginTop: 6 }}>{ago(n.createdAt)}</div>
              </div>
            </button>
          ))}
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
