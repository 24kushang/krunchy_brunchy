import { Order } from './order.entity';
import { Item } from './item.entity';
export declare class OrderItem {
    id: string;
    order: Order;
    item: Item;
    quantity: number;
    priceAtOrder: number;
}
