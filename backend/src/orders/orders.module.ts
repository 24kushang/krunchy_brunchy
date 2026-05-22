import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { WhatsappModule } from '../whatsapp/whatsapp.module';
import { Order } from './order.entity';
import { OrderItem } from './order-item.entity';
import { Customer } from '../customers/customer.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Order, OrderItem, Customer]),
    WhatsappModule,
  ],
  providers: [OrdersService],
  controllers: [OrdersController],
  exports: [OrdersService],
})
export class OrdersModule {}
