import { OrdersService } from './orders.service';
import { OrderStatus, Gender, OrderSource } from '../../database/entities/enums';
export declare class OrdersController {
    private readonly ordersService;
    constructor(ordersService: OrdersService);
    findAll(page?: number, limit?: number, status?: OrderStatus, search?: string, startDate?: string, endDate?: string, sortBy?: string, sortOrder?: 'ASC' | 'DESC'): Promise<{
        data: import("../../database/entities/order.entity").Order[];
        total: number;
    }>;
    findOne(id: string): Promise<import("../../database/entities/order.entity").Order>;
    create(body: {
        customerContact: string;
        customerName?: string;
        customerGender?: Gender;
        customerLocation?: string;
        source?: OrderSource;
        expectedDeliveryDate?: string | Date;
        deliveryLocation?: string;
        items: {
            itemId: string;
            quantity: number;
        }[];
    }): Promise<import("../../database/entities/order.entity").Order>;
    updateStatus(id: string, body: {
        status: OrderStatus;
        changedBy?: string;
    }): Promise<import("../../database/entities/order.entity").Order>;
}
