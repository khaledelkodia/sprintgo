import type { CourierDailyReportRow, CourierWalletView } from '@sprintgo/shared';
import { formatMoney } from '@sprintgo/shared';
import { Banknote, CalendarDays, Package, Wallet } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { getReport, getWallet } from '../lib/courier';

export function EarningsScreen() {
  const [wallet, setWallet] = useState<CourierWalletView | null>(null);
  const [loading, setLoading] = useState(true);
  const [month, setMonth] = useState<string | null>(null); // null = آخر أسبوع
  const [report, setReport] = useState<CourierDailyReportRow[]>([]);

  useEffect(() => {
    getWallet()
      .then(setWallet)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    getReport(month ?? undefined)
      .then(setReport)
      .catch(() => setReport([]));
  }, [month]);

  // last-week chip + the last 3 months
  const months = useMemo(() => {
    const out: { value: string; label: string }[] = [];
    const now = new Date();
    for (let i = 0; i < 3; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      out.push({
        value: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
        label: d.toLocaleDateString('ar-EG', { month: 'long' }),
      });
    }
    return out;
  }, []);

  const due = wallet?.dueToday ?? 0;

  return (
    <div style={{ paddingBottom: 24 }}>
      <div style={{ padding: '18px 20px 0' }}>
        <div style={{ fontSize: 30, fontWeight: 800, color: '#0F172A' }}>الأرباح</div>
        <div style={{ fontSize: 15, color: '#64748B', marginTop: 6 }}>مكسبك وشغلك، وكل يوم بيتصفّى لوحده.</div>
      </div>

      {/* headline: today's earnings */}
      <div style={{ padding: '20px 20px 0' }}>
        <div style={{ position: 'relative', borderRadius: 26, overflow: 'hidden', background: 'linear-gradient(135deg,#15803D,#16A34A 60%,#22C55E)', padding: 24, boxShadow: '0 16px 36px rgba(34,197,94,.28)' }}>
          <div style={{ position: 'absolute', top: -50, right: -30, width: 160, height: 160, borderRadius: 999, background: 'rgba(255,255,255,.14)' }} />
          <div style={{ position: 'relative' }}>
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,.85)', fontWeight: 600 }}>مكسبك النهارده</div>
            <div style={{ fontSize: 40, fontWeight: 800, color: '#fff', lineHeight: 1.1, marginTop: 6 }}>
              {loading ? '…' : formatMoney(wallet?.earningsToday ?? 0)}
            </div>
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,.82)', marginTop: 8 }}>ده صافي مكسبك بعد خصم عمولة المنصة.</div>
          </div>
        </div>
      </div>

      {/* today's stats */}
      <div style={{ padding: '16px 20px 0', display: 'flex', flexDirection: 'column', gap: 10 }}>
        <Stat icon={Package} bg="#EFF6FF" color="#2563EB" label="توصيلات النهارده" value={loading ? '…' : String(wallet?.deliveriesToday ?? 0)} />
        <Stat icon={Banknote} bg="#F0FDF4" color="#16A34A" label="الكاش اللي معاك دلوقتي" value={loading ? '…' : formatMoney(wallet?.cashInHand ?? 0)} />
        <Stat icon={Wallet} bg="#FFF7ED" color="#EA580C" label="مطلوب توريده النهارده" value={loading ? '…' : formatMoney(due)} highlight={due > 0} />
      </div>

      <div style={{ padding: '10px 20px 0' }}>
        <div style={{ background: '#F8FAFC', borderRadius: 14, padding: '12px 14px', fontSize: 12.5, color: '#64748B', lineHeight: 1.6 }}>
          المطلوب توريده بيتصفّر كل يوم — ورّد فلوس الإدارة في آخر اليوم وابدأ يوم جديد من الأول.
        </div>
      </div>

      {/* daily report */}
      <div style={{ padding: '26px 20px 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
          <CalendarDays size={20} strokeWidth={1.75} color="#0F172A" />
          <div style={{ fontSize: 20, fontWeight: 800, color: '#0F172A' }}>تقرير أيامك</div>
        </div>

        {/* filter chips */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
          <Chip active={month === null} onClick={() => setMonth(null)} label="آخر أسبوع" />
          {months.map((m) => (
            <Chip key={m.value} active={month === m.value} onClick={() => setMonth(m.value)} label={m.label} />
          ))}
        </div>

        {report.length === 0 ? (
          <div style={{ textAlign: 'center', color: '#94A3B8', padding: 30, fontSize: 14 }}>مفيش شغل في الفترة دي.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {report.map((d) => (
              <DayRow key={d.date} row={d} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function DayRow({ row }: { row: CourierDailyReportRow }) {
  const label = new Date(row.date + 'T00:00:00').toLocaleDateString('ar-EG', { weekday: 'long', day: 'numeric', month: 'long' });
  return (
    <div className="sg-card" style={{ padding: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: '#0F172A' }}>{label}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#64748B', fontWeight: 600 }}>
          <Package size={15} strokeWidth={1.75} color="#2563EB" /> {row.deliveries} توصيلة
        </div>
      </div>
      <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
        <Mini label="مكسبك" value={formatMoney(row.earnings)} color="#16A34A" bg="#F0FDF4" />
        <Mini label="مطلوب توريده" value={formatMoney(row.dues)} color="#C2410C" bg="#FFF7ED" />
        <Mini label="اللي ورّدته" value={formatMoney(row.remitted)} color="#2563EB" bg="#EFF6FF" />
      </div>
    </div>
  );
}

function Mini({ label, value, color, bg }: { label: string; value: string; color: string; bg: string }) {
  return (
    <div style={{ flex: 1, background: bg, borderRadius: 14, padding: '10px 12px', textAlign: 'center' }}>
      <div style={{ fontSize: 16, fontWeight: 800, color }}>{value}</div>
      <div style={{ fontSize: 11.5, color: '#64748B', marginTop: 3 }}>{label}</div>
    </div>
  );
}

function Chip({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{ borderRadius: 999, border: `1.5px solid ${active ? '#2563EB' : '#E2E8F0'}`, background: active ? '#EFF6FF' : '#fff', color: active ? '#1D4ED8' : '#334155', padding: '9px 16px', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}
    >
      {label}
    </button>
  );
}

function Stat({ icon: Icon, bg, color, label, value, highlight }: { icon: LucideIcon; bg: string; color: string; label: string; value: string; highlight?: boolean }) {
  return (
    <div className="sg-card-soft" style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 14 }}>
      <div style={{ width: 46, height: 46, borderRadius: 14, background: bg, display: 'grid', placeItems: 'center', color, flex: 'none' }}>
        <Icon size={22} strokeWidth={1.75} />
      </div>
      <div style={{ flex: 1, fontSize: 16, fontWeight: 600, color: '#0F172A' }}>{label}</div>
      <div style={{ fontSize: 17, fontWeight: 800, color: highlight ? '#C2410C' : '#0F172A' }}>{value}</div>
    </div>
  );
}
