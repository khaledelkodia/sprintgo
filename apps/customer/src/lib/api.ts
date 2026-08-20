/**
 * Envelope-aware API client for the customer app. In dev it talks to the NestJS
 * backend through the Vite proxy (/api → localhost:4000) with cookies; in the
 * packaged APK it uses VITE_API_BASE + a Bearer token (the WebView can't rely on
 * cross-origin httpOnly cookies). The backend accepts either.
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

// coalesce concurrent refreshes so a burst of 401s triggers only one rotation
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

  // transparent refresh once on 401 (keeps the session alive), never for auth calls
  if (res.status === 401 && !path.startsWith('/auth/')) {
    try {
      refreshing ??= raw('/auth/refresh', { method: 'POST' }).finally(() => {
        refreshing = null;
      });
      await refreshing;
      res = await raw(path, opts);
    } catch {
      /* fall through to the error below */
    }
  }

  let json: unknown = null;
  try {
    json = await res.json();
  } catch {
    /* empty/non-json body */
  }

  const env = json as { success?: boolean; data?: T; error?: { code: string; message: string; details?: unknown } } | null;
  if (!res.ok || env?.success === false) {
    throw new ApiError(
      env?.error?.code ?? 'INTERNAL',
      env?.error?.message ?? 'حصلت مشكلة بسيطة في الاتصال، حاوِل تاني من فضلك',
      env?.error?.details,
    );
  }
  // enveloped responses return their data even when it's null; non-enveloped return raw json.
  if (env && typeof env === 'object' && 'success' in env) return env.data as T;
  return json as T;
}
