import { Customer } from './customer.entity';
import { OrderItem } from './order-item.entity';
import { OrderStatusHistory } from './order-status-history.entity';
import { WhatsappLog } from './whatsapp-log.entity';
import { OrderStatus, PaymentStatus, PaymentMode } from './enums';
import { OrderSource } from './order-source.entity';
import { InventoryLocation } from './inventory-location.entity';
export declare class Order {
    id: string;
    orderNumber: string;
    source: OrderSource | null;
    paymentStatus: PaymentStatus;
    paymentMode: PaymentMode | null;
    cashCollectionDetails: string | null;
    paymentUpdatedAt: Date | null;
    fulfillmentHub: InventoryLocation | null;
    expectedDeliveryDate: Date | null;
    deliveryLocation: string | null;
    customer: Customer;
    status: OrderStatus;
    totalAmount: number;
    items: OrderItem[];
    statusHistory: OrderStatusHistory[];
    whatsappLogs: WhatsappLog[];
    createdAt: Date;
    updatedAt: Date;
}
