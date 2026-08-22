import { Global, Module } from '@nestjs/common';
import { PushController } from './push.controller';
import { PushService } from './push.service';
import { FcmService } from './fcm.service';

/** Global so NotificationsService can also deliver a push for each notification. */
@Global()
@Module({
  controllers: [PushController],
  providers: [PushService, FcmService],
  exports: [PushService],
})
export class PushModule {}
