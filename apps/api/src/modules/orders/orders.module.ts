import { Module } from '@nestjs/common';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { PricingService } from './pricing.service';
import { TransitionsService } from './transitions.service';

@Module({
  controllers: [OrdersController],
  providers: [OrdersService, PricingService, TransitionsService],
  exports: [OrdersService, PricingService, TransitionsService],
})
export class OrdersModule {}
