import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Order } from './order.entity';
import { OrderItem } from './order-item.entity';
import { Customer } from '../customers/customer.entity';
import { Item } from '../items/item.entity';
import { WhatsappService } from '../whatsapp/whatsapp.service';

export interface CreateOrderDto {
  customer_id?: number;
  customer_name?: string;
  customer_contact?: string;
  customer_gender?: string;
  customer_location?: string;
  source: string;
  expected_delivery_date: string;
  expected_delivery_location: string;
  items: { item_id: number; quantity: number }[];
}

@Injectable()
export class OrdersService {
  constructor(
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    @InjectRepository(OrderItem)
    private readonly orderItemRepository: Repository<OrderItem>,
    @InjectRepository(Customer)
    private readonly customerRepository: Repository<Customer>,
    private readonly whatsappService: WhatsappService,
    private readonly dataSource: DataSource,
  ) {}

  async getAllOrders() {
    const orders = await this.orderRepository.find({
      relations: ['customer', 'items', 'items.item'],
      order: { id: 'DESC' }
    });

    return orders.map(order => ({
      id: order.id,
      customer_id: order.customerId,
      customer_name: order.customer ? order.customer.name : null,
      customer_contact: order.customer ? order.customer.contact : null,
      customer_location: order.customer ? order.customer.location : null,
      source: order.source,
      expected_delivery_date: order.expectedDeliveryDate.toISOString(),
      expected_delivery_location: order.expectedDeliveryLocation,
      status: order.status,
      payment_status: order.paymentStatus,
      total_price: typeof order.totalPrice === 'string' ? parseFloat(order.totalPrice) : Number(order.totalPrice),
      created_at: order.createdAt.toISOString(),
      items: (order.items || []).map(oi => ({
        id: oi.id,
        order_id: oi.orderId,
        item_id: oi.itemId,
        quantity: oi.quantity,
        unit_price: typeof oi.unitPrice === 'string' ? parseFloat(oi.unitPrice) : Number(oi.unitPrice),
        item_name: oi.item ? oi.item.name : null
      }))
    }));
  }

  async createOrder(dto: CreateOrderDto) {
    const {
      customer_id,
      customer_name,
      customer_contact,
      customer_gender,
      customer_location,
      source,
      expected_delivery_date,
      expected_delivery_location,
      items
    } = dto;

    if (!items || items.length === 0) {
      throw new HttpException('Order must contain at least one item', HttpStatus.BAD_REQUEST);
    }

    return await this.dataSource.transaction(async (manager) => {
      let resolvedCustomerId = customer_id;
      let customer: Customer | null = null;

      // Check/create customer if customer_id was not selected
      if (!resolvedCustomerId) {
        if (!customer_contact || !customer_name || !customer_location) {
          throw new HttpException('Customer contact, name, and location are required for new customer', HttpStatus.BAD_REQUEST);
        }

        // Check if contact already exists
        customer = await manager.findOne(Customer, { where: { contact: customer_contact } });
        if (customer) {
          resolvedCustomerId = customer.id;
        } else {
          // Create new customer entry
          const newCust = manager.create(Customer, {
            name: customer_name,
            contact: customer_contact,
            gender: (customer_gender || 'Prefer Not to Say') as any,
            location: customer_location
          });
          customer = await manager.save(Customer, newCust);
          resolvedCustomerId = customer.id;
          console.log(`[OrdersService] Auto-created new customer with ID: ${resolvedCustomerId}`);
        }
      } else {
        customer = await manager.findOne(Customer, { where: { id: resolvedCustomerId } });
        if (!customer) {
          throw new HttpException(`Customer ID ${resolvedCustomerId} not found`, HttpStatus.NOT_FOUND);
        }
      }

      // Retrieve prices of items to calculate totals safely
      let calculatedTotal = 0;
      const itemsWithPrices = [];

      for (const orderItem of items) {
        const item = await manager.findOne(Item, { where: { id: orderItem.item_id } });
        if (!item) {
          throw new HttpException(`Item ID ${orderItem.item_id} not found`, HttpStatus.NOT_FOUND);
        }
        const unitPrice = typeof item.price === 'string' ? parseFloat(item.price) : Number(item.price);
        calculatedTotal += unitPrice * orderItem.quantity;
        itemsWithPrices.push({
          item_id: orderItem.item_id,
          name: item.name,
          quantity: orderItem.quantity,
          unit_price: unitPrice
        });
      }

      // Insert Order
      const newOrder = manager.create(Order, {
        customerId: resolvedCustomerId,
        source,
        expectedDeliveryDate: new Date(expected_delivery_date),
        expectedDeliveryLocation: expected_delivery_location,
        status: 'Pending',
        paymentStatus: 'Unpaid',
        totalPrice: calculatedTotal
      });
      const savedOrder = await manager.save(Order, newOrder);
      const orderId = savedOrder.id;

      // Insert Order Items
      for (const itemDetails of itemsWithPrices) {
        const newOrderItem = manager.create(OrderItem, {
          orderId,
          itemId: itemDetails.item_id,
          quantity: itemDetails.quantity,
          unitPrice: itemDetails.unit_price
        });
        await manager.save(OrderItem, newOrderItem);
      }

      // Trigger Asynchronous WhatsApp Confirmation
      let whatsappSimulatedResult = null;
      try {
        const formattedDate = new Date(expected_delivery_date).toLocaleString();
        const whatsappRes = await this.whatsappService.sendOrderReceived(
          customer!.name,
          customer!.contact,
          orderId,
          itemsWithPrices,
          calculatedTotal,
          formattedDate,
          expected_delivery_location
        );
        whatsappSimulatedResult = {
          recipient: customer!.contact,
          message: whatsappRes.message,
          status: whatsappRes.status
        };
      } catch (wsErr: any) {
        console.error('[OrdersService] [WhatsApp Hook] Failed to send order received alert:', wsErr.message);
      }

      return {
        success: true,
        order: {
          id: orderId,
          customer_id: resolvedCustomerId,
          customer_name: customer!.name,
          customer_contact: customer!.contact,
          source,
          expected_delivery_date,
          expected_delivery_location,
          status: savedOrder.status,
          payment_status: savedOrder.paymentStatus,
          total_price: calculatedTotal,
          created_at: savedOrder.createdAt,
          items: itemsWithPrices
        },
        whatsapp: whatsappSimulatedResult
      };
    });
  }

