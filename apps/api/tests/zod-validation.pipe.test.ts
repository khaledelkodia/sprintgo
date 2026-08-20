import { describe, expect, it } from 'vitest';
import { requestOtpSchema } from '@sprintgo/shared';
import { ZodValidationPipe } from '../src/common/pipes/zod-validation.pipe';
import { DomainException } from '../src/common/errors/domain.exception';

describe('ZodValidationPipe', () => {
  const pipe = new ZodValidationPipe(requestOtpSchema);

  it('normalizes a messy Egyptian phone into E.164', () => {
    expect(pipe.transform({ phone: '010 1234 5678' })).toEqual({ phone: '+201012345678' });
  });

  it('rejects invalid phones with a VALIDATION_ERROR DomainException', () => {
    try {
      pipe.transform({ phone: '12345' });
      expect.unreachable('should have thrown');
    } catch (error) {
      expect(error).toBeInstanceOf(DomainException);
      const domainError = error as DomainException;
      expect(domainError.code).toBe('VALIDATION_ERROR');
      expect(domainError.httpStatus).toBe(400);
      expect(domainError.details).toBeDefined();
    }
  });

  it('rejects unknown keys (mass-assignment defense)', () => {
    expect(() => pipe.transform({ phone: '01012345678', isAdmin: true })).toThrow(DomainException);
  });
});
