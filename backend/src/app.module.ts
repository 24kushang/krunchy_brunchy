import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import * as dotenv from 'dotenv';
import { CustomersModule } from './customers/customers.module';
import { ItemsModule } from './items/items.module';
import { OrdersModule } from './orders/orders.module';
import { SocialModule } from './social/social.module';
import { WhatsappModule } from './whatsapp/whatsapp.module';

// Entities
import { Customer } from './customers/customer.entity';
import { Item } from './items/item.entity';
import { Order } from './orders/order.entity';
import { OrderItem } from './orders/order-item.entity';
import { SocialCampaign } from './social/social-campaign.entity';
import { WhatsAppLog } from './whatsapp/whatsapp-log.entity';

// Migrations
import { InitialSchema1716380000000 } from './migrations/1716380000000-InitialSchema';

dotenv.config();

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432', 10),
      username: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'postgrespassword',
      database: process.env.DB_NAME || 'krunchy_db',
      entities: [Customer, Item, Order, OrderItem, SocialCampaign, WhatsAppLog],
      migrationsRun: true,
      migrations: [InitialSchema1716380000000],
      synchronize: false,
    }),
    CustomersModule,
    ItemsModule,
    OrdersModule,
    SocialModule,
    WhatsappModule,
  ],
})
export class AppModule {}