  async updateOrderStatus(id: number, status: string) {
    if (!status) {
      throw new HttpException('Status is required', HttpStatus.BAD_REQUEST);
    }

    const order = await this.orderRepository.findOne({
      where: { id },
      relations: ['customer']
    });

    if (!order) {
      throw new HttpException('Order not found', HttpStatus.NOT_FOUND);
    }

    order.status = status as any;
    const savedOrder = await this.orderRepository.save(order);

    const updatedOrder = {
      ...savedOrder,
      total_price: typeof savedOrder.totalPrice === 'string' ? parseFloat(savedOrder.totalPrice) : Number(savedOrder.totalPrice),
      customer_id: savedOrder.customerId
    };

    const customer = order.customer;
    let whatsappAlert = null;

    if (customer && (status === 'Ready' || status === 'Delivered')) {
      try {
        const waRes = await this.whatsappService.sendOrderReadyOrDelivered(
          customer.name,
          customer.contact,
          order.id,
          status as any,
          order.expectedDeliveryLocation
        );
        whatsappAlert = {
          recipient: customer.contact,
          status: waRes.status
        };
      } catch (waErr: any) {
        console.error('[OrdersService] [WhatsApp Hook] Failed to send status update notification:', waErr.message);
      }
    }

    return {
      order: updatedOrder,
      whatsapp: whatsappAlert
    };
  }

  async updateOrderPaymentStatus(id: number, paymentStatus: string) {
    if (!paymentStatus) {
      throw new HttpException('Payment status is required', HttpStatus.BAD_REQUEST);
    }

    const order = await this.orderRepository.findOne({
      where: { id },
      relations: ['customer']
    });

    if (!order) {
      throw new HttpException('Order not found', HttpStatus.NOT_FOUND);
    }

    order.paymentStatus = paymentStatus as any;
    const savedOrder = await this.orderRepository.save(order);

    const updatedOrder = {
      ...savedOrder,
      total_price: typeof savedOrder.totalPrice === 'string' ? parseFloat(savedOrder.totalPrice) : Number(savedOrder.totalPrice),
      customer_id: savedOrder.customerId
    };

    const customer = order.customer;
    let whatsappAlert = null;

    if (customer && paymentStatus === 'Paid') {
      try {
        const waRes = await this.whatsappService.sendPaymentSuccess(
          customer.name,
          customer.contact,
          order.id,
          updatedOrder.total_price
        );
        whatsappAlert = {
          recipient: customer.contact,
          status: waRes.status
        };
      } catch (waErr: any) {
        console.error('[OrdersService] [WhatsApp Hook] Failed to send payment confirmation:', waErr.message);
      }
    }

    return {
      order: updatedOrder,
      whatsapp: whatsappAlert
    };
  }
}
