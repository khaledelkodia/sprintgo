import { Module } from '@nestjs/common';
import { OrdersModule } from '../orders/orders.module';
import { DeliveryModule } from '../delivery/delivery.module';
import { MerchantOrdersController, MerchantStatsController } from './merchant-orders.controller';
import { MerchantOrdersService } from './merchant-orders.service';
import { MerchantStoreController } from './merchant-store.controller';
import { MerchantStoreService } from './merchant-store.service';
import { MerchantCatalogController } from './merchant-catalog.controller';
import { MerchantCatalogService } from './merchant-catalog.service';

@Module({
  imports: [OrdersModule, DeliveryModule], // TransitionsService + auto-offer on ready
  controllers: [
    MerchantOrdersController,
    MerchantStatsController,
    MerchantStoreController,
    MerchantCatalogController,
  ],
  providers: [MerchantOrdersService, MerchantStoreService, MerchantCatalogService],
})
export class MerchantModule {}
