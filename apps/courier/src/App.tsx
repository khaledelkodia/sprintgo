import { HashRouter, Outlet, Route, Routes } from 'react-router-dom';
import { AuthProvider, useAuth } from './lib/auth';
import { BottomNav } from './components/BottomNav';
import { LoginScreen } from './screens/LoginScreen';
import { HomeScreen } from './screens/HomeScreen';
import { DeliveriesScreen } from './screens/DeliveriesScreen';
import { EarningsScreen } from './screens/EarningsScreen';
import { ProfileScreen } from './screens/ProfileScreen';
import { OfferScreen } from './screens/OfferScreen';
import { ActiveDeliveryScreen } from './screens/ActiveDeliveryScreen';

function TabLayout() {
  return (
    <div className="sg-screen">
      <div className="sg-scroll">
        <Outlet />
      </div>
      <BottomNav />
    </div>
  );
}

/** Not-a-courier screen: a signed-in non-courier (e.g. an admin) gets a clear
 *  message instead of cryptic 403s on every courier action. */
function NotCourier({ onLogout }: { onLogout: () => void }) {
  return (
    <div
      className="sg-screen"
      style={{ alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: 32, gap: 16 }}
    >
      <div
        style={{ width: 72, height: 72, borderRadius: 24, background: '#FEF2F2', display: 'grid', placeItems: 'center', color: '#DC2626', fontSize: 30, fontWeight: 800 }}
      >
        !
      </div>
      <div style={{ fontSize: 22, fontWeight: 800, color: '#0F172A' }}>الحساب ده مش حساب مندوب</div>
      <div style={{ fontSize: 15, color: '#64748B', lineHeight: 1.6, maxWidth: 300 }}>
        سجّل دخول برقم مندوب مسجّل، أو كلّم الإدارة عشان تتسجّل كمندوب.
      </div>
      <button type="button" onClick={onLogout} className="sg-btn sg-btn-secondary" style={{ width: '100%', maxWidth: 280 }}>
        تسجيل الخروج والدخول برقم تاني
      </button>
    </div>
  );
}

/** Couriers must be signed in with a COURIER account. */
function Gate() {
  const { user, isLoggedIn, logout } = useAuth();
  if (!isLoggedIn) return <LoginScreen />;
  if (!user?.roles?.includes('COURIER')) return <NotCourier onLogout={logout} />;
  return (
    <HashRouter>
      <Routes>
        <Route element={<TabLayout />}>
          <Route path="/" element={<HomeScreen />} />
          <Route path="/deliveries" element={<DeliveriesScreen />} />
          <Route path="/earnings" element={<EarningsScreen />} />
          <Route path="/profile" element={<ProfileScreen />} />
        </Route>
        <Route path="/offer" element={<OfferScreen />} />
        <Route path="/active" element={<ActiveDeliveryScreen />} />
      </Routes>
    </HashRouter>
  );
}

export function App() {
  return (
    <AuthProvider>
      <Gate />
    </AuthProvider>
  );
}
