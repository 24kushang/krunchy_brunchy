import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseModule } from './database/database.module';
import { CustomersModule } from './modules/customers/customers.module';
import { ItemsModule } from './modules/items/items.module';
import { OrdersModule } from './modules/orders/orders.module';
import { WhatsappModule } from './modules/whatsapp/whatsapp.module';
import { SocialMediaModule } from './modules/social-media/social-media.module';
import { UploadModule } from './modules/upload/upload.module';
import { OrderSourcesModule } from './modules/order-sources/order-sources.module';
import { InventoriesModule } from './modules/inventories/inventories.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    DatabaseModule,
    CustomersModule,
    ItemsModule,
    OrdersModule,
    WhatsappModule,
    SocialMediaModule,
    UploadModule,
    OrderSourcesModule,
    InventoriesModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

