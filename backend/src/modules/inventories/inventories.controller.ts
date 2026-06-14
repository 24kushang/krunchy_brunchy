import { Controller, Get, Patch, Post, Body } from '@nestjs/common';
import { InventoriesService } from './inventories.service';

@Controller('api/inventories')
export class InventoriesController {
  constructor(private readonly inventoriesService: InventoriesService) {}

  @Get()
  async findAll() {
    return this.inventoriesService.findAll();
  }

  @Patch('adjust')
  async adjustStock(
    @Body() body: { itemId: string; locationId: string; quantity: number },
  ) {
    return this.inventoriesService.adjustStock(
      body.itemId,
      body.locationId,
      body.quantity,
    );
  }

  @Post('transit')
  async executeTransit(
    @Body()
    body: {
      fromLocationId: string;
      toLocationId: string;
      itemId: string;
      quantity: number;
    },
  ) {
    return this.inventoriesService.executeTransit(
      body.fromLocationId,
      body.toLocationId,
      body.itemId,
      body.quantity,
    );
  }

  @Get('planning')
  async getFIFOPlanning() {
    return this.inventoriesService.getFIFOPlanning();
  }
}
