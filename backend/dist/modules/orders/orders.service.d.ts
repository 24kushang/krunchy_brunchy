import { Repository, DataSource } from 'typeorm';
import { Order } from '../../database/entities/order.entity';
import { OrderStatusHistory } from '../../database/entities/order-status-history.entity';
import { Customer } from '../../database/entities/customer.entity';
import { Item } from '../../database/entities/item.entity';
import { OrderStatus, Gender, PaymentStatus, PaymentMode } from '../../database/entities/enums';
import { WhatsappService } from '../whatsapp/whatsapp.service';
export declare class OrdersService {
    private readonly dataSource;
    private readonly orderRepository;
    private readonly customerRepository;
    private readonly itemRepository;
    private readonly statusHistoryRepository;
    private readonly whatsappService;
    constructor(dataSource: DataSource, orderRepository: Repository<Order>, customerRepository: Repository<Customer>, itemRepository: Repository<Item>, statusHistoryRepository: Repository<OrderStatusHistory>, whatsappService: WhatsappService);
    findAll(query: {
        page?: number;
        limit?: number;
        status?: OrderStatus;
        search?: string;
        startDate?: string;
        endDate?: string;
        sortBy?: string;
        sortOrder?: 'ASC' | 'DESC';
    }): Promise<{
        data: Order[];
        total: number;
    }>;
    findOne(id: string): Promise<Order>;
    create(data: {
        customerContact: string;
        customerName?: string;
        customerGender?: Gender;
        customerLocation?: string;
        customerAddress?: string;
        sourceId?: string;
        fulfillmentHubId?: string;
        expectedDeliveryDate?: string | Date;
        deliveryLocation?: string;
        status?: OrderStatus;
        items: {
            itemId: string;
            quantity: number;
        }[];
    }): Promise<Order>;
    updateStatus(id: string, newStatus: OrderStatus, changedBy?: string): Promise<Order>;
    updatePayment(id: string, paymentStatus: PaymentStatus, paymentMode?: PaymentMode, cashDetails?: string): Promise<Order>;
    getRevenueMetrics(): Promise<{
        totalPaidRevenue: number;
        totalPendingRevenue: number;
        modeBreakdown: Record<string, number>;
        cashLogs: {
            orderId: string;
            orderNumber: string;
            customerName: string;
            amount: number;
            collectedAt: string;
            timestamp: Date | null;
        }[];
        timeline: {
            date: string;
            revenue: number;
        }[];
    }>;
    importOrders(csvText: string): Promise<{
        successCount: number;
        errors: string[];
    }>;
}
