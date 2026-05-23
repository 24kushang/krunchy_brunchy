import { Customer } from './customer.entity';
import { OrderItem } from './order-item.entity';
import { OrderStatusHistory } from './order-status-history.entity';
import { WhatsappLog } from './whatsapp-log.entity';
import { OrderStatus, OrderSource } from './enums';
export declare class Order {
    id: string;
    orderNumber: string;
    source: OrderSource;
    expectedDeliveryDate: Date;
    deliveryLocation: string;
    customer: Customer;
    status: OrderStatus;
    totalAmount: number;
    items: OrderItem[];
    statusHistory: OrderStatusHistory[];
    whatsappLogs: WhatsappLog[];
    createdAt: Date;
    updatedAt: Date;
}
