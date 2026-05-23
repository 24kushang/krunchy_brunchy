import { Item } from './item.entity';
export declare class ItemPriceHistory {
    id: string;
    item: Item;
    price: number;
    changedAt: Date;
}
