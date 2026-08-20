import { describe, expect, it } from 'vitest';
import { DomainException } from '../src/common/errors/domain.exception';

describe('DomainException', () => {
  it('maps codes to their HTTP status from the shared contract', () => {
    expect(new DomainException('NOT_FOUND', 'x').httpStatus).toBe(404);
    expect(new DomainException('RATE_LIMITED', 'x').httpStatus).toBe(429);
    expect(new DomainException('PRICE_CHANGED', 'x').httpStatus).toBe(409);
    expect(new DomainException('AUTH_INVALID_OTP', 'x').httpStatus).toBe(401);
  });

  it('carries user-displayable Arabic messages and optional details', () => {
    const e = new DomainException('RATE_LIMITED', 'استنى شوية', { retryAfterSec: 30 });
    expect(e.message).toBe('استنى شوية');
    expect(e.details).toEqual({ retryAfterSec: 30 });
  });
});
