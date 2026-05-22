import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Item } from './item.entity';

@Injectable()
export class ItemsService {
  constructor(
    @InjectRepository(Item)
    private readonly itemRepository: Repository<Item>,
  ) {}

  private mapItem(item: Item) {
    if (!item) return null;
    return {
      id: item.id,
      name: item.name,
      ingredients: typeof item.ingredients === 'string'
        ? item.ingredients.split(',').map(i => i.trim()).filter(i => i.length > 0)
        : [],
      price: typeof item.price === 'string' ? parseFloat(item.price) : Number(item.price),
      best_before_duration: item.bestBeforeDuration,
      created_at: item.createdAt,
    };
  }

  async getAllItems() {
    const items = await this.itemRepository.find({ order: { name: 'ASC' } });
    return items.map(item => this.mapItem(item));
  }

  async createItem(name: string, ingredients: string | string[], price: number, bestBeforeDuration: string) {
    const ingredientsStr = Array.isArray(ingredients) 
      ? ingredients.join(', ') 
      : ingredients;

    const item = this.itemRepository.create({
      name,
      ingredients: ingredientsStr,
      price,
      bestBeforeDuration,
    });

    const savedItem = await this.itemRepository.save(item);
    return this.mapItem(savedItem);
  }

  async updateItem(id: number, name: string, ingredients: string | string[], price: number, bestBeforeDuration: string) {
    const ingredientsStr = Array.isArray(ingredients) 
      ? ingredients.join(', ') 
      : ingredients;

    let item = await this.itemRepository.findOne({ where: { id } });
    if (!item) {
      return null;
    }

    item.name = name;
    item.ingredients = ingredientsStr;
    item.price = price;
    item.bestBeforeDuration = bestBeforeDuration;

    const savedItem = await this.itemRepository.save(item);
    return this.mapItem(savedItem);
  }
}
