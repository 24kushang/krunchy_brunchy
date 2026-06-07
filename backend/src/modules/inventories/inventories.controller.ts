import { Controller, Get, Patch, Body } from '@nestjs/common';
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

  @Get('planning')
  async getFIFOPlanning() {
    return this.inventoriesService.getFIFOPlanning();
  }
}
