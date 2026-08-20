import { defineStore } from 'pinia';
import type { ApiSuccess, PublicUser } from '@sprintgo/shared';
import { extractApiError, useApi } from '~/composables/useApi';

interface OtpRequested {
  retryAfterSec: number;
  expiresInSec: number;
  devCode?: string; // present only in development (mock SMS)
}

interface VerifyResult {
  user: PublicUser;
  isNewUser: boolean;
}

const STORAGE_KEY = 'sg_user';

export const useAuthStore = defineStore('auth', () => {
  const user = ref<PublicUser | null>(null);
  const initialized = ref(false);
  const api = useApi();

  /** Persist the (non-secret) public user so a reload restores the session instantly. */
  function persist(u: PublicUser | null) {
    if (!import.meta.client) return;
    try {
      if (u) localStorage.setItem(STORAGE_KEY, JSON.stringify(u));
      else localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* storage unavailable — we just lose the optimistic restore */
    }
  }

  // Optimistic hydrate: a page reload wipes the in-memory store, so restore the
  // last-known user immediately. The httpOnly token is still the real gate — the
  // API re-checks every request — this only keeps the UI from bouncing to /login
  // while /me re-validates in the background.
  if (import.meta.client) {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) user.value = JSON.parse(raw) as PublicUser;
    } catch {
      /* ignore malformed cache */
    }
  }

  const isLoggedIn = computed(() => user.value !== null);
  const isSuperAdmin = computed(() => user.value?.perms?.includes('*') ?? false);

  /**
   * Fine-grained permission check for gating dashboard UI. Mirrors the server
   * guard: the `*` wildcard (super admin) satisfies everything. The server
   * still re-checks every request — this only hides what the user can't use.
   */
  function can(permission: string): boolean {
    const perms = user.value?.perms ?? [];
    return perms.includes('*') || perms.includes(permission);
  }

  /**
   * Silent session restore — never throws (guest browsing is first-class).
   * Only a real 401/403 clears the session; transient errors (proxy/network
   * blips on a busy dev box) are retried a few times so we don't bounce a
   * signed-in user back to the login screen over a momentary hiccup.
   */
  async function fetchMe(attempt = 0): Promise<void> {
    try {
      const res = await api<ApiSuccess<PublicUser>>('/me');
      user.value = res.data;
      persist(res.data);
      initialized.value = true;
    } catch (err) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status === 401 || status === 403) {
        user.value = null; // genuinely signed out
        persist(null);
        initialized.value = true;
        return;
      }
      // transient failure — retry with backoff before giving up
      if (attempt < 3) {
        await new Promise((r) => setTimeout(r, 400 * (attempt + 1)));
        return fetchMe(attempt + 1);
      }
      // out of retries: keep whatever we had; don't force a logout on a blip
      initialized.value = true;
    }
  }

  async function requestOtp(phone: string): Promise<OtpRequested> {
    try {
      const res = await api<ApiSuccess<OtpRequested>>('/auth/otp/request', {
        method: 'POST',
        body: { phone },
      });
      return res.data;
    } catch (err) {
      throw extractApiError(err);
    }
  }

  async function verifyOtp(phone: string, code: string): Promise<VerifyResult> {
    try {
      const res = await api<ApiSuccess<VerifyResult>>('/auth/otp/verify', {
        method: 'POST',
        body: { phone, code },
      });
      user.value = res.data.user;
      persist(res.data.user);
      initialized.value = true;
      return res.data;
    } catch (err) {
      throw extractApiError(err);
    }
  }

  async function passwordLogin(phone: string, password: string): Promise<PublicUser> {
    try {
      const res = await api<ApiSuccess<{ user: PublicUser }>>('/auth/login', {
        method: 'POST',
        body: { phone, password },
      });
      user.value = res.data.user;
      persist(res.data.user);
      initialized.value = true;
      return res.data.user;
    } catch (err) {
      throw extractApiError(err);
    }
  }

  async function logout() {
    try {
      await api('/auth/logout', { method: 'POST' });
    } catch {
      // cookies are cleared server-side; a network hiccup shouldn't trap the user
    }
    user.value = null;
    persist(null);
    initialized.value = true;
    if (import.meta.client) useRealtime().disconnect(); // drop the authed socket
  }

  return {
    user,
    initialized,
    isLoggedIn,
    isSuperAdmin,
    can,
    fetchMe,
    requestOtp,
    verifyOtp,
    passwordLogin,
    logout,
  };
});
