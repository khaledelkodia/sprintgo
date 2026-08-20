import type { ApiFailure, ErrorCode } from '@sprintgo/shared';

/** Typed error every feature can rely on — `code` drives behavior, `message` is user-safe Arabic. */
export class ApiError extends Error {
  constructor(
    readonly code: ErrorCode,
    message: string,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/** Converts a $fetch failure into a typed ApiError using the standard envelope. */
export function extractApiError(err: unknown): ApiError {
  const data = (err as { data?: ApiFailure } | undefined)?.data;
  if (data && data.success === false && data.error) {
    return new ApiError(data.error.code, data.error.message, data.error.details);
  }
  return new ApiError('INTERNAL', 'النت فصل ثانية — جرب تاني');
}

// coalesce concurrent refreshes so a burst of 401s triggers only one rotation
let refreshing: Promise<unknown> | null = null;

/**
 * Envelope-aware fetcher: same-origin, cookies included (ADR-003).
 * On a 401 it silently rotates the token via /auth/refresh and retries once,
 * which is what keeps the customer's 90-day session alive (ADR-002) — the
 * short-lived access token expires often and must refresh transparently.
 */
export function useApi() {
  const config = useRuntimeConfig();
  // SSR hits the API directly; the browser goes through the same-origin proxy
  const baseURL = import.meta.server ? config.apiBase : config.public.apiBase;
  const raw = $fetch.create({ baseURL, credentials: 'include' });

  return async <T>(url: string, opts?: Parameters<typeof raw>[1]): Promise<T> => {
    try {
      return (await raw<T>(url, opts)) as T;
    } catch (err) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      // refresh only on the client, never for the auth endpoints themselves
      if (status === 401 && import.meta.client && !url.startsWith('/auth/')) {
        try {
          refreshing ??= raw('/auth/refresh', { method: 'POST' }).finally(() => {
            refreshing = null;
          });
          await refreshing;
          return (await raw<T>(url, opts)) as T; // retry once with the fresh access cookie
        } catch {
          throw err; // refresh failed → genuinely logged out
        }
      }
      throw err;
    }
  };
}
