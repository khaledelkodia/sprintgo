import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { env } from '../../core/config/env';
import { UsersModule } from '../users/users.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { OtpService } from './otp.service';
import { TokensService } from './tokens.service';
import { MockSmsProvider, SMS_PROVIDER } from './sms/sms.provider';

@Module({
  imports: [
    // global: JwtAuthGuard is used by controllers across modules
    JwtModule.register({
      global: true,
      secret: env.JWT_SECRET,
      signOptions: { expiresIn: env.ACCESS_TOKEN_TTL_SEC },
    }),
    UsersModule,
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    OtpService,
    TokensService,
    { provide: SMS_PROVIDER, useClass: MockSmsProvider },
  ],
  exports: [TokensService],
})
export class AuthModule {}
