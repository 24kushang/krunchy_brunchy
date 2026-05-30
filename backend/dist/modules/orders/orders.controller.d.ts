import { OrdersService } from './orders.service';
import { OrderStatus, Gender, PaymentStatus, PaymentMode } from '../../database/entities/enums';
export declare class OrdersController {
    private readonly ordersService;
    constructor(ordersService: OrdersService);
    findAll(page?: number, limit?: number, status?: OrderStatus, search?: string, startDate?: string, endDate?: string, sortBy?: string, sortOrder?: 'ASC' | 'DESC'): Promise<{
        data: import("../../database/entities/order.entity").Order[];
        total: number;
    }>;
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
    importOrders(body: {
        csvText: string;
    }): Promise<{
        successCount: number;
        errors: string[];
    }>;
    findOne(id: string): Promise<import("../../database/entities/order.entity").Order>;
    create(body: {
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
    }): Promise<import("../../database/entities/order.entity").Order>;
    updateStatus(id: string, body: {
        status: OrderStatus;
        changedBy?: string;
    }): Promise<import("../../database/entities/order.entity").Order>;
    updatePayment(id: string, body: {
        paymentStatus: PaymentStatus;
        paymentMode?: PaymentMode;
        cashDetails?: string;
    }): Promise<import("../../database/entities/order.entity").Order>;
}
