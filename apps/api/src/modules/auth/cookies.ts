import type { CookieOptions, Response } from 'express';
import { env } from '../../core/config/env';
import type { TokenPair } from './tokens.service';

export const ACCESS_COOKIE = 'sg_at';
export const REFRESH_COOKIE = 'sg_rt';
const REFRESH_PATH = '/api/v1/auth';

const base: CookieOptions = {
  httpOnly: true,
  sameSite: 'lax',
  secure: env.NODE_ENV === 'production',
};

export function setAuthCookies(res: Response, pair: TokenPair): void {
  res.cookie(ACCESS_COOKIE, pair.accessToken, {
    ...base,
    path: '/',
    maxAge: env.ACCESS_TOKEN_TTL_SEC * 1000,
  });
  res.cookie(REFRESH_COOKIE, pair.refreshToken, {
    ...base,
    path: REFRESH_PATH,
    maxAge: Math.max(0, pair.refreshExpiresAt.getTime() - Date.now()),
  });
}

export function clearAuthCookies(res: Response): void {
  res.clearCookie(ACCESS_COOKIE, { ...base, path: '/' });
  res.clearCookie(REFRESH_COOKIE, { ...base, path: REFRESH_PATH });
}
