import { Injectable } from '@nestjs/common';
import type { CallHandler, ExecutionContext, NestInterceptor } from '@nestjs/common';
import { map } from 'rxjs';
import type { Observable } from 'rxjs';
import type { PageMeta } from '@sprintgo/shared';

export interface Paged<T> {
  __paged: true;
  data: T;
  meta: PageMeta;
}

/** Controllers return `paged(items, meta)` for list endpoints. */
export function paged<T>(data: T, meta: PageMeta): Paged<T> {
  return { __paged: true, data, meta };
}

function isPaged(value: unknown): value is Paged<unknown> {
  return typeof value === 'object' && value !== null && '__paged' in value;
}

/** Wraps every successful response in the standard envelope (docs/architecture/04 §2). */
@Injectable()
export class EnvelopeInterceptor implements NestInterceptor {
  intercept(_context: ExecutionContext, next: CallHandler): Observable<unknown> {
    return next.handle().pipe(
      map((payload) => {
        if (isPaged(payload)) {
          return { success: true, data: payload.data, meta: payload.meta };
        }
        return { success: true, data: payload ?? null };
      }),
    );
  }
}
