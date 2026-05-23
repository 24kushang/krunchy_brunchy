import { ItemsService } from './items.service';
export declare class ItemsController {
    private readonly itemsService;
    constructor(itemsService: ItemsService);
    findAll(search?: string): Promise<any[]>;
    getPriceHistory(id: string): Promise<import("../../database/entities/item-price-history.entity").ItemPriceHistory[]>;
    create(body: {
        name: string;
        price: number;
        ingredients?: string[];
        bestBeforeDays: number;
        imageUrl?: string;
    }): Promise<any>;
    update(id: string, body: {
        name?: string;
        price?: number;
        ingredients?: string[];
        bestBeforeDays?: number;
        imageUrl?: string;
    }): Promise<any>;
    remove(id: string): Promise<{
        success: boolean;
    }>;
}
