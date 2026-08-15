import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  Repository,
  DataSource,
  Between,
  Like,
  ILike,
  IsNull,
  Brackets,
} from 'typeorm';
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

/**
 * Helper: resolves active price history entry for an order date.
 * Tries to find latest entry on or before order creation date.
 * Fallback: if all entries are dated after order date (e.g. backdated orders or initial data timing),
 * returns the earliest recorded price history entry.
 */
function findActivePriceHistoryForOrder(
  priceHistory: ItemPriceHistory[] | undefined,
  orderCreatedAt: Date,
): ItemPriceHistory | undefined {
  if (!priceHistory || priceHistory.length === 0) return undefined;

  const sorted = [...priceHistory].sort(
    (a, b) =>
      new Date(b.changedAt).getTime() - new Date(a.changedAt).getTime(),
  );

  const matchOnOrBefore = sorted.find(
    (h) => new Date(h.changedAt).getTime() <= new Date(orderCreatedAt).getTime(),
  );

  if (matchOnOrBefore) return matchOnOrBefore;

  // Fallback to earliest entry
  return sorted[sorted.length - 1];
}

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
        new Brackets((subQb) => {
          subQb.where('order.status IN (:...activeStatuses)', {
            activeStatuses: [
              OrderStatus.PENDING,
              OrderStatus.PREPARING,
              OrderStatus.READY_TO_DELIVER,
            ],
          }).orWhere(
            '(order.status IN (:...terminalStatuses) AND order.updatedAt >= :cutoffDate)',
            {
              terminalStatuses: [OrderStatus.DELIVERED, OrderStatus.CANCELLED],
              cutoffDate,
            },
          );
        }),
      );
    } else {
      if (query.startDate && query.endDate) {
        const start = new Date(query.startDate);
        const end = new Date(query.endDate);
        end.setHours(23, 59, 59, 999);
        qb.andWhere('order.createdAt BETWEEN :start AND :end', { start, end });
      }
    }

    if (query.search) {
      const searchTerm = `%${query.search}%`;
      qb.andWhere(
        '(order.orderNumber ILIKE :search OR customer.name ILIKE :search OR customer.contact ILIKE :search)',
        { search: searchTerm },
      );
    }

    const sortField = query.sortBy || 'createdAt';
    const sortOrder = query.sortOrder || 'DESC';

    if (sortField === 'customerName') {
      qb.orderBy('customer.name', sortOrder);
    } else {
      qb.orderBy(`order.${sortField}`, sortOrder);
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
      },
      order: {
        statusHistory: {
          changedAt: 'ASC',
        },
      },
    });

    if (!order) {
      throw new NotFoundException(`Order with ID ${id} not found`);
    }

    return order;
  }

  // Atomic Order Upsert Transaction
  async create(data: {
    customerContact?: string;
    noContact?: boolean;
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

    const contact = data.customerContact?.trim() || null;
    if (!contact && !data.noContact) {
      throw new BadRequestException(
        'Customer Contact is required. Mark "Phone number not available" to create this order without one.',
      );
    }

    // Run within a database transaction block
    return this.dataSource.transaction(async (manager) => {
      // 1. Resolve or Create Customer (Atomic Upsert)
      let customer = contact
        ? await manager.findOne(Customer, { where: { contact } })
        : await manager.findOne(Customer, {
            where: {
              contact: IsNull(),
              name: ILike((data.customerName || '').trim()),
            },
          });

      if (!customer) {
        if (
          !data.customerName ||
          !data.customerGender ||
          !data.customerLocation
        ) {
          throw new BadRequestException(
            contact
              ? 'Customer contact is new. Please provide Name, Gender, and Location to create a profile.'
              : 'No phone number provided. Please provide Name, Gender, and Location to create a profile.',
          );
        }

        customer = new Customer();
        customer.contact = contact;
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

      if (data.totalAmount !== undefined && !isNaN(Number(data.totalAmount))) {
        savedOrder.totalAmount = parseFloat(data.totalAmount as any);
      } else {
        savedOrder.totalAmount = Math.round(totalAmount * 100) / 100;
      }
      const finalizedOrder = await manager.save(Order, savedOrder);

      const history = new OrderStatusHistory();
      history.order = finalizedOrder;
      history.status = finalizedOrder.status;
      history.changedBy = 'Admin';
      if (data.createdAt) {
        history.changedAt = new Date(data.createdAt);
      }
      await manager.save(OrderStatusHistory, history);

      const fullOrder = await manager.findOne(Order, {
        where: { id: finalizedOrder.id },
        relations: { customer: true },
      });
      const isProduction = process.env.NODE_ENV === 'production';
      const customerContactForLog = fullOrder?.customer.contact ?? null;
      if (fullOrder && (customerContactForLog || !isProduction)) {
        const log = new WhatsappLog();
        log.order = fullOrder;
        log.recipientName = fullOrder.customer.name;
        log.recipientContact = isProduction
          ? (customerContactForLog as string)
          : process.env.WHATSAPP_FALLBACK_NUMBER || '919876543210';
        log.triggeringEvent = 'Order Created (Pending)';
        log.status = WhatsappLogStatus.PENDING;
        await manager.save(WhatsappLog, log);
      }

      return finalizedOrder;
    });
  }

  async updateStatus(
    id: string,
    newStatus: OrderStatus,
    changedBy: string = 'Admin',
  ): Promise<Order> {
    const order = await this.findOne(id);
    order.status = newStatus;
    await this.orderRepository.save(order);

    const history = this.statusHistoryRepository.create({
      order,
      status: newStatus,
      changedBy,
    });
    await this.statusHistoryRepository.save(history);

    if (
      [
        OrderStatus.PENDING,
        OrderStatus.READY_TO_DELIVER,
        OrderStatus.DELIVERED,
      ].includes(newStatus)
    ) {
      const eventMap: Record<string, string> = {
        [OrderStatus.PENDING]: 'Order Created (Pending)',
        [OrderStatus.READY_TO_DELIVER]: 'Order Ready to Deliver',
        [OrderStatus.DELIVERED]: 'Order Delivered',
      };
      await this.whatsappService.triggerNotification(order, eventMap[newStatus]);
    }

    return this.findOne(id);
  }

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

  /** Comprehensive Order Update Method */
  async updateFullOrder(
    id: string,
    data: {
      customerContact?: string;
      customerName?: string;
      customerGender?: Gender;
      customerLocation?: string;
      customerAddress?: string;
      sourceId?: string | null;
      fulfillmentHubId?: string | null;
      expectedDeliveryDate?: string | Date | null;
      deliveryLocation?: string | null;
      status?: OrderStatus;
      createdAt?: string | Date;
      paymentStatus?: PaymentStatus;
      paymentMode?: PaymentMode | null;
      paymentUpdatedAt?: string | Date | null;
      cashCollectionDetails?: string | null;
      totalAmount?: number;
      items?: { itemId: string; quantity: number; priceAtOrder?: number }[];
      statusHistoryTimestamps?: { id?: string; status: OrderStatus; changedAt: string | Date; changedBy?: string }[];
    },
  ): Promise<Order> {
    return this.dataSource.transaction(async (manager) => {
      const order = await manager.findOne(Order, {
        where: { id },
        relations: {
          customer: true,
          source: true,
          fulfillmentHub: true,
          items: { item: true },
          statusHistory: true,
        },
      });

      if (!order) {
        throw new NotFoundException(`Order with ID ${id} not found`);
      }

      // 1. Update Customer Details if provided
      if (
        data.customerContact ||
        data.customerName ||
        data.customerGender ||
        data.customerLocation ||
        data.customerAddress !== undefined
      ) {
        let customer = order.customer;
        const nextContact = data.customerContact?.trim();
        if (nextContact && customer.contact !== nextContact) {
          const existingContactCust = await manager.findOne(Customer, {
            where: { contact: nextContact },
          });
          if (existingContactCust) {
            customer = existingContactCust;
          } else {
            customer.contact = nextContact;
          }
        }
        if (data.customerName) customer.name = data.customerName;
        if (data.customerGender) customer.gender = data.customerGender;
        if (data.customerLocation) customer.location = data.customerLocation;
        if (data.customerAddress !== undefined)
          customer.address = data.customerAddress || null;

        await manager.save(Customer, customer);
        order.customer = customer;
      }

      // 2. Update Order Timestamps & Core Info
      if (data.createdAt) {
        order.createdAt = new Date(data.createdAt);
      }
      if (data.expectedDeliveryDate !== undefined) {
        order.expectedDeliveryDate = data.expectedDeliveryDate
          ? new Date(data.expectedDeliveryDate)
          : null;
      }
      if (data.deliveryLocation !== undefined) {
        order.deliveryLocation = data.deliveryLocation || null;
      }
      if (data.status) {
        order.status = data.status;
      }

      // 3. Update Payment Info & Payment Received Date
      if (data.paymentStatus) {
        order.paymentStatus = data.paymentStatus;
      }
      if (data.paymentMode !== undefined) {
        order.paymentMode = data.paymentMode || null;
      }
      if (data.cashCollectionDetails !== undefined) {
        order.cashCollectionDetails = data.cashCollectionDetails || null;
      }
      if (data.paymentUpdatedAt !== undefined) {
        order.paymentUpdatedAt = data.paymentUpdatedAt
          ? new Date(data.paymentUpdatedAt)
          : null;
      } else if (
        data.paymentStatus === PaymentStatus.PAID &&
        !order.paymentUpdatedAt
      ) {
        order.paymentUpdatedAt = data.createdAt
          ? new Date(data.createdAt)
          : new Date();
      }

      // 4. Update Source & Fulfillment Hub
      if (data.sourceId !== undefined) {
        if (!data.sourceId) {
          order.source = null;
        } else if (
          data.sourceId.match(
            /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/,
          )
        ) {
          order.source = await manager.findOne(OrderSource, {
            where: { id: data.sourceId },
          });
        } else {
          let sourceObj = await manager.findOne(OrderSource, {
            where: { name: data.sourceId },
          });
          if (!sourceObj) {
            sourceObj = new OrderSource();
            sourceObj.name = data.sourceId;
            sourceObj = await manager.save(OrderSource, sourceObj);
          }
          order.source = sourceObj;
        }
      }

      if (data.fulfillmentHubId !== undefined) {
        if (!data.fulfillmentHubId) {
          order.fulfillmentHub = null;
        } else if (
          data.fulfillmentHubId.match(
            /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/,
          )
        ) {
          order.fulfillmentHub = await manager.findOne(InventoryLocation, {
            where: { id: data.fulfillmentHubId },
          });
        } else {
          let hubObj = await manager.findOne(InventoryLocation, {
            where: { name: data.fulfillmentHubId },
          });
          if (!hubObj) {
            hubObj = new InventoryLocation();
            hubObj.name = data.fulfillmentHubId;
            hubObj = await manager.save(InventoryLocation, hubObj);
          }
          order.fulfillmentHub = hubObj;
        }
      }

      // 5. Update Status Transition Timestamps (`statusHistory`)
      if (
        data.statusHistoryTimestamps &&
        Array.isArray(data.statusHistoryTimestamps)
      ) {
        for (const item of data.statusHistoryTimestamps) {
          if (item.id) {
            const histRecord = await manager.findOne(OrderStatusHistory, {
              where: { id: item.id },
            });
            if (histRecord) {
              histRecord.changedAt = new Date(item.changedAt);
              if (item.changedBy) histRecord.changedBy = item.changedBy;
              await manager.save(OrderStatusHistory, histRecord);
            }
          } else {
            const histRecord = new OrderStatusHistory();
            histRecord.order = order;
            histRecord.status = item.status;
            histRecord.changedAt = new Date(item.changedAt);
            histRecord.changedBy = item.changedBy || 'Admin';
            await manager.save(OrderStatusHistory, histRecord);
          }
        }
      }

      // 6. Update Items & Prices
      if (data.items && Array.isArray(data.items)) {
        await manager.delete(OrderItem, { order: { id: order.id } });
        let calculatedTotal = 0;
        for (const itemReq of data.items) {
          const itemObj = await manager.findOne(Item, {
            where: { id: itemReq.itemId },
            relations: { priceHistory: true },
          });

          if (!itemObj) {
            throw new BadRequestException(
              `Item with ID ${itemReq.itemId} not found`,
            );
          }

          let priceAtOrder = 0;
          if (
            itemReq.priceAtOrder !== undefined &&
            !isNaN(Number(itemReq.priceAtOrder))
          ) {
            priceAtOrder = parseFloat(itemReq.priceAtOrder as any);
          } else {
            const sortedHistory = [...itemObj.priceHistory].sort(
              (a, b) =>
                new Date(b.changedAt).getTime() -
                new Date(a.changedAt).getTime(),
            );
            priceAtOrder =
              sortedHistory.length > 0
                ? parseFloat(sortedHistory[0].price as any)
                : 0;
          }

          const orderItem = new OrderItem();
          orderItem.order = order;
          orderItem.item = itemObj;
          orderItem.quantity = itemReq.quantity;
          orderItem.priceAtOrder = priceAtOrder;
          await manager.save(OrderItem, orderItem);

          calculatedTotal += priceAtOrder * itemReq.quantity;
        }

        if (
          data.totalAmount !== undefined &&
          !isNaN(Number(data.totalAmount))
        ) {
          order.totalAmount = parseFloat(data.totalAmount as any);
        } else {
          order.totalAmount = Math.round(calculatedTotal * 100) / 100;
        }
      } else if (
        data.totalAmount !== undefined &&
        !isNaN(Number(data.totalAmount))
      ) {
        order.totalAmount = parseFloat(data.totalAmount as any);
      }

      await manager.save(Order, order);
      return this.findOne(id);
    });
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
    if (isProduction && !order.customer.contact) {
      throw new BadRequestException(
        'This customer has no phone number on file, so a WhatsApp message cannot be sent.',
      );
    }
    const rawNumber: string = isProduction
      ? (order.customer.contact as string)
      : fallbackNumber;
    const cleanedNumber = rawNumber.replace(/\D/g, '');

    const encodedMessage = encodeURIComponent(template);
    const url = `https://wa.me/${cleanedNumber}?text=${encodedMessage}`;

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

  async getRevenueMetrics(query?: {
    startDate?: string;
    endDate?: string;
    type?: 'daily' | 'monthly' | 'quarterly' | 'yearly';
    paymentMode?: PaymentMode;
    paymentStatus?: PaymentStatus;
  }) {
    const now = new Date();
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
          'order.createdAt',
          'customer.name',
        ])
        .where('order.paymentStatus = :paidStatus', {
          paidStatus: PaymentStatus.PAID,
        })
        .andWhere(
          'COALESCE(order.paymentUpdatedAt, order.createdAt) BETWEEN :start AND :end',
          { start, end },
        );

      if (query?.paymentMode) {
        qbPaid.andWhere('order.paymentMode = :paymentMode', {
          paymentMode: query.paymentMode,
        });
      }

      paidOrders = await qbPaid
        .orderBy('COALESCE(order.paymentUpdatedAt, order.createdAt)', 'DESC')
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
      timestamp: o.paymentUpdatedAt || o.createdAt,
    }));

    // ── Pre-calculate per-order cost ──────────────────────────────────────────
    const paidOrderIds = paidOrders.map((o) => o.id);
    const orderCostMap = new Map<string, number>();
    let totalCost: number | null = null;
    let overallCostSum = 0;
    let hasAnyCost = false;

    if (paidOrderIds.length > 0) {
      const ordersWithItems = await this.orderRepository
        .createQueryBuilder('order')
        .leftJoinAndSelect('order.items', 'orderItem')
        .leftJoinAndSelect('orderItem.item', 'item')
        .leftJoinAndSelect('item.priceHistory', 'priceHistory')
        .where('order.id IN (:...ids)', { ids: paidOrderIds })
        .getMany();

      for (const order of ordersWithItems) {
        let orderCost = 0;
        let orderHasCost = false;
        for (const oi of order.items ?? []) {
          const activeAtOrder = findActivePriceHistoryForOrder(
            oi.item?.priceHistory,
            order.createdAt,
          );
          if (
            activeAtOrder?.costPrice !== null &&
            activeAtOrder?.costPrice !== undefined
          ) {
            hasAnyCost = true;
            orderHasCost = true;
            orderCost +=
              parseFloat(activeAtOrder.costPrice as any) * oi.quantity;
          }
        }
        if (orderHasCost) {
          orderCostMap.set(order.id, orderCost);
          overallCostSum += orderCost;
        }
      }

      if (hasAnyCost) totalCost = parseFloat(overallCostSum.toFixed(2));
    }

    const totalGrossProfit =
      totalCost !== null
        ? parseFloat((totalPaidRevenue - totalCost).toFixed(2))
        : null;
    const overallMarginPercent =
      totalCost !== null && totalPaidRevenue > 0
        ? parseFloat(
            (((totalPaidRevenue - totalCost) / totalPaidRevenue) * 100).toFixed(2),
          )
        : null;

    // Grouping timelines (Revenue & Cost)
    const dailyData: Record<string, { revenue: number; cost: number }> = {};
    const monthlyData: Record<string, { revenue: number; cost: number }> = {};
    const quarterlyData: Record<string, { revenue: number; cost: number }> = {};
    const yearlyData: Record<string, { revenue: number; cost: number }> = {};

    paidOrders.forEach((o) => {
      const logDate = o.paymentUpdatedAt || o.createdAt;
      if (logDate) {
        const date = new Date(logDate);
        const amount = Number(o.totalAmount);
        const cost = orderCostMap.get(o.id) || 0;

        const dateStr = date.toLocaleDateString();
        if (!dailyData[dateStr]) dailyData[dateStr] = { revenue: 0, cost: 0 };
        dailyData[dateStr].revenue += amount;
        dailyData[dateStr].cost += cost;

        const monthStr = date.toLocaleString('en-US', { month: 'short', year: 'numeric' });
        if (!monthlyData[monthStr]) monthlyData[monthStr] = { revenue: 0, cost: 0 };
        monthlyData[monthStr].revenue += amount;
        monthlyData[monthStr].cost += cost;

        const quarter = Math.floor(date.getMonth() / 3) + 1;
        const quarterStr = `${date.getFullYear()} Q${quarter}`;
        if (!quarterlyData[quarterStr]) quarterlyData[quarterStr] = { revenue: 0, cost: 0 };
        quarterlyData[quarterStr].revenue += amount;
        quarterlyData[quarterStr].cost += cost;

        const yearStr = `${date.getFullYear()}`;
        if (!yearlyData[yearStr]) yearlyData[yearStr] = { revenue: 0, cost: 0 };
        yearlyData[yearStr].revenue += amount;
        yearlyData[yearStr].cost += cost;
      }
    });

    const formatPoint = (dateStr: string, rev: number, costVal: number) => {
      const revenue = parseFloat(rev.toFixed(2));
      const cost = parseFloat(costVal.toFixed(2));
      const profit = parseFloat((revenue - cost).toFixed(2));
      const marginPercent =
        revenue > 0
          ? parseFloat((((revenue - cost) / revenue) * 100).toFixed(1))
          : null;
      return { date: dateStr, revenue, cost, profit, marginPercent };
    };

    const dailyTimeline: any[] = [];
    if (!query?.type || query.type === 'daily') {
      const startDay = new Date(start);
      const endDay = new Date(end);

      const diffTime = Math.abs(endDay.getTime() - startDay.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays <= 366) {
        for (let d = new Date(startDay); d <= endDay; d.setDate(d.getDate() + 1)) {
          const dateStr = d.toLocaleDateString();
          const dataObj = dailyData[dateStr] || { revenue: 0, cost: 0 };
          dailyTimeline.push(formatPoint(dateStr, dataObj.revenue, dataObj.cost));
        }
      } else {
        const startLimit = new Date(endDay.getTime() - 29 * 24 * 60 * 60 * 1000);
        for (let d = new Date(startLimit); d <= endDay; d.setDate(d.getDate() + 1)) {
          const dateStr = d.toLocaleDateString();
          const dataObj = dailyData[dateStr] || { revenue: 0, cost: 0 };
          dailyTimeline.push(formatPoint(dateStr, dataObj.revenue, dataObj.cost));
        }
      }
    }

    const monthlyTimeline: any[] = [];
    if (!query?.type || query.type === 'monthly') {
      const list = Object.keys(monthlyData)
        .map((key) => ({
          name: key,
          date: new Date(key),
          revenue: monthlyData[key].revenue,
          cost: monthlyData[key].cost,
        }))
        .sort((a, b) => a.date.getTime() - b.date.getTime())
        .map((item) => formatPoint(item.name, item.revenue, item.cost));
      monthlyTimeline.push(...list);
    }

    const quarterlyTimeline: any[] = [];
    if (!query?.type || query.type === 'quarterly') {
      const list = Object.keys(quarterlyData)
        .sort()
        .map((key) =>
          formatPoint(key, quarterlyData[key].revenue, quarterlyData[key].cost),
        );
      quarterlyTimeline.push(...list);
    }

    const yearlyTimeline: any[] = [];
    if (!query?.type || query.type === 'yearly') {
      const list = Object.keys(yearlyData)
        .sort()
        .map((key) =>
          formatPoint(key, yearlyData[key].revenue, yearlyData[key].cost),
        );
      yearlyTimeline.push(...list);
    }

    return {
      totalPaidRevenue,
      totalPendingRevenue,
      modeBreakdown,
      cashLogs,
      totalCost,
      totalGrossProfit,
      overallMarginPercent,
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
      '((order.paymentStatus = :paidStatus AND COALESCE(order.paymentUpdatedAt, order.createdAt) BETWEEN :start AND :end) OR (order.paymentStatus = :unpaidStatus AND order.createdAt BETWEEN :start AND :end))',
      {
        paidStatus: PaymentStatus.PAID,
        unpaidStatus: PaymentStatus.UNPAID,
        start,
        end,
      },
    );

    qb.orderBy('order.createdAt', 'DESC');
    qb.skip(skip).take(limit);

    const [orders, total] = await qb.getManyAndCount();

    // Two-step fetch to avoid TypeORM nested collection-join pagination corruption
    if (orders.length > 0) {
      const orderIds = orders.map((o) => o.id);
      const ordersWithItems = await this.orderRepository
        .createQueryBuilder('order')
        .leftJoinAndSelect('order.items', 'orderItem')
        .leftJoinAndSelect('orderItem.item', 'item')
        .leftJoinAndSelect('item.priceHistory', 'priceHistory')
        .where('order.id IN (:...ids)', { ids: orderIds })
        .getMany();

      const itemsMap = new Map<string, OrderItem[]>();
      ordersWithItems.forEach((o) => {
        itemsMap.set(o.id, o.items || []);
      });

      orders.forEach((o) => {
        o.items = itemsMap.get(o.id) || [];
      });
    }

    // Compute per-order cost / profit / margin using price history for order creation date
    const data = orders.map((order) => {
      let estimatedCost: number | null = null;
      let hasAnyCost = false;
      let costSum = 0;

      for (const oi of order.items ?? []) {
        const activeAtOrder = findActivePriceHistoryForOrder(
          oi.item?.priceHistory,
          order.createdAt,
        );
        if (
          activeAtOrder?.costPrice !== null &&
          activeAtOrder?.costPrice !== undefined
        ) {
          hasAnyCost = true;
          costSum += parseFloat(activeAtOrder.costPrice as any) * oi.quantity;
        }
      }

      if (hasAnyCost) estimatedCost = parseFloat(costSum.toFixed(2));

      const revenue = parseFloat(order.totalAmount as any);
      const grossProfit =
        estimatedCost !== null
          ? parseFloat((revenue - estimatedCost).toFixed(2))
          : null;
      const marginPercent =
        estimatedCost !== null && revenue > 0
          ? parseFloat(
              (((revenue - estimatedCost) / revenue) * 100).toFixed(2),
            )
          : null;

      return {
        ...order,
        estimatedCost,
        grossProfit,
        marginPercent,
      };
    });

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
      const customerName = getVal(row, 'customername');
      const contact = getVal(row, 'contact');
      const genderStr = getVal(row, 'gender');
      const location = getVal(row, 'location');
      const sourceStr = getVal(row, 'ordersource');
      const hubName = getVal(row, 'fulfillmenthub');
      const itemsStr = getVal(row, 'items');
      const paymentStatusStr = getVal(row, 'paymentstatus');
      const paymentModeStr = getVal(row, 'paymentmode');
      const cashDetails = getVal(row, 'cashcollectiondetails');

      if (!orderNumber || !contact || !itemsStr) {
        errors.push(
          `Row ${rowIndex + 1}: Missing required fields (OrderNumber, Contact, or Items)`,
        );
        continue;
      }

      try {
        await this.dataSource.transaction(async (manager) => {
          let customer = await manager.findOne(Customer, {
            where: { contact },
          });
          if (!customer) {
            let gender: Gender = Gender.OTHER;
            if (genderStr.toLowerCase() === 'male') gender = Gender.MALE;
            if (genderStr.toLowerCase() === 'female') gender = Gender.FEMALE;

            customer = manager.create(Customer, {
              name: customerName || 'Imported Customer',
              contact,
              gender,
              location: location || 'Ahmedabad',
            });
            customer = await manager.save(Customer, customer);
          }

          let source: OrderSource | null = null;
          if (sourceStr) {
            source = await manager.findOne(OrderSource, {
              where: { name: Like(`%${sourceStr}%`) },
            });
          }

          let fulfillmentHub: InventoryLocation | null = null;
          if (hubName) {
            fulfillmentHub = await manager.findOne(InventoryLocation, {
              where: { name: Like(`%${hubName}%`) },
            });
          }

          let paymentStatus: PaymentStatus = PaymentStatus.UNPAID;
          if (paymentStatusStr.toLowerCase() === 'paid') {
            paymentStatus = PaymentStatus.PAID;
          }

          let paymentMode: PaymentMode | null = null;
          if (paymentModeStr) {
            const pmLower = paymentModeStr.toLowerCase();
            if (pmLower.includes('upi')) paymentMode = PaymentMode.UPI;
            else if (pmLower.includes('cash')) paymentMode = PaymentMode.CASH;
            else if (pmLower.includes('card')) paymentMode = PaymentMode.CARD;
            else if (pmLower.includes('net')) paymentMode = PaymentMode.NET_BANKING;
          }

          const orderDate = orderDateStr ? new Date(orderDateStr) : new Date();

          const existingOrder = await manager.findOne(Order, {
            where: { orderNumber },
          });

          let orderObj: Order;
          if (existingOrder) {
            orderObj = existingOrder;
            orderObj.customer = customer;
            if (source) orderObj.source = source;
            if (fulfillmentHub) orderObj.fulfillmentHub = fulfillmentHub;
            orderObj.paymentStatus = paymentStatus;
            orderObj.paymentMode = paymentMode;
            orderObj.cashCollectionDetails = cashDetails || null;
            orderObj.createdAt = orderDate;
            if (paymentStatus === PaymentStatus.PAID) {
              orderObj.paymentUpdatedAt = orderDate;
            }
          } else {
            orderObj = manager.create(Order, {
              orderNumber,
              customer,
              source,
              fulfillmentHub,
              status: OrderStatus.DELIVERED,
              totalAmount: 0,
              createdAt: orderDate,
              paymentStatus,
              paymentMode,
              cashCollectionDetails: cashDetails || null,
              paymentUpdatedAt: paymentStatus === PaymentStatus.PAID ? orderDate : null,
            });
          }

          const savedOrder = await manager.save(Order, orderObj);

          if (existingOrder) {
            await manager.delete(OrderItem, { order: { id: savedOrder.id } });
          }

          const itemPairs = itemsStr.split(';');
          let calculatedTotal = 0;

          for (const pair of itemPairs) {
            const parts = pair.split(':');
            if (parts.length !== 2) continue;
            const itemName = parts[0].trim();
            const qty = parseInt(parts[1].trim(), 10);
            if (isNaN(qty) || qty <= 0) continue;

            const item = await manager.findOne(Item, {
              where: { name: Like(`%${itemName}%`) },
              relations: { priceHistory: true },
            });

            if (!item) {
              throw new NotFoundException(`Item "${itemName}" not found`);
            }

            const sortedHistory = [...item.priceHistory].sort(
              (a, b) => b.changedAt.getTime() - a.changedAt.getTime(),
            );
            const activePrice =
              sortedHistory.length > 0
                ? parseFloat(sortedHistory[0].price as any)
                : 0;
            const itemTotal = activePrice * qty;
            calculatedTotal += itemTotal;

            const orderItem = manager.create(OrderItem, {
              order: savedOrder,
              item,
              quantity: qty,
              priceAtOrder: activePrice,
            });
            await manager.save(OrderItem, orderItem);
          }

          savedOrder.totalAmount = calculatedTotal;
          await manager.save(Order, savedOrder);
        });

        successCount++;
      } catch (err: any) {
        errors.push(`Row ${rowIndex + 1} (${orderNumber}): ${err.message}`);
      }
    }

    return { successCount, errors };
  }
}
