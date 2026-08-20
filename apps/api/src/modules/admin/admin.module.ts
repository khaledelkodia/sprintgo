import { Module } from '@nestjs/common';
import { DeliveryModule } from '../delivery/delivery.module';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { RbacController } from './rbac.controller';
import { RbacService } from './rbac.service';

@Module({
  imports: [DeliveryModule], // driver settlements + remittances
  controllers: [AdminController, RbacController],
  providers: [AdminService, RbacService],
})
export class AdminModule {}
