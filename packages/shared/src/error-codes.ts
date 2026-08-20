/**
 * Stable machine error codes + their HTTP status.
 * The API's global exception filter is the only producer;
 * the web app switches on `code`, never on message text.
 */
export const ERROR_CODES = {
  VALIDATION_ERROR: 400,
  AUTH_REQUIRED: 401,
  AUTH_INVALID_OTP: 401,
  AUTH_OTP_EXPIRED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  IDEMPOTENCY_CONFLICT: 409,
  ORDER_INVALID_TRANSITION: 409,
  PRICE_CHANGED: 409,
  STORE_CLOSED: 422,
  PRODUCT_UNAVAILABLE: 422,
  MIN_ORDER_NOT_MET: 422,
  RATE_LIMITED: 429,
  INTERNAL: 500,
} as const satisfies Record<string, number>;

export type ErrorCode = keyof typeof ERROR_CODES;

export interface PageMeta {
  page: number;
  limit: number;
  total: number;
  hasNext: boolean;
}

export interface ApiSuccess<T> {
  success: true;
  data: T;
  meta?: PageMeta;
}

export interface ApiFailure {
  success: false;
  error: {
    code: ErrorCode;
    message: string;
    details?: unknown;
  };
}

export type ApiResponse<T> = ApiSuccess<T> | ApiFailure;
