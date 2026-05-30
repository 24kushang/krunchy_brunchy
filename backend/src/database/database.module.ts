import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Customer } from './entities/customer.entity';
import { Item } from './entities/item.entity';
import { ItemPriceHistory } from './entities/item-price-history.entity';
import { Order } from './entities/order.entity';
import { OrderItem } from './entities/order-item.entity';
import { OrderStatusHistory } from './entities/order-status-history.entity';
import { WhatsappLog } from './entities/whatsapp-log.entity';
import { SocialMediaContent } from './entities/social-media-content.entity';
import { OrderSource } from './entities/order-source.entity';
import { InventoryLocation } from './entities/inventory-location.entity';
import { ItemInventory } from './entities/item-inventory.entity';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get<string>('DATABASE_HOST', 'localhost'),
        port: configService.get<number>('DATABASE_PORT', 5432),
        username: configService.get<string>('DATABASE_USER', 'admin'),
        password: configService.get<string>('DATABASE_PASSWORD', 'development_password'),
        database: configService.get<string>('DATABASE_NAME', 'oms_db'),
        entities: [
          Customer,
          Item,
          ItemPriceHistory,
          Order,
          OrderItem,
          OrderStatusHistory,
          WhatsappLog,
          SocialMediaContent,
          OrderSource,
          InventoryLocation,
          ItemInventory,
        ],
        migrations: [__dirname + '/migrations/*{.ts,.js}'],
        synchronize: false,
        migrationsRun: true, // auto run migrations on start
        logging: true,
      }),
    }),
  ],
})
export class DatabaseModule {}
