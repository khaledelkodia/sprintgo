import { Module } from '@nestjs/common';
import { OrdersModule } from '../orders/orders.module';
import { DeliveryService } from './delivery.service';
import { CourierController } from './courier.controller';
import { DispatchController } from './dispatch.controller';

@Module({
  imports: [OrdersModule], // for TransitionsService
  controllers: [CourierController, DispatchController],
  providers: [DeliveryService],
  exports: [DeliveryService],
})
export class DeliveryModule {}
