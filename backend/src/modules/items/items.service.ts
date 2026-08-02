import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Item } from '../../database/entities/item.entity';
import { ItemPriceHistory } from '../../database/entities/item-price-history.entity';

/** Compute margin percentage given selling price and optional cost price. */
function computeMargin(price: number, costPrice: number | null): number | null {
  if (costPrice === null || costPrice === undefined || price === 0) return null;
  return parseFloat((((price - costPrice) / price) * 100).toFixed(2));
}

@Injectable()
export class ItemsService {
  constructor(
    @InjectRepository(Item)
    private readonly itemRepository: Repository<Item>,
    @InjectRepository(ItemPriceHistory)
    private readonly priceHistoryRepository: Repository<ItemPriceHistory>,
  ) {}

  async findAll(search?: string): Promise<any[]> {
    const qb = this.itemRepository
      .createQueryBuilder('item')
      .leftJoinAndSelect('item.priceHistory', 'priceHistory');

    if (search) {
      qb.where('item.name ILIKE :search', { search: `%${search}%` });
    }

    qb.orderBy('item.name', 'ASC');

    const items = await qb.getMany();

    return items.map((item) => {
      const sortedHistory = [...item.priceHistory].sort(
        (a, b) => b.changedAt.getTime() - a.changedAt.getTime(),
      );
      const latest = sortedHistory.length > 0 ? sortedHistory[0] : null;
      const activePrice = latest ? parseFloat(latest.price as any) : 0;
      const activeCostPrice =
        latest?.costPrice !== null && latest?.costPrice !== undefined
          ? parseFloat(latest.costPrice as any)
          : null;

      return {
        id: item.id,
        name: item.name,
        ingredients: item.ingredients,
        bestBeforeDays: item.bestBeforeDays,
        imageUrl: item.imageUrl,
        activePrice,
        activeCostPrice,
        activeMarginPercent: computeMargin(activePrice, activeCostPrice),
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
    costPrice?: number | null;
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

    const priceHist = new ItemPriceHistory();
    priceHist.item = savedItem;
    priceHist.price = data.price;
    priceHist.costPrice = data.costPrice ?? null;
    await this.priceHistoryRepository.save(priceHist);

    return {
      ...savedItem,
      activePrice: data.price,
      activeCostPrice: data.costPrice ?? null,
      activeMarginPercent: computeMargin(data.price, data.costPrice ?? null),
    };
  }

  async update(
    id: string,
    data: {
      name?: string;
      price?: number;
      costPrice?: number | null;
      ingredients?: string[];
      bestBeforeDays?: number;
      imageUrl?: string;
    },
  ): Promise<any> {
    const item = await this.findOne(id);

    if (data.name !== undefined) item.name = data.name;
    if (data.ingredients !== undefined) item.ingredients = data.ingredients;
    if (data.bestBeforeDays !== undefined)
      item.bestBeforeDays = data.bestBeforeDays;
    if (data.imageUrl !== undefined) item.imageUrl = data.imageUrl ?? null;

    const savedItem = await this.itemRepository.save(item);

    const sortedHistory = [...item.priceHistory].sort(
      (a, b) => b.changedAt.getTime() - a.changedAt.getTime(),
    );
    const latestEntry = sortedHistory.length > 0 ? sortedHistory[0] : null;
    const activePrice = latestEntry
      ? parseFloat(latestEntry.price as any)
      : 0;
    const existingCost =
      latestEntry?.costPrice !== null && latestEntry?.costPrice !== undefined
        ? parseFloat(latestEntry.costPrice as any)
        : null;

    // If selling price changed → create a new history row with the new price (and optional new cost).
    // If only costPrice changed (no new selling price) → patch the latest history row in-place.
    let updatedActivePrice = activePrice;
    let updatedActiveCostPrice = existingCost;

    const newPrice = data.price !== undefined ? data.price : undefined;
    const newCost = data.costPrice !== undefined ? data.costPrice : undefined;

    if (newPrice !== undefined && newPrice !== activePrice) {
      const priceHist = new ItemPriceHistory();
      priceHist.item = savedItem;
      priceHist.price = newPrice;
      priceHist.costPrice = newCost !== undefined ? newCost : existingCost;
      await this.priceHistoryRepository.save(priceHist);
      updatedActivePrice = newPrice;
      updatedActiveCostPrice = priceHist.costPrice;
    } else if (newCost !== undefined && latestEntry) {
      // Selling price unchanged; only update cost on latest entry
      await this.priceHistoryRepository.update(latestEntry.id, {
        costPrice: newCost,
      });
      updatedActiveCostPrice = newCost;
    }

    return {
      ...savedItem,
      activePrice: updatedActivePrice,
      activeCostPrice: updatedActiveCostPrice,
      activeMarginPercent: computeMargin(updatedActivePrice, updatedActiveCostPrice),
    };
  }

  async remove(id: string): Promise<void> {
    const item = await this.findOne(id);
    await this.itemRepository.remove(item);
  }

  async getPriceHistory(id: string): Promise<any[]> {
    const item = await this.findOne(id);
    const rows = await this.priceHistoryRepository.find({
      where: { item: { id: item.id } },
      order: { changedAt: 'ASC' },
    });

    return rows.map((row) => {
      const price = parseFloat(row.price as any);
      const costPrice =
        row.costPrice !== null && row.costPrice !== undefined
          ? parseFloat(row.costPrice as any)
          : null;
      return {
        id: row.id,
        price,
        costPrice,
        marginPercent: computeMargin(price, costPrice),
        changedAt: row.changedAt,
      };
    });
  }

  /** Patch costPrice, price, and/or changedAt timestamp on any existing history entry by its UUID. */
  async updatePriceHistoryEntry(
    entryId: string,
    data: { costPrice?: number | null; price?: number; changedAt?: string | Date },
  ): Promise<any> {
    const entry = await this.priceHistoryRepository.findOne({
      where: { id: entryId },
      relations: { item: true },
    });
    if (!entry) {
      throw new NotFoundException(
        `Price history entry with ID ${entryId} not found`,
      );
    }
    if (data.price !== undefined) {
      if (data.price <= 0) {
        throw new BadRequestException('Price must be greater than zero');
      }
      entry.price = data.price;
    }
    if (data.costPrice !== undefined) {
      entry.costPrice = data.costPrice;
    }
    if (data.changedAt !== undefined && data.changedAt !== null) {
      entry.changedAt = new Date(data.changedAt);
    }
    const saved = await this.priceHistoryRepository.save(entry);
    const price = parseFloat(saved.price as any);
    const costPrice =
      saved.costPrice !== null && saved.costPrice !== undefined
        ? parseFloat(saved.costPrice as any)
        : null;
    return {
      id: saved.id,
      price,
      costPrice,
      marginPercent: computeMargin(price, costPrice),
      changedAt: saved.changedAt,
    };
  }
}
