import { Controller, Get, Post, Put, Delete, Body, Param } from '@nestjs/common';
import { OrderSourcesService } from './order-sources.service';

@Controller('api/order-sources')
export class OrderSourcesController {
  constructor(private readonly orderSourcesService: OrderSourcesService) {}

  @Get()
  async findAll() {
    return this.orderSourcesService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.orderSourcesService.findOne(id);
  }

  @Post()
  async create(@Body() body: { name: string }) {
    return this.orderSourcesService.create(body.name);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() body: { name: string }) {
    return this.orderSourcesService.update(id, body.name);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    return this.orderSourcesService.remove(id);
  }
}
