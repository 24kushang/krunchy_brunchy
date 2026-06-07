import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ItemInventory } from '../../database/entities/item-inventory.entity';
import { InventoryLocation } from '../../database/entities/inventory-location.entity';
import { Item } from '../../database/entities/item.entity';
import { Order } from '../../database/entities/order.entity';
import { OrderStatus } from '../../database/entities/enums';

@Injectable()
export class InventoriesService {
  constructor(
    @InjectRepository(ItemInventory)
    private readonly itemInventoryRepo: Repository<ItemInventory>,
    @InjectRepository(InventoryLocation)
    private readonly locationRepo: Repository<InventoryLocation>,
    @InjectRepository(Item)
    private readonly itemRepo: Repository<Item>,
    @InjectRepository(Order)
    private readonly orderRepo: Repository<Order>,
  ) {}

  async getLocations(): Promise<InventoryLocation[]> {
    return this.locationRepo.find({ order: { name: 'ASC' } });
  }

  async findAll() {
    const locations = await this.getLocations();
    const items = await this.itemRepo.find({ order: { name: 'ASC' } });
    const inventories = await this.itemInventoryRepo.find({
      relations: { item: true, location: true },
    });

    const itemStocks = items.map((item) => {
      const stocks: Record<string, number> = {};

      // Initialize stocks for all locations to 0
      locations.forEach((loc) => {
        stocks[loc.id] = 0;
      });

      // Fill in actual stock quantities
      inventories.forEach((inv) => {
        if (inv.item?.id === item.id && inv.location) {
          stocks[inv.location.id] = inv.quantity;
        }
      });

      return {
        itemId: item.id,
        itemName: item.name,
        stocks,
      };
    });

    return {
      locations,
      itemStocks,
    };
  }

  async adjustStock(
    itemId: string,
    locationId: string,
    quantity: number,
  ): Promise<ItemInventory> {
    if (quantity < 0) {
      throw new BadRequestException('Stock quantity cannot be negative');
    }

    const itemObj = await this.itemRepo.findOne({ where: { id: itemId } });
    if (!itemObj) {
      throw new NotFoundException(`Item with ID ${itemId} not found`);
    }

    const locationObj = await this.locationRepo.findOne({
      where: { id: locationId },
    });
    if (!locationObj) {
      throw new NotFoundException(
        `Inventory location with ID ${locationId} not found`,
      );
    }

    let inv = await this.itemInventoryRepo.findOne({
      where: {
        item: { id: itemId },
        location: { id: locationId },
      },
    });

    if (!inv) {
      inv = new ItemInventory();
      inv.item = itemObj;
      inv.location = locationObj;
    }

    inv.quantity = quantity;
    return this.itemInventoryRepo.save(inv);
  }

  async getFIFOPlanning() {
    // 1. Fetch uncompleted orders chronologically (oldest first)
    const activeOrders = await this.orderRepo.find({
      where: [
        { status: OrderStatus.PENDING },
        { status: OrderStatus.PREPARING },
        { status: OrderStatus.READY_TO_DELIVER },
      ],
      order: { createdAt: 'ASC' },
      relations: {
        customer: true,
        fulfillmentHub: true,
        items: {
          item: true,
        },
      },
    });

    // 2. Fetch current stock levels
    const locations = await this.getLocations();
    const inventories = await this.itemInventoryRepo.find({
      relations: { item: true, location: true },
    });

    // 3. Setup virtual stock maps for calculation
    const virtualStock: Record<string, Record<string, number>> = {};
    const originalStock: Record<string, Record<string, number>> = {};

    locations.forEach((loc) => {
      virtualStock[loc.id] = {};
      originalStock[loc.id] = {};
    });

    inventories.forEach((inv) => {
      if (inv.location && inv.item) {
        virtualStock[inv.location.id][inv.item.id] = inv.quantity;
        originalStock[inv.location.id][inv.item.id] = inv.quantity;
      }
    });

    // Fallback default hub if not specified
    const defaultHub = locations[0] || null;

    const ordersPlanning = [];
    const aggregatedShortages: Record<
      string,
      { itemId: string; itemName: string; requiredToProduce: number }
    > = {};

    // 4. Simulate allocation chronologically (FIFO)
    for (const order of activeOrders) {
      const assignedHub = order.fulfillmentHub || defaultHub;
      const hubId = assignedHub?.id;

      const orderPlanningItem = {
        orderId: order.id,
        orderNumber: order.orderNumber,
        customerName: order.customer?.name || 'Walk-in Customer',
        createdAt: order.createdAt,
        hubId,
        hubName: assignedHub?.name || 'Default Hub',
        items: [] as any[],
        allocationStatus: 'Fully Allocated',
      };

      let fullyAllocatedCount = 0;
      let zeroAllocatedCount = 0;

      for (const orderItem of order.items) {
        const itemId = orderItem.item.id;
        const itemName = orderItem.item.name;
        const requested = orderItem.quantity;
        let allocated = 0;

        // Fetch virtual stock from the hub
        const currentVirtual =
          (hubId && virtualStock[hubId] && virtualStock[hubId][itemId]) || 0;

        if (currentVirtual >= requested) {
          allocated = requested;
          if (hubId) {
            virtualStock[hubId][itemId] = currentVirtual - requested;
          }
        } else if (currentVirtual > 0) {
          allocated = currentVirtual;
          if (hubId) {
            virtualStock[hubId][itemId] = 0;
          }
        } else {
          allocated = 0;
        }

        const deficit = requested - allocated;
        if (deficit > 0) {
          // Add to shortages list
          if (!aggregatedShortages[itemId]) {
            aggregatedShortages[itemId] = {
              itemId,
              itemName,
              requiredToProduce: 0,
            };
          }
          aggregatedShortages[itemId].requiredToProduce += deficit;
        }

        if (allocated === requested) {
          fullyAllocatedCount++;
        } else if (allocated === 0) {
          zeroAllocatedCount++;
        }

        orderPlanningItem.items.push({
          itemId,
          itemName,
          quantityRequested: requested,
          quantityAllocated: allocated,
          deficit,
          status:
            allocated === requested
              ? 'Allocated'
              : allocated > 0
                ? 'Partially Allocated'
                : 'Out of Stock',
        });
      }

      // Determine order overall status
      if (fullyAllocatedCount === order.items.length) {
        orderPlanningItem.allocationStatus = 'Fully Allocated';
      } else if (zeroAllocatedCount === order.items.length) {
        orderPlanningItem.allocationStatus = 'Unallocated';
      } else {
        orderPlanningItem.allocationStatus = 'Partially Allocated';
      }

      ordersPlanning.push(orderPlanningItem);
    }

    return {
      ordersPlanning,
      shortages: Object.values(aggregatedShortages),
      originalStock,
    };
  }
}
