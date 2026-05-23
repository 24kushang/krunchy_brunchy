import { Order } from './order.entity';
import { OrderStatus } from './enums';
export declare class OrderStatusHistory {
    id: string;
    order: Order;
    status: OrderStatus;
    changedAt: Date;
    changedBy: string;
}
