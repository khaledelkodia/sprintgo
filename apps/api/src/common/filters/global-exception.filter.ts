import { Catch, HttpException, Injectable, Logger } from '@nestjs/common';
import type { ArgumentsHost, ExceptionFilter } from '@nestjs/common';
import { ThrottlerException } from '@nestjs/throttler';
import { ZodError } from 'zod';
import type { Request, Response } from 'express';
import type { ApiFailure, ErrorCode } from '@sprintgo/shared';
import { DomainException } from '../errors/domain.exception';

interface MappedError {
  status: number;
  code: ErrorCode;
  message: string;
  details?: unknown;
}

/**
 * Every error leaves the API through here, shaped as the standard
 * failure envelope (docs/architecture/04 §2). Messages are Arabic and
 * user-displayable; internals are never leaked.
 */
@Injectable()
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<Request>();

    const mapped = this.map(exception);

    if (mapped.status >= 500) {
      const err = exception instanceof Error ? (exception.stack ?? exception.message) : String(exception);
      this.logger.error(`Unhandled exception at ${req.method} ${req.url}: ${err}`);
    }

    const body: ApiFailure = {
      success: false,
      error: {
        code: mapped.code,
        message: mapped.message,
        ...(mapped.details !== undefined ? { details: mapped.details } : {}),
      },
    };
    res.status(mapped.status).json(body);
  }

  private map(exception: unknown): MappedError {
    if (exception instanceof DomainException) {
      return {
        status: exception.httpStatus,
        code: exception.code,
        message: exception.message,
        details: exception.details,
      };
    }

    if (exception instanceof ThrottlerException) {
      return { status: 429, code: 'RATE_LIMITED', message: 'محاولات كتير ورا بعض — استنى شوية وجرب تاني' };
    }

    if (exception instanceof ZodError) {
      return {
        status: 400,
        code: 'VALIDATION_ERROR',
        message: 'البيانات المدخلة فيها مشكلة — راجعها وجرب تاني',
        details: exception.issues,
      };
    }

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      switch (status) {
        case 401:
          return { status, code: 'AUTH_REQUIRED', message: 'سجل دخولك الأول' };
        case 403:
          return { status, code: 'FORBIDDEN', message: 'مسموحلكش تعمل كده' };
        case 404:
          return { status, code: 'NOT_FOUND', message: 'المطلوب مش موجود' };
        case 429:
          return { status, code: 'RATE_LIMITED', message: 'محاولات كتير ورا بعض — استنى شوية' };
        case 400:
          return { status, code: 'VALIDATION_ERROR', message: 'البيانات المدخلة فيها مشكلة' };
        default:
          return { status, code: 'INTERNAL', message: 'حصلت مشكلة مؤقتة — جرب تاني' };
      }
    }

    return { status: 500, code: 'INTERNAL', message: 'حصلت مشكلة مؤقتة — جرب كمان شوية' };
  }
}
