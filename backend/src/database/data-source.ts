import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
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

dotenv.config();

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DATABASE_HOST || 'localhost',
  port: parseInt(process.env.DATABASE_PORT || '5432', 10),
  username: process.env.DATABASE_USER || 'admin',
  password: process.env.DATABASE_PASSWORD || 'development_password',
  database: process.env.DATABASE_NAME || 'oms_db',
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
});
