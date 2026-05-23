import { ItemPriceHistory } from './item-price-history.entity';
import { OrderItem } from './order-item.entity';
export declare class Item {
    id: string;
    name: string;
    ingredients: string[] | null;
    bestBeforeDays: number;
    imageUrl: string | null;
    priceHistory: ItemPriceHistory[];
    orderItems: OrderItem[];
    createdAt: Date;
    updatedAt: Date;
}
