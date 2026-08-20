import type { PipeTransform } from '@nestjs/common';
import type { ZodType } from 'zod';
import { DomainException } from '../errors/domain.exception';

/**
 * Validates request bodies against shared Zod schemas.
 * Schemas use `.strict()`, so unknown keys are rejected — this is the
 * mass-assignment defense (docs/architecture/09 §1, A03/A04).
 */
export class ZodValidationPipe<T> implements PipeTransform<unknown, T> {
  constructor(private readonly schema: ZodType<T>) {}

  transform(value: unknown): T {
    const result = this.schema.safeParse(value);
    if (!result.success) {
      throw new DomainException(
        'VALIDATION_ERROR',
        'البيانات المدخلة فيها مشكلة — راجعها وجرب تاني',
        result.error.issues.map((issue) => ({
          path: issue.path.map((p) => String(p)).join('.'),
          message: issue.message,
        })),
      );
    }
    return result.data;
  }
}
