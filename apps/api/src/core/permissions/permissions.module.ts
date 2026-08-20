import { Global, Module } from '@nestjs/common';
import { PermissionsService } from './permissions.service';

/** Global so both the token issuer and the request guards can resolve/read permissions. */
@Global()
@Module({
  providers: [PermissionsService],
  exports: [PermissionsService],
})
export class PermissionsModule {}
