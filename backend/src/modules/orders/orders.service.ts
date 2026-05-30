import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, Between, Like } from 'typeorm';
import { Order } from '../../database/entities/order.entity';
import { OrderItem } from '../../database/entities/order-item.entity';
import { OrderStatusHistory } from '../../database/entities/order-status-history.entity';
import { Customer } from '../../database/entities/customer.entity';
import { Item } from '../../database/entities/item.entity';
import { ItemPriceHistory } from '../../database/entities/item-price-history.entity';
import { OrderSource } from '../../database/entities/order-source.entity';
import { InventoryLocation } from '../../database/entities/inventory-location.entity';
import { OrderStatus, Gender, PaymentStatus, PaymentMode } from '../../database/entities/enums';
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
      .leftJoinAndSelect('order.source', 'source')
      .leftJoinAndSelect('order.fulfillmentHub', 'fulfillmentHub')
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
        if (data.customerLocation && customer.location !== data.customerLocation) {
          customer.location = data.customerLocation;
          changed = true;
        }
        if (data.customerAddress !== undefined && customer.address !== data.customerAddress) {
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
      order.status = data.status || OrderStatus.PENDING;
      order.paymentStatus = PaymentStatus.UNPAID;
      order.totalAmount = 0;
      if (data.sourceId) {
        let sourceObj = null;
        if (data.sourceId.match(/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/)) {
          sourceObj = await manager.findOne(OrderSource, { where: { id: data.sourceId } });
        } else {
          sourceObj = await manager.findOne(OrderSource, { where: { name: data.sourceId } });
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
        if (data.fulfillmentHubId.match(/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/)) {
          hubObj = await manager.findOne(InventoryLocation, { where: { id: data.fulfillmentHubId } });
        } else {
          hubObj = await manager.findOne(InventoryLocation, { where: { name: data.fulfillmentHubId } });
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

      // 5. Add initial Status History log
      const history = new OrderStatusHistory();
      history.order = finalizedOrder;
      history.status = finalizedOrder.status;
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
      order.cashCollectionDetails = paymentMode === PaymentMode.CASH ? cashDetails || null : null;
      order.paymentUpdatedAt = new Date();
    } else {
      order.paymentMode = null;
      order.cashCollectionDetails = null;
      order.paymentUpdatedAt = null;
    }
    
    return this.orderRepository.save(order);
  }

  // Fetch financial metrics for the revenue dashboard
  async getRevenueMetrics() {
    const paidOrders = await this.orderRepository.find({
      where: { paymentStatus: PaymentStatus.PAID },
      relations: { customer: true },
      order: { paymentUpdatedAt: 'DESC' },
    });

    const unpaidOrders = await this.orderRepository.find({
      where: { paymentStatus: PaymentStatus.UNPAID },
    });

    const totalPaidRevenue = paidOrders.reduce((sum, o) => sum + Number(o.totalAmount), 0);
    const totalPendingRevenue = unpaidOrders.reduce((sum, o) => sum + Number(o.totalAmount), 0);

    const modeBreakdown: Record<string, number> = {};
    paidOrders.forEach((o) => {
      const mode = o.paymentMode || 'Unknown';
      modeBreakdown[mode] = (modeBreakdown[mode] || 0) + Number(o.totalAmount);
    });

    const cashLogs = paidOrders
      .filter((o) => o.paymentMode === PaymentMode.CASH)
      .map((o) => ({
        orderId: o.id,
        orderNumber: o.orderNumber,
        customerName: o.customer?.name || 'Walk-in',
        amount: o.totalAmount,
        collectedAt: o.cashCollectionDetails || 'N/A',
        timestamp: o.paymentUpdatedAt,
      }));

    // Daily Timeline: last 30 days
    const timelineData: Record<string, number> = {};
    const now = new Date();
    for (let i = 29; i >= 0; i--) {
      const dateStr = new Date(now.getTime() - i * 24 * 60 * 60 * 1000).toLocaleDateString();
      timelineData[dateStr] = 0;
    }

    paidOrders.forEach((o) => {
      if (o.paymentUpdatedAt) {
        const dateStr = new Date(o.paymentUpdatedAt).toLocaleDateString();
        if (timelineData[dateStr] !== undefined) {
          timelineData[dateStr] += Number(o.totalAmount);
        }
      }
    });

    const timeline = Object.keys(timelineData).map((date) => ({
      date,
      revenue: timelineData[date],
    }));

    return {
      totalPaidRevenue,
      totalPendingRevenue,
      modeBreakdown,
      cashLogs,
      timeline,
    };
  }

  async importOrders(csvText: string): Promise<{ successCount: number; errors: string[] }> {
    const lines = csvText.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
    if (lines.length < 2) {
      return { successCount: 0, errors: ['CSV content is empty or contains no data rows'] };
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

    const headers = parseCSVLine(lines[0]).map(h => h.toLowerCase().replace(/[\s_]+/g, ''));
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

      if (!name || !contact || !location || !sourceName || !deliveryLocation || !itemsStr || !orderStatusStr || !paymentStatusStr) {
        errors.push(`${label}Missing required columns (Customer Name, Contact, Location, Order Source, Delivery Location, Items, Order Status, and Payment Status are required)`);
        continue;
      }

      let status: OrderStatus;
      if (Object.values(OrderStatus).map(v => v.toLowerCase()).includes(orderStatusStr.toLowerCase() as any)) {
        status = Object.values(OrderStatus).find(v => v.toLowerCase() === orderStatusStr.toLowerCase()) as OrderStatus;
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
        errors.push(`${label}Invalid Payment Status '${paymentStatusStr}' (must be Paid or Unpaid)`);
        continue;
      }

      let paymentMode: PaymentMode | null = null;
      if (paymentStatus === PaymentStatus.PAID && paymentModeStr) {
        if (Object.values(PaymentMode).map(v => v.toLowerCase()).includes(paymentModeStr.toLowerCase() as any)) {
          paymentMode = Object.values(PaymentMode).find(v => v.toLowerCase() === paymentModeStr.toLowerCase()) as PaymentMode;
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

      const itemsList: { itemId: string; name: string; quantity: number }[] = [];
      const itemsParts = itemsStr.split(',').map(p => p.trim());
      let itemsError = false;

      for (const part of itemsParts) {
        const colonIdx = part.lastIndexOf(':');
        if (colonIdx === -1) {
          errors.push(`${label}Invalid Items format. Expected ItemName:Quantity`);
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
          where: { name: Like(`%${itemName}%`) }
        });
        if (!itemObj) {
          errors.push(`${label}Item '${itemName}' not found in Snacking Catalog`);
          itemsError = true;
          break;
        }

        itemsList.push({ itemId: itemObj.id, name: itemObj.name, quantity: qtyVal });
      }

      if (itemsError) continue;

      try {
        await this.dataSource.transaction(async (manager) => {
          let customer = await manager.findOne(Customer, { where: { contact } });
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

          let sourceObj = await manager.findOne(OrderSource, { where: { name: Like(`%${sourceName}%`) } });
          if (!sourceObj) {
            sourceObj = new OrderSource();
            sourceObj.name = sourceName;
            sourceObj = await manager.save(OrderSource, sourceObj);
          }

          let hubObj = null;
          if (hubName) {
            hubObj = await manager.findOne(InventoryLocation, { where: { name: Like(`%${hubName}%`) } });
          }
          if (!hubObj) {
            hubObj = await manager.findOne(InventoryLocation, { order: { name: 'ASC' } });
          }

          let resolvedOrderNumber = orderNumber;
          if (resolvedOrderNumber) {
            const existingOrder = await manager.findOne(Order, { where: { orderNumber: resolvedOrderNumber } });
            if (existingOrder) {
              throw new Error(`Order Number '${resolvedOrderNumber}' already exists`);
            }
          } else {
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
            resolvedOrderNumber = `KB-${nextSerial}`;
          }

          const order = new Order();
          order.orderNumber = resolvedOrderNumber;
          order.customer = customer;
          order.status = status;
          order.paymentStatus = paymentStatus;
          order.paymentMode = paymentMode;
          order.cashCollectionDetails = paymentMode === PaymentMode.CASH ? cashDetails || null : null;
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
            order.paymentUpdatedAt = orderDateStr ? new Date(orderDateStr) : new Date();
          }

          order.totalAmount = 0;
          const savedOrder = await manager.save(Order, order);

          let totalAmount = 0;
          for (const itemReq of itemsList) {
            const itemObj = await manager.findOne(Item, {
              where: { id: itemReq.itemId },
              relations: { priceHistory: true }
            });
            if (!itemObj) throw new Error(`Item ${itemReq.name} not found`);

            const sortedHistory = [...itemObj.priceHistory].sort(
              (a, b) => b.changedAt.getTime() - a.changedAt.getTime(),
            );
            const priceAtOrder = sortedHistory.length > 0 ? parseFloat(sortedHistory[0].price as any) : 0;

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
