import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ItemInventory } from '../../database/entities/item-inventory.entity';
import { InventoryLocation } from '../../database/entities/inventory-location.entity';
import { Item } from '../../database/entities/item.entity';
import { Order } from '../../database/entities/order.entity';
import { InventoriesService } from './inventories.service';
import { InventoriesController } from './inventories.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([ItemInventory, InventoryLocation, Item, Order]),
  ],
  controllers: [InventoriesController],
  providers: [InventoriesService],
  exports: [InventoriesService],
})
export class InventoriesModule {}
