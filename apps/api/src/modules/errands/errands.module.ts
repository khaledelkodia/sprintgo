import { Module } from '@nestjs/common';
import { DeliveryModule } from '../delivery/delivery.module';
import { ErrandsService } from './errands.service';
import { ErrandsController, MerchantDeliveryController } from './errands.controller';

@Module({
  imports: [DeliveryModule], // auto-offer errands to the nearest courier
  controllers: [ErrandsController, MerchantDeliveryController],
  providers: [ErrandsService],
})
export class ErrandsModule {}
