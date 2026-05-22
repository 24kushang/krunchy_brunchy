import { Controller, Get, Post, Put, Param, Body, HttpException, HttpStatus } from '@nestjs/common';
import { ItemsService } from './items.service';

@Controller('api/items')
export class ItemsController {
  constructor(private readonly itemsService: ItemsService) {}

  @Get()
  async getItems() {
    try {
      return await this.itemsService.getAllItems();
    } catch (err: any) {
      throw new HttpException(err.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Post()
  async createItem(@Body() body: { name: string; ingredients: string | string[]; price: number; best_before_duration: string }) {
    const { name, ingredients, price, best_before_duration } = body;
    if (!name || !ingredients || price === undefined || !best_before_duration) {
      throw new HttpException('All item fields are required', HttpStatus.BAD_REQUEST);
    }

    try {
      return await this.itemsService.createItem(name, ingredients, price, best_before_duration);
    } catch (err: any) {
      if (err.code === '23505') {
        throw new HttpException('An item with this name already exists', HttpStatus.BAD_REQUEST);
      }
      throw new HttpException(err.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Put(':id')
  async updateItem(
    @Param('id') id: string,
    @Body() body: { name: string; ingredients: string | string[]; price: number; best_before_duration: string }
  ) {
    const { name, ingredients, price, best_before_duration } = body;
    if (!name || !ingredients || price === undefined || !best_before_duration) {
      throw new HttpException('All item fields are required', HttpStatus.BAD_REQUEST);
    }

    try {
      const updated = await this.itemsService.updateItem(parseInt(id, 10), name, ingredients, price, best_before_duration);
      if (!updated) {
        throw new HttpException('Item not found', HttpStatus.NOT_FOUND);
      }
      return updated;
    } catch (err: any) {
      if (err instanceof HttpException) {
        throw err;
      }
      throw new HttpException(err.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}
