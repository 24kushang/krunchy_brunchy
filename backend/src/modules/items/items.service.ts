import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Item } from '../../database/entities/item.entity';
import { ItemPriceHistory } from '../../database/entities/item-price-history.entity';

@Injectable()
export class ItemsService {
  constructor(
    @InjectRepository(Item)
    private readonly itemRepository: Repository<Item>,
    @InjectRepository(ItemPriceHistory)
    private readonly priceHistoryRepository: Repository<ItemPriceHistory>,
  ) { }

  async findAll(search?: string): Promise<any[]> {
    const qb = this.itemRepository.createQueryBuilder('item')
      .leftJoinAndSelect('item.priceHistory', 'priceHistory');

    if (search) {
      qb.where('item.name ILIKE :search', { search: `%${search}%` });
    }

    qb.orderBy('item.name', 'ASC');

    const items = await qb.getMany();

    // Map items to include activePrice
    return items.map(item => {
      // Find latest price history record
      const sortedHistory = [...item.priceHistory].sort(
        (a, b) => b.changedAt.getTime() - a.changedAt.getTime()
      );
      const activePrice = sortedHistory.length > 0 ? parseFloat(sortedHistory[0].price as any) : 0;

      return {
        id: item.id,
        name: item.name,
        ingredients: item.ingredients,
        bestBeforeDays: item.bestBeforeDays,
        imageUrl: item.imageUrl,
        activePrice,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
      };
    });
  }

  async findOne(id: string): Promise<Item> {
    const item = await this.itemRepository.findOne({
      where: { id },
      relations: { priceHistory: true },
    });
    if (!item) {
      throw new NotFoundException(`Item with ID ${id} not found`);
    }
    return item;
  }

  async create(data: {
    name: string;
    price: number;
    ingredients?: string[];
    bestBeforeDays: number;
    imageUrl?: string;
  }): Promise<any> {
    const item = new Item();
    item.name = data.name;
    item.ingredients = data.ingredients || [];
    item.bestBeforeDays = data.bestBeforeDays;
    item.imageUrl = data.imageUrl ?? null;

    const savedItem = await this.itemRepository.save(item);

    // Save initial price history record
    const priceHist = new ItemPriceHistory();
    priceHist.item = savedItem;
    priceHist.price = data.price;
    await this.priceHistoryRepository.save(priceHist);

    return {
      ...savedItem,
      activePrice: data.price,
    };
  }

  async update(id: string, data: {
    name?: string;
    price?: number;
    ingredients?: string[];
    bestBeforeDays?: number;
    imageUrl?: string;
  }): Promise<any> {
    const item = await this.findOne(id);

    if (data.name !== undefined) item.name = data.name;
    if (data.ingredients !== undefined) item.ingredients = data.ingredients;
    if (data.bestBeforeDays !== undefined) item.bestBeforeDays = data.bestBeforeDays;
    if (data.imageUrl !== undefined) item.imageUrl = data.imageUrl ?? null;

    const savedItem = await this.itemRepository.save(item);

    // Check if price has changed compared to the active price
    const sortedHistory = [...item.priceHistory].sort(
      (a, b) => b.changedAt.getTime() - a.changedAt.getTime()
    );
    const activePrice = sortedHistory.length > 0 ? parseFloat(sortedHistory[0].price as any) : 0;

    let updatedActivePrice = activePrice;
    if (data.price !== undefined && data.price !== activePrice) {
      const priceHist = new ItemPriceHistory();
      priceHist.item = savedItem;
      priceHist.price = data.price;
      await this.priceHistoryRepository.save(priceHist);
      updatedActivePrice = data.price;
    }

    return {
      ...savedItem,
      activePrice: updatedActivePrice,
    };
  }

  async remove(id: string): Promise<void> {
    const item = await this.findOne(id);
    await this.itemRepository.remove(item);
  }

  async getPriceHistory(id: string): Promise<ItemPriceHistory[]> {
    const item = await this.findOne(id);
    return this.priceHistoryRepository.find({
      where: { item: { id: item.id } },
      order: { changedAt: 'ASC' },
    });
  }
}
