import { Controller, Get, Post, Put, Delete, Body, Param, Query } from '@nestjs/common';
import { ItemsService } from './items.service';

@Controller('api/items')
export class ItemsController {
  constructor(private readonly itemsService: ItemsService) {}

  @Get()
  async findAll(@Query('search') search?: string) {
    return this.itemsService.findAll(search);
  }

  @Get(':id/price-history')
  async getPriceHistory(@Param('id') id: string) {
    return this.itemsService.getPriceHistory(id);
  }

  @Post()
  async create(
    @Body() body: { name: string; price: number; ingredients?: string[]; bestBeforeDays: number; imageUrl?: string },
  ) {
    return this.itemsService.create(body);
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() body: { name?: string; price?: number; ingredients?: string[]; bestBeforeDays?: number; imageUrl?: string },
  ) {
    return this.itemsService.update(id, body);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    await this.itemsService.remove(id);
    return { success: true };
  }
}
