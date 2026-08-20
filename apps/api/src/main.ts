import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { Logger } from 'nestjs-pino';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { randomUUID } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';
import { env } from './core/config/env';
import { AppModule } from './app.module';
import { EnvelopeInterceptor } from './common/interceptors/envelope.interceptor';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });

  app.useLogger(app.get(Logger));
  app.setGlobalPrefix('api/v1');

  // X-Request-Id on every response, correlated in logs (docs/architecture/04 §3)
  app.use((req: Request, res: Response, next: NextFunction) => {
    const id = (req.headers['x-request-id'] as string | undefined) ?? randomUUID();
    req.headers['x-request-id'] = id;
    res.setHeader('X-Request-Id', id);
    next();
  });

  app.use(helmet());
  app.use(cookieParser(env.COOKIE_SECRET));

  app.useGlobalInterceptors(new EnvelopeInterceptor());
  app.useGlobalFilters(app.get(GlobalExceptionFilter));

  app.enableShutdownHooks();

  await app.listen(env.PORT);
}

void bootstrap();
