import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, Between, Like, Brackets } from 'typeorm';
import { Order } from '../../database/entities/order.entity';
import { OrderItem } from '../../database/entities/order-item.entity';
import { OrderStatusHistory } from '../../database/entities/order-status-history.entity';
import { Customer } from '../../database/entities/customer.entity';
import { Item } from '../../database/entities/item.entity';
import { ItemPriceHistory } from '../../database/entities/item-price-history.entity';
import { OrderSource } from '../../database/entities/order-source.entity';
import { InventoryLocation } from '../../database/entities/inventory-location.entity';
import {
  OrderStatus,
  Gender,
  PaymentStatus,
  PaymentMode,
  WhatsappLogStatus,
} from '../../database/entities/enums';
import { WhatsappService } from '../whatsapp/whatsapp.service';
import { WhatsappLog } from '../../database/entities/whatsapp-log.entity';

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
  ) {}

  async findAll(query: {
    page?: number;
    limit?: number;
    status?: OrderStatus;
    search?: string;
    startDate?: string;
    endDate?: string;
    sortBy?: string;
    sortOrder?: 'ASC' | 'DESC';
    kanban?: boolean;
  }): Promise<{ data: Order[]; total: number }> {
    const page = query.page ? Number(query.page) : 1;
    const limit = query.limit ? Number(query.limit) : 10;
    const skip = (page - 1) * limit;

    const qb = this.orderRepository
      .createQueryBuilder('order')
      .leftJoinAndSelect('order.customer', 'customer')
      .leftJoinAndSelect('order.source', 'source')
      .leftJoinAndSelect('order.fulfillmentHub', 'fulfillmentHub')
      .leftJoinAndSelect('order.items', 'items')
      .leftJoinAndSelect('items.item', 'item');

    if (query.status) {
      qb.andWhere('order.status = :status', { status: query.status });
    }

    if (query.kanban === true || (query.kanban as any) === 'true') {
      const now = new Date();
      const istOffset = 5.5 * 60 * 60 * 1000;
      const nowIST = new Date(now.getTime() + istOffset);
      const startOfTodayIST = new Date(
        nowIST.getUTCFullYear(),
        nowIST.getUTCMonth(),
        nowIST.getUTCDate(),
      );
      const startOfThreeDaysAgoIST = new Date(startOfTodayIST.getTime() - 3 * 24 * 60 * 60 * 1000);
      const cutoffDate = new Date(startOfThreeDaysAgoIST.getTime() - istOffset);

      qb.andWhere(
        new Brackets((innerQb) => {
          innerQb.where('order.status IN (:...activeStatuses)', {
            activeStatuses: [
              OrderStatus.PENDING,
              OrderStatus.PREPARING,
              OrderStatus.READY_TO_DELIVER,
            ],
          }).orWhere(
            'order.status IN (:...terminalStatuses) AND order.updatedAt >= :cutoffDate',
            {
              terminalStatuses: [
                OrderStatus.DELIVERED,
                OrderStatus.CANCELLED,
              ],
              cutoffDate,
            },
          );
        }),
      );
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
        source: true,
        fulfillmentHub: true,
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
    customerAddress?: string;
    sourceId?: string;
    fulfillmentHubId?: string;
    expectedDeliveryDate?: string | Date;
    deliveryLocation?: string;
    status?: OrderStatus;
    items: { itemId: string; quantity: number; priceAtOrder?: number }[];
    createdAt?: string | Date;
    paymentStatus?: PaymentStatus;
    paymentMode?: PaymentMode;
    cashCollectionDetails?: string;
    totalAmount?: number;
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
        if (
          !data.customerName ||
          !data.customerGender ||
          !data.customerLocation
        ) {
          throw new BadRequestException(
            'Customer contact is new. Please provide Name, Gender, and Location to create a profile.',
          );
        }

        customer = new Customer();
        customer.contact = data.customerContact;
        customer.name = data.customerName;
        customer.gender = data.customerGender;
        customer.location = data.customerLocation;
        customer.address = data.customerAddress || null;
        customer = await manager.save(Customer, customer);
      } else {
        // Update customer profile if details have changed
        let changed = false;
        if (data.customerName && customer.name !== data.customerName) {
          customer.name = data.customerName;
          changed = true;
        }
        if (data.customerGender && customer.gender !== data.customerGender) {
          customer.gender = data.customerGender;
          changed = true;
        }
        if (
          data.customerLocation &&
          customer.location !== data.customerLocation
        ) {
          customer.location = data.customerLocation;
          changed = true;
        }
        if (
          data.customerAddress !== undefined &&
          customer.address !== data.customerAddress
        ) {
          customer.address = data.customerAddress || null;
          changed = true;
        }
        if (changed) {
          customer = await manager.save(Customer, customer);
        }
      }

      // 2. Generate Order Number serial sequence KB-XXXXX
      const lastOrder = await manager.findOne(Order, {
        where: {},
        order: { orderNumber: 'DESC' },
      });

      let nextSerial = 10001;
      if (lastOrder && lastOrder.orderNumber.startsWith('KB-')) {
        const lastSerial = parseInt(
          lastOrder.orderNumber.replace('KB-', ''),
          10,
        );
        if (!isNaN(lastSerial)) {
          nextSerial = lastSerial + 1;
        }
      }
      const orderNumber = `KB-${nextSerial}`;

      // 3. Create Order block
      const order = new Order();
      order.orderNumber = orderNumber;
      order.customer = customer;
      order.status = data.status || OrderStatus.PENDING;
      order.paymentStatus = data.paymentStatus || PaymentStatus.UNPAID;
      order.paymentMode = data.paymentMode || null;
      order.cashCollectionDetails =
        data.paymentMode === PaymentMode.CASH
          ? data.cashCollectionDetails || null
          : null;
      order.totalAmount = 0;
      if (data.createdAt) {
        order.createdAt = new Date(data.createdAt);
      }
      if (data.paymentStatus === PaymentStatus.PAID) {
        order.paymentUpdatedAt = data.createdAt
          ? new Date(data.createdAt)
          : new Date();
      }
      if (data.sourceId) {
        let sourceObj = null;
        if (
          data.sourceId.match(
            /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/,
          )
        ) {
          sourceObj = await manager.findOne(OrderSource, {
            where: { id: data.sourceId },
          });
        } else {
          sourceObj = await manager.findOne(OrderSource, {
            where: { name: data.sourceId },
          });
          if (!sourceObj) {
            sourceObj = new OrderSource();
            sourceObj.name = data.sourceId;
            sourceObj = await manager.save(OrderSource, sourceObj);
          }
        }
        if (sourceObj) {
          order.source = sourceObj;
        }
      }
      if (data.fulfillmentHubId) {
        let hubObj = null;
        if (
          data.fulfillmentHubId.match(
            /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/,
          )
        ) {
          hubObj = await manager.findOne(InventoryLocation, {
            where: { id: data.fulfillmentHubId },
          });
        } else {
          hubObj = await manager.findOne(InventoryLocation, {
            where: { name: data.fulfillmentHubId },
          });
          if (!hubObj) {
            hubObj = new InventoryLocation();
            hubObj.name = data.fulfillmentHubId;
            hubObj = await manager.save(InventoryLocation, hubObj);
          }
        }
        if (hubObj) {
          order.fulfillmentHub = hubObj;
        }
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
          throw new BadRequestException(
            `Item with ID ${itemRequest.itemId} not found`,
          );
        }

        let priceAtOrder = 0;
        if (
          itemRequest.priceAtOrder !== undefined &&
          !isNaN(Number(itemRequest.priceAtOrder))
        ) {
          priceAtOrder = parseFloat(itemRequest.priceAtOrder as any);
        } else {
          // Get latest price
          const sortedHistory = [...itemObj.priceHistory].sort(
            (a, b) => b.changedAt.getTime() - a.changedAt.getTime(),
          );

          if (sortedHistory.length === 0) {
            throw new BadRequestException(
              `Item ${itemObj.name} does not have any pricing history log`,
            );
          }

          priceAtOrder = parseFloat(sortedHistory[0].price as any);
        }

        const orderItem = new OrderItem();
        orderItem.order = savedOrder;
        orderItem.item = itemObj;
        orderItem.quantity = itemRequest.quantity;
        orderItem.priceAtOrder = priceAtOrder;

        await manager.save(OrderItem, orderItem);

        totalAmount += priceAtOrder * itemRequest.quantity;
      }

      // Update total amount on order (use override if provided)
      if (data.totalAmount !== undefined && !isNaN(Number(data.totalAmount))) {
        savedOrder.totalAmount = parseFloat(data.totalAmount as any);
      } else {
        savedOrder.totalAmount = Math.round(totalAmount * 100) / 100;
      }
      const finalizedOrder = await manager.save(Order, savedOrder);

      // 5. Add initial Status History log
      const history = new OrderStatusHistory();
      history.order = finalizedOrder;
      history.status = finalizedOrder.status;
      history.changedBy = 'Admin';
      if (data.createdAt) {
        history.changedAt = new Date(data.createdAt);
      }
      await manager.save(OrderStatusHistory, history);

      // 6. Create a pending WhatsApp log for order creation
      const fullOrder = await manager.findOne(Order, {
        where: { id: finalizedOrder.id },
        relations: { customer: true },
      });
      if (fullOrder) {
        const log = new WhatsappLog();
        log.order = fullOrder;
        log.recipientName = fullOrder.customer.name;
        log.recipientContact = process.env.NODE_ENV === 'production' ? fullOrder.customer.contact : (process.env.WHATSAPP_FALLBACK_NUMBER || '919876543210');
        log.triggeringEvent = 'Order Created (Pending)';
        log.status = WhatsappLogStatus.PENDING;
        await manager.save(WhatsappLog, log);
      }

      return finalizedOrder;
    });
  }

  // Update order status with transition logs and WhatsApp triggers
  async updateStatus(
    id: string,
    newStatus: OrderStatus,
    changedBy = 'Admin',
  ): Promise<Order> {
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

    // Create a pending WhatsApp log for the status transition if it's one of the targeted states
    if (newStatus === OrderStatus.PENDING || newStatus === OrderStatus.READY_TO_DELIVER || newStatus === OrderStatus.DELIVERED) {
      let triggeringEvent = '';
      if (newStatus === OrderStatus.PENDING) triggeringEvent = 'Order Created (Pending)';
      else if (newStatus === OrderStatus.READY_TO_DELIVER) triggeringEvent = 'Ready to Deliver';
      else if (newStatus === OrderStatus.DELIVERED) triggeringEvent = 'Order Delivered (Payment Confirmed)';

      const log = new WhatsappLog();
      log.order = updatedOrder;
      log.recipientName = updatedOrder.customer.name;
      log.recipientContact = process.env.NODE_ENV === 'production' ? updatedOrder.customer.contact : (process.env.WHATSAPP_FALLBACK_NUMBER || '919876543210');
      log.triggeringEvent = triggeringEvent;
      log.status = WhatsappLogStatus.PENDING;
      await this.whatsappService.saveLog(log);
    }

    return updatedOrder;
  }

  // Update order payment status and mode
  async updatePayment(
    id: string,
    paymentStatus: PaymentStatus,
    paymentMode?: PaymentMode,
    cashDetails?: string,
  ): Promise<Order> {
    const order = await this.findOne(id);
    order.paymentStatus = paymentStatus;

    if (paymentStatus === PaymentStatus.PAID) {
      order.paymentMode = paymentMode || null;
      order.cashCollectionDetails =
        paymentMode === PaymentMode.CASH ? cashDetails || null : null;
      order.paymentUpdatedAt = new Date();
    } else {
      order.paymentMode = null;
      order.cashCollectionDetails = null;
      order.paymentUpdatedAt = null;
    }

    return this.orderRepository.save(order);
  }

  async getWhatsappUrl(
    id: string,
    status?: OrderStatus,
  ): Promise<{ url: string }> {
    const order = await this.findOne(id);
    const targetStatus = status || order.status;

    let template = '';
    let triggeringEvent = '';
    const customerName = order.customer.name;
    const orderNumber = order.orderNumber;
    const totalAmount = parseFloat(order.totalAmount as any).toFixed(2);

    if (targetStatus === OrderStatus.PENDING) {
      template = `Hi ${customerName}, thank you for ordering with Krunchy Brunchy! Your order #${orderNumber} has been successfully created. Total: Rs. ${totalAmount}.`;
      triggeringEvent = 'Manual Send - Order Created';
    } else if (targetStatus === OrderStatus.READY_TO_DELIVER) {
      template = `Hi ${customerName}, your Krunchy Brunchy order #${orderNumber} has been shipped! Total Amount: Rs. ${totalAmount}.`;
      triggeringEvent = 'Manual Send - Order Shipped';
    } else if (targetStatus === OrderStatus.DELIVERED) {
      template = `Hi ${customerName}, your Krunchy Brunchy order #${orderNumber} has been successfully delivered! Thank you for your purchase. Total: Rs. ${totalAmount}.`;
      triggeringEvent = 'Manual Send - Order Delivered';
    } else if (targetStatus === OrderStatus.PREPARING) {
      template = `Hi ${customerName}, we have started preparing your Krunchy Brunchy order #${orderNumber}! Total: Rs. ${totalAmount}.`;
      triggeringEvent = 'Manual Send - Order Preparing';
    } else {
      template = `Hi ${customerName}, updating you regarding your Krunchy Brunchy order #${orderNumber}. Total: Rs. ${totalAmount}.`;
      triggeringEvent = `Manual Send - ${targetStatus}`;
    }

    const nodeEnv = process.env.NODE_ENV || 'development';
    const fallbackNumber = process.env.WHATSAPP_FALLBACK_NUMBER || '919876543210';
    const isProduction = nodeEnv === 'production';
    const rawNumber = isProduction ? order.customer.contact : fallbackNumber;
    const cleanedNumber = rawNumber.replace(/\D/g, '');

    const encodedMessage = encodeURIComponent(template);
    const url = `https://wa.me/${cleanedNumber}?text=${encodedMessage}`;

    // Check if there is an existing Pending log for this status transition
    let pendingTriggerEvent = '';
    if (targetStatus === OrderStatus.PENDING) pendingTriggerEvent = 'Order Created (Pending)';
    else if (targetStatus === OrderStatus.READY_TO_DELIVER) pendingTriggerEvent = 'Ready to Deliver';
    else if (targetStatus === OrderStatus.DELIVERED) pendingTriggerEvent = 'Order Delivered (Payment Confirmed)';

    let log = null;
    if (pendingTriggerEvent) {
      log = await this.dataSource.getRepository(WhatsappLog).findOne({
        where: {
          order: { id: order.id },
          triggeringEvent: pendingTriggerEvent,
          status: WhatsappLogStatus.PENDING,
        },
      });
    }

    if (log) {
      log.status = WhatsappLogStatus.SENT;
      log.recipientContact = rawNumber;
      log.timestamp = new Date();
    } else {
      log = new WhatsappLog();
      log.order = order;
      log.recipientName = order.customer.name;
      log.recipientContact = rawNumber;
      log.triggeringEvent = triggeringEvent;
      log.status = WhatsappLogStatus.SENT;
    }
    await this.whatsappService.saveLog(log);

    return { url };
  }

  // Fetch financial metrics for the revenue dashboard
  async getRevenueMetrics(query?: {
    startDate?: string;
    endDate?: string;
    type?: 'daily' | 'monthly' | 'quarterly' | 'yearly';
    paymentMode?: PaymentMode;
    paymentStatus?: PaymentStatus;
  }) {
    const now = new Date();
    // Default to current month if dates are not provided
    const start = query?.startDate
      ? new Date(query.startDate)
      : new Date(now.getFullYear(), now.getMonth(), 1);
    const end = query?.endDate
      ? new Date(query.endDate)
      : new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    if (query?.endDate) {
      end.setHours(23, 59, 59, 999);
    }

    let paidOrders: Order[] = [];
    let unpaidOrders: Order[] = [];

    // Query paid orders if paymentStatus is not Unpaid
    if (!query?.paymentStatus || query.paymentStatus === PaymentStatus.PAID) {
      const qbPaid = this.orderRepository
        .createQueryBuilder('order')
        .leftJoin('order.customer', 'customer')
        .select([
          'order.id',
          'order.orderNumber',
          'order.totalAmount',
          'order.paymentMode',
          'order.cashCollectionDetails',
          'order.paymentUpdatedAt',
          'customer.name',
        ])
        .where('order.paymentStatus = :paidStatus', {
          paidStatus: PaymentStatus.PAID,
        })
        .andWhere('order.paymentUpdatedAt BETWEEN :start AND :end', {
          start,
          end,
        });

      if (query?.paymentMode) {
        qbPaid.andWhere('order.paymentMode = :paymentMode', {
          paymentMode: query.paymentMode,
        });
      }

      paidOrders = await qbPaid
        .orderBy('order.paymentUpdatedAt', 'DESC')
        .getMany();
    }

    // Query unpaid orders if paymentStatus is not Paid
    if (!query?.paymentStatus || query.paymentStatus === PaymentStatus.UNPAID) {
      const qbUnpaid = this.orderRepository
        .createQueryBuilder('order')
        .select([
          'order.id',
          'order.totalAmount',
          'order.createdAt',
        ])
        .where('order.paymentStatus = :unpaidStatus', {
          unpaidStatus: PaymentStatus.UNPAID,
        })
        .andWhere('order.createdAt BETWEEN :start AND :end', {
          start,
          end,
        });

      if (query?.paymentMode) {
        qbUnpaid.andWhere('order.paymentMode = :paymentMode', {
          paymentMode: query.paymentMode,
        });
      }

      unpaidOrders = await qbUnpaid.getMany();
    }

    const totalPaidRevenue = paidOrders.reduce(
      (sum, o) => sum + Number(o.totalAmount),
      0,
    );
    const totalPendingRevenue = unpaidOrders.reduce(
      (sum, o) => sum + Number(o.totalAmount),
      0,
    );

    const modeBreakdown: Record<string, number> = {};
    paidOrders.forEach((o) => {
      const mode = o.paymentMode || 'Unknown';
      modeBreakdown[mode] = (modeBreakdown[mode] || 0) + Number(o.totalAmount);
    });

    const cashLogs = paidOrders.map((o) => ({
      orderId: o.id,
      orderNumber: o.orderNumber,
      customerName: o.customer?.name || 'Walk-in',
      amount: o.totalAmount,
      collectedAt: o.cashCollectionDetails || 'N/A',
      timestamp: o.paymentUpdatedAt,
    }));

    // Grouping timelines
    const dailyData: Record<string, number> = {};
    const monthlyData: Record<string, number> = {};
    const quarterlyData: Record<string, number> = {};
    const yearlyData: Record<string, number> = {};

    paidOrders.forEach((o) => {
      if (o.paymentUpdatedAt) {
        const date = new Date(o.paymentUpdatedAt);
        const amount = Number(o.totalAmount);

        // Daily
        const dateStr = date.toLocaleDateString();
        dailyData[dateStr] = (dailyData[dateStr] || 0) + amount;

        // Monthly
        const monthStr = date.toLocaleString('en-US', { month: 'short', year: 'numeric' });
        monthlyData[monthStr] = (monthlyData[monthStr] || 0) + amount;

        // Quarterly
        const quarter = Math.floor(date.getMonth() / 3) + 1;
        const quarterStr = `${date.getFullYear()} Q${quarter}`;
        quarterlyData[quarterStr] = (quarterlyData[quarterStr] || 0) + amount;

        // Yearly
        const yearStr = `${date.getFullYear()}`;
        yearlyData[yearStr] = (yearlyData[yearStr] || 0) + amount;
      }
    });

    // 1. Daily timeline (within range, up to 366 days, or last 30 days of the range)
    const dailyTimeline: { date: string; revenue: number }[] = [];
    if (!query?.type || query.type === 'daily') {
      const startDay = new Date(start);
      const endDay = new Date(end);
      
      const diffTime = Math.abs(endDay.getTime() - startDay.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays <= 366) {
        for (let d = new Date(startDay); d <= endDay; d.setDate(d.getDate() + 1)) {
          const dateStr = d.toLocaleDateString();
          dailyTimeline.push({
            date: dateStr,
            revenue: dailyData[dateStr] || 0,
          });
        }
      } else {
        // Range too large: default to last 30 days of the range
        const startLimit = new Date(endDay.getTime() - 29 * 24 * 60 * 60 * 1000);
        for (let d = new Date(startLimit); d <= endDay; d.setDate(d.getDate() + 1)) {
          const dateStr = d.toLocaleDateString();
          dailyTimeline.push({
            date: dateStr,
            revenue: dailyData[dateStr] || 0,
          });
        }
      }
    }

    // 2. Monthly timeline
    const monthlyTimeline: { date: string; revenue: number }[] = [];
    if (!query?.type || query.type === 'monthly') {
      const list = Object.keys(monthlyData)
        .map((key) => ({ name: key, date: new Date(key), revenue: monthlyData[key] }))
        .sort((a, b) => a.date.getTime() - b.date.getTime())
        .map((item) => ({ date: item.name, revenue: item.revenue }));
      monthlyTimeline.push(...list);
    }

    // 3. Quarterly timeline
    const quarterlyTimeline: { date: string; revenue: number }[] = [];
    if (!query?.type || query.type === 'quarterly') {
      const list = Object.keys(quarterlyData)
        .sort()
        .map((key) => ({ date: key, revenue: quarterlyData[key] }));
      quarterlyTimeline.push(...list);
    }

    // 4. Yearly timeline
    const yearlyTimeline: { date: string; revenue: number }[] = [];
    if (!query?.type || query.type === 'yearly') {
      const list = Object.keys(yearlyData)
        .sort()
        .map((key) => ({ date: key, revenue: yearlyData[key] }));
      yearlyTimeline.push(...list);
    }

    return {
      totalPaidRevenue,
      totalPendingRevenue,
      modeBreakdown,
      cashLogs,
      timeline: {
        daily: dailyTimeline,
        monthly: monthlyTimeline,
        quarterly: quarterlyTimeline,
        yearly: yearlyTimeline,
      },
    };
  }

  // Paginated revenue report details with filters
  async getRevenueDetails(query: {
    page?: number;
    limit?: number;
    startDate?: string;
    endDate?: string;
    paymentMode?: PaymentMode;
    paymentStatus?: PaymentStatus;
  }): Promise<{ data: Order[]; total: number }> {
    const page = query.page ? Number(query.page) : 1;
    const limit = query.limit ? Number(query.limit) : 10;
    const skip = (page - 1) * limit;

    const qb = this.orderRepository
      .createQueryBuilder('order')
      .leftJoinAndSelect('order.customer', 'customer')
      .leftJoinAndSelect('order.fulfillmentHub', 'fulfillmentHub');

    if (query.paymentStatus) {
      qb.andWhere('order.paymentStatus = :paymentStatus', {
        paymentStatus: query.paymentStatus,
      });
    }

    if (query.paymentMode) {
      qb.andWhere('order.paymentMode = :paymentMode', {
        paymentMode: query.paymentMode,
      });
    }

    const now = new Date();
    const start = query.startDate
      ? new Date(query.startDate)
      : new Date(now.getFullYear(), now.getMonth(), 1);
    const end = query.endDate
      ? new Date(query.endDate)
      : new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    if (query.endDate) {
      end.setHours(23, 59, 59, 999);
    }

    qb.andWhere(
      '((order.paymentStatus = :paidStatus AND order.paymentUpdatedAt BETWEEN :start AND :end) OR (order.paymentStatus = :unpaidStatus AND order.createdAt BETWEEN :start AND :end))',
      {
        paidStatus: PaymentStatus.PAID,
        unpaidStatus: PaymentStatus.UNPAID,
        start,
        end,
      },
    );

    qb.orderBy('order.createdAt', 'DESC');
    qb.skip(skip).take(limit);

    const [data, total] = await qb.getManyAndCount();
    return { data, total };
  }

  async importOrders(
    csvText: string,
  ): Promise<{ successCount: number; errors: string[] }> {
    const lines = csvText
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l.length > 0);
    if (lines.length < 2) {
      return {
        successCount: 0,
        errors: ['CSV content is empty or contains no data rows'],
      };
    }

    const parseCSVLine = (line: string): string[] => {
      const row: string[] = [];
      let insideQuote = false;
      let entry = '';
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
          insideQuote = !insideQuote;
        } else if (char === ',' && !insideQuote) {
          row.push(entry.trim());
          entry = '';
        } else {
          entry += char;
        }
      }
      row.push(entry.trim());
      return row;
    };

    const headers = parseCSVLine(lines[0]).map((h) =>
      h.toLowerCase().replace(/[\s_]+/g, ''),
    );
    const headerIndices: Record<string, number> = {};
    headers.forEach((h, idx) => {
      headerIndices[h] = idx;
    });

    const getVal = (row: string[], key: string): string => {
      const idx = headerIndices[key];
      if (idx === undefined || idx >= row.length) return '';
      return row[idx];
    };

    const errors: string[] = [];
    let successCount = 0;

    for (let rowIndex = 1; rowIndex < lines.length; rowIndex++) {
      const row = parseCSVLine(lines[rowIndex]);
      if (row.length === 0 || (row.length === 1 && !row[0])) continue;

      const orderNumber = getVal(row, 'ordernumber');
      const orderDateStr = getVal(row, 'orderdate');
      const name = getVal(row, 'customername');
      const contact = getVal(row, 'customercontact');
      const gender = getVal(row, 'customergender');
      const location = getVal(row, 'customerlocation');
      const address = getVal(row, 'customeraddress');
      const sourceName = getVal(row, 'ordersource');
      const hubName = getVal(row, 'fulfillmenthub');
      const expectedDeliveryDateStr = getVal(row, 'expecteddeliverydate');
      const deliveryLocation = getVal(row, 'deliverylocation');
      const itemsStr = getVal(row, 'items');
      const totalAmountStr = getVal(row, 'totalamount');
      const orderStatusStr = getVal(row, 'orderstatus');
      const paymentStatusStr = getVal(row, 'paymentstatus');
      const paymentModeStr = getVal(row, 'paymentmode');
      const cashDetails = getVal(row, 'cashcollectiondetails');

      const label = `Row ${rowIndex + 1} (${orderNumber || contact || 'Unknown'}): `;

      if (
        !name ||
        !contact ||
        !location ||
        !sourceName ||
        !deliveryLocation ||
        !itemsStr ||
        !orderStatusStr ||
        !paymentStatusStr
      ) {
        errors.push(
          `${label}Missing required columns (Customer Name, Contact, Location, Order Source, Delivery Location, Items, Order Status, and Payment Status are required)`,
        );
        continue;
      }

      let status: OrderStatus;
      if (
        Object.values(OrderStatus)
          .map((v) => v.toLowerCase())
          .includes(orderStatusStr.toLowerCase())
      ) {
        status = Object.values(OrderStatus).find(
          (v) => v.toLowerCase() === orderStatusStr.toLowerCase(),
        ) as OrderStatus;
      } else {
        errors.push(`${label}Invalid Order Status '${orderStatusStr}'`);
        continue;
      }

      let paymentStatus: PaymentStatus;
      if (paymentStatusStr.toLowerCase() === 'paid') {
        paymentStatus = PaymentStatus.PAID;
      } else if (paymentStatusStr.toLowerCase() === 'unpaid') {
        paymentStatus = PaymentStatus.UNPAID;
      } else {
        errors.push(
          `${label}Invalid Payment Status '${paymentStatusStr}' (must be Paid or Unpaid)`,
        );
        continue;
      }

      let paymentMode: PaymentMode | null = null;
      if (paymentStatus === PaymentStatus.PAID && paymentModeStr) {
        if (
          Object.values(PaymentMode)
            .map((v) => v.toLowerCase())
            .includes(paymentModeStr.toLowerCase())
        ) {
          paymentMode = Object.values(PaymentMode).find(
            (v) => v.toLowerCase() === paymentModeStr.toLowerCase(),
          ) as PaymentMode;
        } else {
          errors.push(`${label}Invalid Payment Mode '${paymentModeStr}'`);
          continue;
        }
      }

      let customerGender: Gender = Gender.MALE;
      if (gender.toLowerCase() === 'female') {
        customerGender = Gender.FEMALE;
      } else if (gender.toLowerCase() === 'other') {
        customerGender = Gender.OTHER;
      }

      const itemsList: { itemId: string; name: string; quantity: number }[] =
        [];
      const itemsParts = itemsStr.split(',').map((p) => p.trim());
      let itemsError = false;

      for (const part of itemsParts) {
        const colonIdx = part.lastIndexOf(':');
        if (colonIdx === -1) {
          errors.push(
            `${label}Invalid Items format. Expected ItemName:Quantity`,
          );
          itemsError = true;
          break;
        }
        const itemName = part.substring(0, colonIdx).trim();
        const qtyVal = parseInt(part.substring(colonIdx + 1).trim(), 10);
        if (!itemName || isNaN(qtyVal) || qtyVal <= 0) {
          errors.push(`${label}Invalid Item Name or quantity in '${part}'`);
          itemsError = true;
          break;
        }

        const itemObj = await this.itemRepository.findOne({
          where: { name: Like(`%${itemName}%`) },
        });
        if (!itemObj) {
          errors.push(
            `${label}Item '${itemName}' not found in Snacking Catalog`,
          );
          itemsError = true;
          break;
        }

        itemsList.push({
          itemId: itemObj.id,
          name: itemObj.name,
          quantity: qtyVal,
        });
      }

      if (itemsError) continue;

      try {
        await this.dataSource.transaction(async (manager) => {
          let customer = await manager.findOne(Customer, {
            where: { contact },
          });
          if (!customer) {
            customer = new Customer();
            customer.contact = contact;
            customer.name = name;
            customer.gender = customerGender;
            customer.location = location;
            customer.address = address || null;
            customer = await manager.save(Customer, customer);
          } else {
            let customerChanged = false;
            if (name && customer.name !== name) {
              customer.name = name;
              customerChanged = true;
            }
            if (address !== undefined && customer.address !== address) {
              customer.address = address || null;
              customerChanged = true;
            }
            if (location && customer.location !== location) {
              customer.location = location;
              customerChanged = true;
            }
            if (customerChanged) {
              customer = await manager.save(Customer, customer);
            }
          }

          let sourceObj = await manager.findOne(OrderSource, {
            where: { name: Like(`%${sourceName}%`) },
          });
          if (!sourceObj) {
            sourceObj = new OrderSource();
            sourceObj.name = sourceName;
            sourceObj = await manager.save(OrderSource, sourceObj);
          }

          let hubObj = null;
          if (hubName) {
            hubObj = await manager.findOne(InventoryLocation, {
              where: { name: Like(`%${hubName}%`) },
            });
          }
          if (!hubObj) {
            hubObj = await manager.findOne(InventoryLocation, {
              order: { name: 'ASC' },
            });
          }

          let resolvedOrderNumber = orderNumber;
          if (resolvedOrderNumber) {
            const existingOrder = await manager.findOne(Order, {
              where: { orderNumber: resolvedOrderNumber },
            });
            if (existingOrder) {
              throw new Error(
                `Order Number '${resolvedOrderNumber}' already exists`,
              );
            }
          } else {
            const lastOrder = await manager.findOne(Order, {
              where: {},
              order: { orderNumber: 'DESC' },
            });
            let nextSerial = 10001;
            if (lastOrder && lastOrder.orderNumber.startsWith('KB-')) {
              const lastSerial = parseInt(
                lastOrder.orderNumber.replace('KB-', ''),
                10,
              );
              if (!isNaN(lastSerial)) {
                nextSerial = lastSerial + 1;
              }
            }
            resolvedOrderNumber = `KB-${nextSerial}`;
          }

          const order = new Order();
          order.orderNumber = resolvedOrderNumber;
          order.customer = customer;
          order.status = status;
          order.paymentStatus = paymentStatus;
          order.paymentMode = paymentMode;
          order.cashCollectionDetails =
            paymentMode === PaymentMode.CASH ? cashDetails || null : null;
          order.source = sourceObj;
          order.fulfillmentHub = hubObj;

          if (orderDateStr) {
            order.createdAt = new Date(orderDateStr);
          }
          if (expectedDeliveryDateStr) {
            order.expectedDeliveryDate = new Date(expectedDeliveryDateStr);
          }
          if (deliveryLocation) {
            order.deliveryLocation = deliveryLocation;
          }
          if (paymentStatus === PaymentStatus.PAID) {
            order.paymentUpdatedAt = orderDateStr
              ? new Date(orderDateStr)
              : new Date();
          }

          order.totalAmount = 0;
          const savedOrder = await manager.save(Order, order);

          let totalAmount = 0;
          for (const itemReq of itemsList) {
            const itemObj = await manager.findOne(Item, {
              where: { id: itemReq.itemId },
              relations: { priceHistory: true },
            });
            if (!itemObj) throw new Error(`Item ${itemReq.name} not found`);

            const sortedHistory = [...itemObj.priceHistory].sort(
              (a, b) => b.changedAt.getTime() - a.changedAt.getTime(),
            );
            const priceAtOrder =
              sortedHistory.length > 0
                ? parseFloat(sortedHistory[0].price as any)
                : 0;

            const orderItem = new OrderItem();
            orderItem.order = savedOrder;
            orderItem.item = itemObj;
            orderItem.quantity = itemReq.quantity;
            orderItem.priceAtOrder = priceAtOrder;
            await manager.save(OrderItem, orderItem);

            totalAmount += priceAtOrder * itemReq.quantity;
          }

          if (totalAmountStr && !isNaN(parseFloat(totalAmountStr))) {
            savedOrder.totalAmount = parseFloat(totalAmountStr);
          } else {
            savedOrder.totalAmount = Math.round(totalAmount * 100) / 100;
          }
          const finalizedOrder = await manager.save(Order, savedOrder);

          const history = new OrderStatusHistory();
          history.order = finalizedOrder;
          history.status = status;
          history.changedBy = 'Import Manager';
          if (orderDateStr) {
            history.changedAt = new Date(orderDateStr);
          }
          await manager.save(OrderStatusHistory, history);
        });

        successCount++;
      } catch (err: any) {
        errors.push(`${label}${err.message || err}`);
      }
    }

    return { successCount, errors };
  }
}
