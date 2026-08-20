import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { LoggerModule } from 'nestjs-pino';
import { randomUUID } from 'node:crypto';
import { env } from './core/config/env';
import { PrismaModule } from './core/prisma/prisma.module';
import { PermissionsModule } from './core/permissions/permissions.module';
import { RealtimeModule } from './core/realtime/realtime.module';
import { PushModule } from './modules/push/push.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { CatalogModule } from './modules/catalog/catalog.module';
import { GeoModule } from './modules/geo/geo.module';
import { OrdersModule } from './modules/orders/orders.module';
import { MerchantModule } from './modules/merchant/merchant.module';
import { DeliveryModule } from './modules/delivery/delivery.module';
import { ErrandsModule } from './modules/errands/errands.module';
import { AdminModule } from './modules/admin/admin.module';
import { HealthController } from './modules/health/health.controller';

@Module({
  imports: [
    LoggerModule.forRoot({
      pinoHttp: {
        level: env.NODE_ENV === 'production' ? 'info' : 'debug',
        transport:
          env.NODE_ENV === 'development'
            ? { target: 'pino-pretty', options: { singleLine: true, translateTime: 'HH:MM:ss' } }
            : undefined,
        genReqId: (req) => (req.headers['x-request-id'] as string | undefined) ?? randomUUID(),
        // PII / secrets never reach the logs (docs/architecture/09 §1 A02)
        redact: {
          paths: ['req.headers.authorization', 'req.headers.cookie', 'res.headers["set-cookie"]'],
          remove: true,
        },
        autoLogging: {
          ignore: (req) => req.url === '/api/v1/health',
        },
      },
    }),
    // global backstop: 60 req / IP / minute (docs/architecture/09 §2)
    ThrottlerModule.forRoot({ throttlers: [{ ttl: 60_000, limit: 60 }] }),
    PrismaModule,
    PermissionsModule,
    RealtimeModule,
    PushModule,
    NotificationsModule,
    AuthModule,
    UsersModule,
    CatalogModule,
    GeoModule,
    OrdersModule,
    MerchantModule,
    DeliveryModule,
    ErrandsModule,
    AdminModule,
  ],
  controllers: [HealthController],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }, GlobalExceptionFilter],
})
export class AppModule {}
