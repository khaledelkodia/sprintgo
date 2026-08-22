import type { CourierProfileView, CourierSummaryView, CourierTaskView, CourierWalletView } from '@sprintgo/shared';
import { formatMoney, vehicleLabel } from '@sprintgo/shared';
import { AlertTriangle, Banknote, Navigation, Package, Power, Truck, Wallet, Zap } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { getMe, getOffer, getSummary, getTasks, getWallet, setAvailability } from '../lib/courier';
import { useHeartbeat } from '../lib/useHeartbeat';
import { useRealtimeEvent } from '../lib/realtime';

export function HomeScreen() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [online, setOnline] = useState(() => {
    try {
      return localStorage.getItem('sg_online') === '1';
    } catch {
      return false;
    }
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [summary, setSummary] = useState<CourierSummaryView | null>(null);
  const [wallet, setWallet] = useState<CourierWalletView | null>(null);
  const [task, setTask] = useState<CourierTaskView | null>(null);
  const [me, setMe] = useState<CourierProfileView | null>(null);

  function loadWallet() {
    getWallet()
      .then((w) => {
        setWallet(w);
        if (w.isBlocked && online) applyOnline(false); // blocked → force offline locally
      })
      .catch(() => {});
  }
  useEffect(() => {
    getSummary().then(setSummary).catch(() => {});
    getMe().then(setMe).catch(() => {});
    getTasks().then((t) => setTask(t[0] ?? null)).catch(() => {});
    loadWallet();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const blocked = wallet?.isBlocked ?? false;

  // while online, keep the platform posted on where we are
  useHeartbeat(online);

  /** Open the offer screen if one is actually waiting for us. */
  const checkOffer = useCallback(() => {
    if (!online) return;
    getOffer()
      .then((offer) => {
        if (offer) navigate('/offer');
      })
      .catch(() => {});
  }, [online, navigate]);

  // The server pushes the offer the moment dispatch picks us — this used to hammer
  // the API every 2 seconds for the whole shift. We still read once when we come
  // online (an offer may already be waiting) and once after a reconnect.
  useRealtimeEvent('order:offer', checkOffer);
  useRealtimeEvent('connect', checkOffer);
  useEffect(checkOffer, [checkOffer]);

  // re-assert availability to the backend on load if we were online (survives reloads)
  useEffect(() => {
    if (online) setAvailability(true).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function applyOnline(next: boolean) {
    setOnline(next);
    try {
      localStorage.setItem('sg_online', next ? '1' : '0');
    } catch {
      /* storage unavailable */
    }
  }

  async function toggle() {
    if (busy) return;
    const nextVal = !online;
    if (nextVal && blocked) {
      setError(wallet?.blockReason ?? 'حسابك موقوف دلوقتي.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      await setAvailability(nextVal);
      applyOnline(nextVal);
    } catch {
      // could be a momentary blip OR a fresh block — refresh the wallet and tell the user
      loadWallet();
      try {
        await setAvailability(nextVal);
        applyOnline(nextVal);
      } catch {
        setError(blocked ? wallet?.blockReason ?? '' : 'مش قادرين نغيّر حالتك دلوقتي، حاوِل تاني بعد ثانية من فضلك.');
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ paddingBottom: 24 }}>
      <div style={{ padding: '12px 20px 0' }}>
        <div style={{ fontSize: 26, fontWeight: 800, color: '#0F172A' }}>أهلاً كابتن {user?.name ?? ''}</div>
        <div style={{ fontSize: 14, color: '#64748B', marginTop: 6 }}>
          {blocked ? 'حسابك متوقّف مؤقتًا' : online ? 'أنت متصل — جاهز للطلبات' : 'ابدأ الوردية عشان تستقبل طلبات'}
        </div>
        {me && (
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 7,
              marginTop: 10,
              background: '#F1F5F9',
              color: '#334155',
              borderRadius: 999,
              padding: '7px 14px',
              fontSize: 13,
              fontWeight: 700,
            }}
          >
            <Truck size={16} strokeWidth={1.9} /> مسجّل بـ {vehicleLabel(me.vehicleType)}
          </div>
        )}
      </div>

      {/* remittance block banner */}
      {blocked && (
        <div style={{ padding: '16px 20px 0' }}>
          <div style={{ background: 'linear-gradient(135deg,#B91C1C,#DC2626)', borderRadius: 22, padding: '18px 18px', color: '#fff', boxShadow: '0 16px 34px rgba(220,38,38,.3)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontWeight: 800, fontSize: 17 }}>
              <AlertTriangle size={22} strokeWidth={2} /> محتاج تورّد للإدارة
            </div>
            <div style={{ fontSize: 14, color: 'rgba(255,255,255,.9)', marginTop: 8, lineHeight: 1.6 }}>
              {wallet?.blockReason ?? 'ورّد فلوس الإدارة الأول عشان تكمّل شغل.'}
            </div>
            {(wallet?.balanceDue ?? 0) > 0 && (
              <div style={{ marginTop: 14, background: 'rgba(255,255,255,.18)', borderRadius: 14, padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 14, fontWeight: 600 }}>المطلوب توريده للإدارة</span>
                <span style={{ fontSize: 20, fontWeight: 800 }}>{formatMoney(wallet!.balanceDue)}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* online toggle */}
      <div style={{ padding: '20px 20px 0' }}>
        <div
          style={{
            position: 'relative',
            borderRadius: 28,
            overflow: 'hidden',
            padding: '24px 22px',
            background: online ? 'linear-gradient(135deg,#15803D,#16A34A 55%,#22C55E)' : 'linear-gradient(135deg,#334155,#475569)',
            boxShadow: online ? '0 18px 40px rgba(34,197,94,.32)' : '0 18px 40px rgba(15,23,42,.2)',
          }}
        >
          <div style={{ position: 'absolute', top: -50, right: -30, width: 170, height: 170, borderRadius: 999, background: 'rgba(255,255,255,.14)' }} />
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ width: 9, height: 9, borderRadius: 999, background: online ? '#BBF7D0' : '#CBD5E1' }} />
                <span style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,.85)' }}>{online ? 'متصل الآن' : 'غير متصل'}</span>
              </div>
              <div style={{ fontSize: 24, fontWeight: 800, color: '#fff', marginTop: 8 }}>{online ? 'جاهز للطلبات' : 'ابدأ الوردية'}</div>
              <div style={{ fontSize: 14, color: 'rgba(255,255,255,.82)', marginTop: 6 }}>{online ? 'بندوّرلك على أقرب طلب.' : 'اضغط عشان تشتغل.'}</div>
            </div>
            <button type="button" onClick={toggle} disabled={busy || blocked} aria-label="تبديل الاتصال" style={{ width: 64, height: 64, borderRadius: 999, border: 'none', cursor: blocked ? 'not-allowed' : 'pointer', flex: 'none', background: '#fff', color: online ? '#16A34A' : '#475569', boxShadow: '0 10px 24px rgba(15,23,42,.2)', display: 'grid', placeItems: 'center', opacity: busy || blocked ? 0.5 : 1 }}>
              <Power size={30} strokeWidth={2} />
            </button>
          </div>
          {online && (
            <div style={{ marginTop: 18, display: 'flex', alignItems: 'center', gap: 8, color: '#fff', fontSize: 14, fontWeight: 600, background: 'rgba(255,255,255,.18)', borderRadius: 14, padding: '12px 16px' }}>
              <Zap size={18} strokeWidth={1.75} /> بنراقب الطلبات القريبة منك…
            </div>
          )}
        </div>
      </div>

      {error && (
        <div style={{ padding: '12px 20px 0' }}>
          <div style={{ background: '#FEF2F2', color: '#DC2626', borderRadius: 14, padding: '12px 16px', fontSize: 14, fontWeight: 600, textAlign: 'center' }}>
            {error}
          </div>
        </div>
      )}

      {/* today earnings */}
      <div style={{ padding: '20px 20px 0' }}>
        <div className="sg-card" style={{ padding: 18 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#0F172A' }}>ملخص اليوم</div>
          <div style={{ display: 'flex', gap: 12, marginTop: 14 }}>
            <MiniStat icon={<Package size={18} strokeWidth={1.75} color="#2563EB" />} bg="#EFF6FF" value={String(wallet?.deliveriesToday ?? summary?.deliveries ?? 0)} label="توصيلة" />
            <MiniStat icon={<Banknote size={18} strokeWidth={1.75} color="#16A34A" />} bg="#F0FDF4" value={wallet ? formatMoney(wallet.earningsToday) : '—'} label="مكسبك النهاردة" />
          </div>
          {/* today's dues (resets daily) */}
          <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 12, background: (wallet?.dueToday ?? 0) > 0 ? '#FFF7ED' : '#F8FAFC', borderRadius: 16, padding: '14px 16px' }}>
            <div style={{ width: 38, height: 38, borderRadius: 12, background: '#fff', display: 'grid', placeItems: 'center', color: '#EA580C', flex: 'none' }}>
              <Wallet size={18} strokeWidth={1.75} />
            </div>
            <div style={{ flex: 1, fontSize: 14, fontWeight: 600, color: '#9A3412' }}>مطلوب توريده النهارده</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: (wallet?.dueToday ?? 0) > 0 ? '#C2410C' : '#16A34A' }}>{wallet ? formatMoney(wallet.dueToday) : '—'}</div>
          </div>
        </div>
      </div>

      {/* active task */}
      {task && (
        <div style={{ padding: '20px 20px 0' }}>
          <div style={{ fontSize: 20, fontWeight: 800, color: '#0F172A', marginBottom: 14 }}>توصيلة جارية</div>
          <div onClick={() => navigate('/active')} className="sg-card" style={{ padding: 18, cursor: 'pointer' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ width: 54, height: 54, borderRadius: 18, background: 'linear-gradient(145deg,#DBEAFE,#EFF6FF)', display: 'grid', placeItems: 'center', color: '#2563EB', flex: 'none' }}>
                <Package size={28} strokeWidth={1.75} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 17, fontWeight: 700, color: '#0F172A' }}>{task.dropoff?.zoneName ?? 'توصيلة'}</div>
                <div style={{ fontSize: 13, color: '#64748B', marginTop: 2 }}>تحصيل {formatMoney(task.cashToCollect)}</div>
              </div>
              <div style={{ width: 48, height: 48, borderRadius: 16, background: '#2563EB', display: 'grid', placeItems: 'center', color: '#fff', boxShadow: '0 10px 22px rgba(37,99,235,.32)', flex: 'none' }}>
                <Navigation size={22} strokeWidth={1.75} />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function MiniStat({ icon, bg, value, label }: { icon: React.ReactNode; bg: string; value: string; label: string }) {
  return (
    <div style={{ flex: 1, background: '#F8FAFC', borderRadius: 18, padding: 14, display: 'flex', alignItems: 'center', gap: 10 }}>
      <div style={{ width: 38, height: 38, borderRadius: 12, background: bg, display: 'grid', placeItems: 'center', flex: 'none' }}>{icon}</div>
      <div>
        <div style={{ fontSize: 17, fontWeight: 800, color: '#0F172A', lineHeight: 1 }}>{value}</div>
        <div style={{ fontSize: 12, color: '#64748B', marginTop: 3 }}>{label}</div>
      </div>
    </div>
  );
}
