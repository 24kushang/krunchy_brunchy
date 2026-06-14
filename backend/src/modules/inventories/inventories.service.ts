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

export interface ProbableTransit {
  fromLocationId: string;
  fromLocationName: string;
  toLocationId: string;
  toLocationName: string;
  itemId: string;
  itemName: string;
  quantity: number;
}

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
      const probableTransits: ProbableTransit[] = [];

      const orderPlanningItem = {
        orderId: order.id,
        orderNumber: order.orderNumber,
        customerName: order.customer?.name || 'Walk-in Customer',
        createdAt: order.createdAt,
        hubId,
        hubName: assignedHub?.name || 'Default Hub',
        items: [] as any[],
        allocationStatus: 'Fully Allocated',
        probableTransits,
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

          // Check for possible transits from other locations
          for (const otherLoc of locations) {
            if (hubId && otherLoc.id !== hubId) {
              const otherVirtual = virtualStock[otherLoc.id]?.[itemId] || 0;
              if (otherVirtual > 0) {
                probableTransits.push({
                  fromLocationId: otherLoc.id,
                  fromLocationName: otherLoc.name,
                  toLocationId: hubId,
                  toLocationName: assignedHub?.name || 'Default Hub',
                  itemId,
                  itemName,
                  quantity: Math.min(deficit, otherVirtual),
                });
              }
            }
          }
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

  async executeTransit(
    fromLocationId: string,
    toLocationId: string,
    itemId: string,
    quantity: number,
  ): Promise<void> {
    if (quantity <= 0) {
      throw new BadRequestException('Transit quantity must be greater than zero');
    }

    const itemObj = await this.itemRepo.findOne({ where: { id: itemId } });
    if (!itemObj) {
      throw new NotFoundException(`Item with ID ${itemId} not found`);
    }

    const fromLoc = await this.locationRepo.findOne({ where: { id: fromLocationId } });
    const toLoc = await this.locationRepo.findOne({ where: { id: toLocationId } });
    if (!fromLoc || !toLoc) {
      throw new NotFoundException('Source or destination location not found');
    }

    // Run in transaction
    await this.itemInventoryRepo.manager.transaction(async (manager) => {
      const sourceInv = await manager.findOne(ItemInventory, {
        where: { item: { id: itemId }, location: { id: fromLocationId } },
      });

      if (!sourceInv || sourceInv.quantity < quantity) {
        throw new BadRequestException(
          `Source location does not have enough stock. Available: ${sourceInv?.quantity || 0}`,
        );
      }

      let destInv = await manager.findOne(ItemInventory, {
        where: { item: { id: itemId }, location: { id: toLocationId } },
      });

      if (!destInv) {
        destInv = new ItemInventory();
        destInv.item = itemObj;
        destInv.location = toLoc;
        destInv.quantity = 0;
      }

      sourceInv.quantity -= quantity;
      destInv.quantity += quantity;

      await manager.save(ItemInventory, sourceInv);
      await manager.save(ItemInventory, destInv);
    });
  }
}
