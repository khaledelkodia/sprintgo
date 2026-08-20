import { HashRouter, Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom';
import type { ReactNode } from 'react';
import { AuthProvider, useAuth } from './lib/auth';
import { CartProvider } from './lib/cart';
import { BottomNav } from './components/BottomNav';
import { HomeScreen } from './screens/HomeScreen';
import { LoginScreen } from './screens/LoginScreen';
import { OrdersScreen } from './screens/OrdersScreen';
import { ServicesScreen } from './screens/ServicesScreen';
import { ProfileScreen } from './screens/ProfileScreen';
import { OrderFlowScreen } from './screens/OrderFlowScreen';
import { TrackingScreen } from './screens/TrackingScreen';
import { FindingCourierScreen } from './screens/FindingCourierScreen';
import { StoresScreen } from './screens/StoresScreen';
import { StoreDetailScreen } from './screens/StoreDetailScreen';
import { CartScreen } from './screens/CartScreen';
import { ComingSoonScreen } from './screens/ComingSoonScreen';

/** Gate for actions that need a signed-in customer (guest browsing stays open). */
function RequireAuth({ children }: { children: ReactNode }) {
  const { isLoggedIn } = useAuth();
  const location = useLocation();
  if (!isLoggedIn) {
    const to = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/login?redirect=${to}`} replace />;
  }
  return <>{children}</>;
}

/** Shell for the four bottom-tab screens: scrollable content + persistent nav. */
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

export function App() {
  return (
    <AuthProvider>
      <CartProvider>
        <HashRouter>
          <Routes>
            <Route path="/login" element={<LoginScreen />} />
            <Route element={<TabLayout />}>
              <Route path="/" element={<HomeScreen />} />
              <Route path="/orders" element={<RequireAuth><OrdersScreen /></RequireAuth>} />
              <Route path="/services" element={<ServicesScreen />} />
              <Route path="/profile" element={<ProfileScreen />} />
            </Route>
            {/* catalog browsing (guest-friendly) */}
            <Route path="/stores" element={<StoresScreen />} />
            <Route path="/store/:slug" element={<StoreDetailScreen />} />
            <Route path="/cart" element={<RequireAuth><CartScreen /></RequireAuth>} />
            <Route path="/soon" element={<ComingSoonScreen />} />
            {/* errand + tracking */}
            <Route path="/order" element={<RequireAuth><OrderFlowScreen /></RequireAuth>} />
            <Route path="/track/:id" element={<RequireAuth><TrackingScreen /></RequireAuth>} />
            <Route path="/finding" element={<RequireAuth><FindingCourierScreen /></RequireAuth>} />
          </Routes>
        </HashRouter>
      </CartProvider>
    </AuthProvider>
  );
}
