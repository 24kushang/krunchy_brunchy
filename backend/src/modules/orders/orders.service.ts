import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, Between, Like } from 'typeorm';
import { Order } from '../../database/entities/order.entity';
import { OrderItem } from '../../database/entities/order-item.entity';
import { OrderStatusHistory } from '../../database/entities/order-status-history.entity';
import { Customer } from '../../database/entities/customer.entity';
import { Item } from '../../database/entities/item.entity';
import { ItemPriceHistory } from '../../database/entities/item-price-history.entity';
import { OrderStatus, Gender, OrderSource } from '../../database/entities/enums';
import { WhatsappService } from '../whatsapp/whatsapp.service';

@Injectable()
export class OrdersService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    @InjectRepository(Customer)
    private readonly customerRepository: Repository<Customer>,
    @InjectRepository(Item)
    private readonly itemRepository: Repository<Item>,
    @InjectRepository(OrderStatusHistory)
    private readonly statusHistoryRepository: Repository<OrderStatusHistory>,
    private readonly whatsappService: WhatsappService,
  ) { }

  async findAll(query: {
    page?: number;
    limit?: number;
    status?: OrderStatus;
    search?: string;
    startDate?: string;
    endDate?: string;
    sortBy?: string;
    sortOrder?: 'ASC' | 'DESC';
  }): Promise<{ data: Order[]; total: number }> {
    const page = query.page ? Number(query.page) : 1;
    const limit = query.limit ? Number(query.limit) : 10;
    const skip = (page - 1) * limit;

    const qb = this.orderRepository.createQueryBuilder('order')
      .leftJoinAndSelect('order.customer', 'customer')
      .leftJoinAndSelect('order.items', 'items')
      .leftJoinAndSelect('items.item', 'item');

    if (query.status) {
      qb.andWhere('order.status = :status', { status: query.status });
    }

    if (query.search) {
      qb.andWhere(
        '(order.orderNumber ILIKE :search OR customer.name ILIKE :search OR customer.contact ILIKE :search)',
        { search: `%${query.search}%` },
      );
    }

    if (query.startDate && query.endDate) {
      qb.andWhere('order.createdAt BETWEEN :start AND :end', {
        start: new Date(query.startDate),
        end: new Date(query.endDate),
      });
    }

    // Server-side sorting
    const sortBy = query.sortBy || 'createdAt';
    const sortOrder = query.sortOrder || 'DESC';

    if (sortBy === 'customerName') {
      qb.orderBy('customer.name', sortOrder);
    } else {
      qb.orderBy(`order.${sortBy}`, sortOrder);
    }

    qb.skip(skip).take(limit);

    const [data, total] = await qb.getManyAndCount();
    return { data, total };
  }

  async findOne(id: string): Promise<Order> {
    const order = await this.orderRepository.findOne({
      where: { id },
      relations: {
        customer: true,
        items: {
          item: true,
        },
        statusHistory: true,
        whatsappLogs: true,
      },
    });

    if (!order) {
      throw new NotFoundException(`Order with ID ${id} not found`);
    }
    return order;
  }

  // Atomic Order Upsert Transaction
  async create(data: {
    customerContact: string;
    customerName?: string;
    customerGender?: Gender;
    customerLocation?: string;
    source?: OrderSource;
    expectedDeliveryDate?: string | Date;
    deliveryLocation?: string;
    items: { itemId: string; quantity: number }[];
  }): Promise<Order> {
    if (!data.items || data.items.length === 0) {
      throw new BadRequestException('Order must contain at least one item');
    }

    // Run within a database transaction block
    return this.dataSource.transaction(async (manager) => {
      // 1. Resolve or Create Customer (Atomic Upsert)
      let customer = await manager.findOne(Customer, {
        where: { contact: data.customerContact },
      });

      if (!customer) {
        if (!data.customerName || !data.customerGender || !data.customerLocation) {
          throw new BadRequestException(
            'Customer contact is new. Please provide Name, Gender, and Location to create a profile.',
          );
        }

        customer = new Customer();
        customer.contact = data.customerContact;
        customer.name = data.customerName;
        customer.gender = data.customerGender;
        customer.location = data.customerLocation;
        customer = await manager.save(Customer, customer);
      }

      // 2. Generate Order Number serial sequence KB-XXXXX
      const lastOrder = await manager.findOne(Order, {
        where: {},
        order: { orderNumber: 'DESC' },
      });

      let nextSerial = 10001;
      if (lastOrder && lastOrder.orderNumber.startsWith('KB-')) {
        const lastSerial = parseInt(lastOrder.orderNumber.replace('KB-', ''), 10);
        if (!isNaN(lastSerial)) {
          nextSerial = lastSerial + 1;
        }
      }
      const orderNumber = `KB-${nextSerial}`;

      // 3. Create Order block
      const order = new Order();
      order.orderNumber = orderNumber;
      order.customer = customer;
      order.status = OrderStatus.PENDING;
      order.totalAmount = 0;
      if (data.source) {
        order.source = data.source;
      }
      if (data.expectedDeliveryDate) {
        order.expectedDeliveryDate = new Date(data.expectedDeliveryDate);
      }
      if (data.deliveryLocation) {
        order.deliveryLocation = data.deliveryLocation;
      }
      const savedOrder = await manager.save(Order, order);

      // 4. Resolve items active price and create OrderItem price snapshots
      let totalAmount = 0;
      for (const itemRequest of data.items) {
        const itemObj = await manager.findOne(Item, {
          where: { id: itemRequest.itemId },
          relations: { priceHistory: true },
        });

        if (!itemObj) {
          throw new BadRequestException(`Item with ID ${itemRequest.itemId} not found`);
        }

        // Get latest price
        const sortedHistory = [...itemObj.priceHistory].sort(
          (a, b) => b.changedAt.getTime() - a.changedAt.getTime(),
        );

        if (sortedHistory.length === 0) {
          throw new BadRequestException(`Item ${itemObj.name} does not have any pricing history log`);
        }

        const priceAtOrder = parseFloat(sortedHistory[0].price as any);
        const orderItem = new OrderItem();
        orderItem.order = savedOrder;
        orderItem.item = itemObj;
        orderItem.quantity = itemRequest.quantity;
        orderItem.priceAtOrder = priceAtOrder;

        await manager.save(OrderItem, orderItem);

        totalAmount += priceAtOrder * itemRequest.quantity;
      }

      // Update total amount on order
      savedOrder.totalAmount = Math.round(totalAmount * 100) / 100;
      const finalizedOrder = await manager.save(Order, savedOrder);

      // 5. Add initial Pending Status History log
      const history = new OrderStatusHistory();
      history.order = finalizedOrder;
      history.status = OrderStatus.PENDING;
      history.changedBy = 'Admin';
      await manager.save(OrderStatusHistory, history);

      // 6. Trigger WhatsApp order confirmation
      // We pass the order fully populated
      // const fullOrder = await manager.findOne(Order, {
      //   where: { id: finalizedOrder.id },
      //   relations: { customer: true },
      // });
      // if (fullOrder) {
      //   await this.whatsappService.triggerNotification(fullOrder, 'Order Created (Pending)');
      // }

      return finalizedOrder;
    });
  }

  // Update order status with transition logs and WhatsApp triggers
  async updateStatus(id: string, newStatus: OrderStatus, changedBy = 'Admin'): Promise<Order> {
    const order = await this.findOne(id);
    const oldStatus = order.status;

    if (oldStatus === newStatus) {
      return order;
    }

    order.status = newStatus;
    const updatedOrder = await this.orderRepository.save(order);

    // Save status history record
    const history = new OrderStatusHistory();
    history.order = updatedOrder;
    history.status = newStatus;
    history.changedBy = changedBy;
    await this.statusHistoryRepository.save(history);

    // Trigger WhatsApp notification hooks based on transition
    if (newStatus === OrderStatus.PENDING) {
      await this.whatsappService.triggerNotification(updatedOrder, 'Order Created (Pending)');
    } else if (newStatus === OrderStatus.READY_TO_DELIVER) {
      await this.whatsappService.triggerNotification(updatedOrder, 'Ready to Deliver');
    } else if (newStatus === OrderStatus.DELIVERED) {
      await this.whatsappService.triggerNotification(updatedOrder, 'Order Delivered (Payment Confirmed)');
    }

    return updatedOrder;
  }
}
