import { House, Package, UserRound, Wallet } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';

interface Tab {
  to: string;
  label: string;
  icon: LucideIcon;
}

const TABS: Tab[] = [
  { to: '/', label: 'الرئيسية', icon: House },
  { to: '/deliveries', label: 'التوصيلات', icon: Package },
  { to: '/earnings', label: 'الأرباح', icon: Wallet },
  { to: '/profile', label: 'حسابي', icon: UserRound },
];

export function BottomNav() {
  const { pathname } = useLocation();
  const navigate = useNavigate();

  return (
    <div className="sg-nav-bar">
      <nav className="sg-nav">
        {TABS.map((tab) => {
          const active = tab.to === '/' ? pathname === '/' : pathname.startsWith(tab.to);
          const Icon = tab.icon;
          return (
            <button
              key={tab.to}
              type="button"
              className="sg-nav-item"
              data-active={active}
              onClick={() => navigate(tab.to)}
            >
              <Icon size={26} strokeWidth={1.75} />
              <span style={{ fontSize: 11.5, fontWeight: 600 }}>{tab.label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
