import { Repository } from 'typeorm';
import { Item } from '../../database/entities/item.entity';
import { ItemPriceHistory } from '../../database/entities/item-price-history.entity';
export declare class ItemsService {
    private readonly itemRepository;
    private readonly priceHistoryRepository;
    constructor(itemRepository: Repository<Item>, priceHistoryRepository: Repository<ItemPriceHistory>);
    findAll(search?: string): Promise<any[]>;
    findOne(id: string): Promise<Item>;
    create(data: {
        name: string;
        price: number;
        ingredients?: string[];
        bestBeforeDays: number;
        imageUrl?: string;
    }): Promise<any>;
    update(id: string, data: {
        name?: string;
        price?: number;
        ingredients?: string[];
        bestBeforeDays?: number;
        imageUrl?: string;
    }): Promise<any>;
    remove(id: string): Promise<void>;
    getPriceHistory(id: string): Promise<ItemPriceHistory[]>;
}
