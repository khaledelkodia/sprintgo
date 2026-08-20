import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import type { PublicUser } from '@sprintgo/shared';
import { api, ApiError, setToken } from './api';

interface OtpRequested {
  retryAfterSec: number;
  expiresInSec: number;
  devCode?: string; // dev only (mock SMS)
}

interface AuthContextValue {
  user: PublicUser | null;
  ready: boolean;
  isLoggedIn: boolean;
  requestOtp: (phone: string) => Promise<OtpRequested>;
  verifyOtp: (phone: string, code: string) => Promise<PublicUser>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);
const USER_KEY = 'sg_user';

function readCached(): PublicUser | null {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as PublicUser) : null;
  } catch {
    return null;
  }
}
function persist(u: PublicUser | null) {
  try {
    if (u) localStorage.setItem(USER_KEY, JSON.stringify(u));
    else localStorage.removeItem(USER_KEY);
  } catch {
    /* storage unavailable */
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  // optimistic restore so a reload doesn't flash the login screen
  const [user, setUser] = useState<PublicUser | null>(readCached);
  const [ready, setReady] = useState(false);

  // validate the session in the background; only a real auth error signs out
  useEffect(() => {
    let alive = true;
    api<PublicUser>('/me')
      .then((u) => {
        if (!alive) return;
        setUser(u);
        persist(u);
      })
      .catch((err) => {
        if (!alive) return;
        if (err instanceof ApiError && (err.code === 'AUTH_REQUIRED' || err.code === 'FORBIDDEN')) {
          setUser(null);
          persist(null);
        }
        // otherwise (network blip) keep the cached user
      })
      .finally(() => alive && setReady(true));
    return () => {
      alive = false;
    };
  }, []);

  async function requestOtp(phone: string): Promise<OtpRequested> {
    return api<OtpRequested>('/auth/otp/request', { method: 'POST', body: { phone } });
  }

  async function verifyOtp(phone: string, code: string): Promise<PublicUser> {
    const data = await api<{ user: PublicUser; isNewUser: boolean; token?: string }>('/auth/otp/verify', {
      method: 'POST',
      body: { phone, code },
    });
    if (data.token) setToken(data.token); // Bearer for native apps (cookies don't cross origins in a WebView)
    setUser(data.user);
    persist(data.user);
    return data.user;
  }

  function logout() {
    // clear local session immediately so logout never hangs on the network,
    // then revoke server-side in the background (best effort)
    setUser(null);
    persist(null);
    setToken(null);
    api('/auth/logout', { method: 'POST' }).catch(() => {});
  }

  return (
    <AuthContext.Provider
      value={{ user, ready, isLoggedIn: user !== null, requestOtp, verifyOtp, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
