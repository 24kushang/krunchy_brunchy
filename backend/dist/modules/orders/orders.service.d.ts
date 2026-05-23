import { Repository, DataSource } from 'typeorm';
import { Order } from '../../database/entities/order.entity';
import { OrderStatusHistory } from '../../database/entities/order-status-history.entity';
import { Customer } from '../../database/entities/customer.entity';
import { Item } from '../../database/entities/item.entity';
import { OrderStatus, Gender, OrderSource } from '../../database/entities/enums';
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
        source?: OrderSource;
        expectedDeliveryDate?: string | Date;
        deliveryLocation?: string;
        items: {
            itemId: string;
            quantity: number;
        }[];
    }): Promise<Order>;
    updateStatus(id: string, newStatus: OrderStatus, changedBy?: string): Promise<Order>;
}
