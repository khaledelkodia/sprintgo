import { ERROR_CODES } from '@sprintgo/shared';
import type { ErrorCode } from '@sprintgo/shared';

/**
 * The only exception feature code should throw.
 * `code` is a stable machine code from the shared contract;
 * `message` is Arabic and safe to show the user as-is (docs/architecture/04 §2).
 */
export class DomainException extends Error {
  constructor(
    readonly code: ErrorCode,
    message: string,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = 'DomainException';
  }

  get httpStatus(): number {
    return ERROR_CODES[this.code];
  }
}
