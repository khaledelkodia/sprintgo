/**
 * Envelope-aware API client for the courier app. Dev: Vite proxy (/api →
 * localhost:4000) with cookies. APK: VITE_API_BASE + Bearer token. Backend
 * accepts either.
 */
const API_BASE = import.meta.env.VITE_API_BASE ?? '/api/v1';
const TOKEN_KEY = 'sg_token';

export function getToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}
export function setToken(token: string | null) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* storage unavailable */
  }
}

export class ApiError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

interface ApiOpts {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
  query?: Record<string, string | number | undefined>;
}

let refreshing: Promise<Response> | null = null;

function buildUrl(path: string, query?: ApiOpts['query']): string {
  const url = API_BASE + path;
  if (!query) return url;
  const qs = Object.entries(query)
    .filter(([, v]) => v !== undefined && v !== '')
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
    .join('&');
  return qs ? `${url}?${qs}` : url;
}

async function raw(path: string, opts: ApiOpts): Promise<Response> {
  const token = getToken();
  return fetch(buildUrl(path, opts.query), {
    method: opts.method ?? 'GET',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
  });
}

export async function api<T>(path: string, opts: ApiOpts = {}): Promise<T> {
  let res = await raw(path, opts);
  if (res.status === 401 && !path.startsWith('/auth/')) {
    try {
      refreshing ??= raw('/auth/refresh', { method: 'POST' }).finally(() => {
        refreshing = null;
      });
      await refreshing;
      res = await raw(path, opts);
    } catch {
      /* fall through */
    }
  }

  let json: unknown = null;
  try {
    json = await res.json();
  } catch {
    /* empty body */
  }

  const env = json as { success?: boolean; data?: T; error?: { code: string; message: string; details?: unknown } } | null;
  if (!res.ok || env?.success === false) {
    throw new ApiError(
      env?.error?.code ?? 'INTERNAL',
      env?.error?.message ?? 'حصلت مشكلة بسيطة في الاتصال، حاوِل تاني من فضلك',
      env?.error?.details,
    );
  }
  // Every API response is enveloped (`{ success, data }`), so anything else did
  // not come from the API — most often the packaged app's own server answering
  // a relative /api path with index.html, status 200. Returning that as data
  // hands every screen a null where it expected a list. Fail loudly instead:
  // callers already handle a rejected request. `data` may still be null on
  // purpose (e.g. "no offer right now") — that is a real answer and passes.
  if (!env || typeof env !== 'object' || !('success' in env)) {
    throw new ApiError('NETWORK', 'مش قادرين نوصل للسيرفر دلوقتي — اتأكد من النت وحاوِل تاني');
  }
  return env.data as T;
}
