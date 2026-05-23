"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OrdersService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const order_entity_1 = require("../../database/entities/order.entity");
const order_item_entity_1 = require("../../database/entities/order-item.entity");
const order_status_history_entity_1 = require("../../database/entities/order-status-history.entity");
const customer_entity_1 = require("../../database/entities/customer.entity");
const item_entity_1 = require("../../database/entities/item.entity");
const enums_1 = require("../../database/entities/enums");
const whatsapp_service_1 = require("../whatsapp/whatsapp.service");
let OrdersService = class OrdersService {
    dataSource;
    orderRepository;
    customerRepository;
    itemRepository;
    statusHistoryRepository;
    whatsappService;
    constructor(dataSource, orderRepository, customerRepository, itemRepository, statusHistoryRepository, whatsappService) {
        this.dataSource = dataSource;
        this.orderRepository = orderRepository;
        this.customerRepository = customerRepository;
        this.itemRepository = itemRepository;
        this.statusHistoryRepository = statusHistoryRepository;
        this.whatsappService = whatsappService;
    }
    async findAll(query) {
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
            qb.andWhere('(order.orderNumber ILIKE :search OR customer.name ILIKE :search OR customer.contact ILIKE :search)', { search: `%${query.search}%` });
        }
        if (query.startDate && query.endDate) {
            qb.andWhere('order.createdAt BETWEEN :start AND :end', {
                start: new Date(query.startDate),
                end: new Date(query.endDate),
            });
        }
        const sortBy = query.sortBy || 'createdAt';
        const sortOrder = query.sortOrder || 'DESC';
        if (sortBy === 'customerName') {
            qb.orderBy('customer.name', sortOrder);
        }
        else {
            qb.orderBy(`order.${sortBy}`, sortOrder);
        }
        qb.skip(skip).take(limit);
        const [data, total] = await qb.getManyAndCount();
        return { data, total };
    }
    async findOne(id) {
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
            throw new common_1.NotFoundException(`Order with ID ${id} not found`);
        }
        return order;
    }
    async create(data) {
        if (!data.items || data.items.length === 0) {
            throw new common_1.BadRequestException('Order must contain at least one item');
        }
        return this.dataSource.transaction(async (manager) => {
            let customer = await manager.findOne(customer_entity_1.Customer, {
                where: { contact: data.customerContact },
            });
            if (!customer) {
                if (!data.customerName || !data.customerGender || !data.customerLocation) {
                    throw new common_1.BadRequestException('Customer contact is new. Please provide Name, Gender, and Location to create a profile.');
                }
                customer = new customer_entity_1.Customer();
                customer.contact = data.customerContact;
                customer.name = data.customerName;
                customer.gender = data.customerGender;
                customer.location = data.customerLocation;
                customer = await manager.save(customer_entity_1.Customer, customer);
            }
            const lastOrder = await manager.findOne(order_entity_1.Order, {
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
            const order = new order_entity_1.Order();
            order.orderNumber = orderNumber;
            order.customer = customer;
            order.status = enums_1.OrderStatus.PENDING;
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
            const savedOrder = await manager.save(order_entity_1.Order, order);
            let totalAmount = 0;
            for (const itemRequest of data.items) {
                const itemObj = await manager.findOne(item_entity_1.Item, {
                    where: { id: itemRequest.itemId },
                    relations: { priceHistory: true },
                });
                if (!itemObj) {
                    throw new common_1.BadRequestException(`Item with ID ${itemRequest.itemId} not found`);
                }
                const sortedHistory = [...itemObj.priceHistory].sort((a, b) => b.changedAt.getTime() - a.changedAt.getTime());
                if (sortedHistory.length === 0) {
                    throw new common_1.BadRequestException(`Item ${itemObj.name} does not have any pricing history log`);
                }
                const priceAtOrder = parseFloat(sortedHistory[0].price);
                const orderItem = new order_item_entity_1.OrderItem();
                orderItem.order = savedOrder;
                orderItem.item = itemObj;
                orderItem.quantity = itemRequest.quantity;
                orderItem.priceAtOrder = priceAtOrder;
                await manager.save(order_item_entity_1.OrderItem, orderItem);
                totalAmount += priceAtOrder * itemRequest.quantity;
            }
            savedOrder.totalAmount = Math.round(totalAmount * 100) / 100;
            const finalizedOrder = await manager.save(order_entity_1.Order, savedOrder);
            const history = new order_status_history_entity_1.OrderStatusHistory();
            history.order = finalizedOrder;
            history.status = enums_1.OrderStatus.PENDING;
            history.changedBy = 'Admin';
            await manager.save(order_status_history_entity_1.OrderStatusHistory, history);
            return finalizedOrder;
        });
    }
    async updateStatus(id, newStatus, changedBy = 'Admin') {
        const order = await this.findOne(id);
        const oldStatus = order.status;
        if (oldStatus === newStatus) {
            return order;
        }
        order.status = newStatus;
        const updatedOrder = await this.orderRepository.save(order);
        const history = new order_status_history_entity_1.OrderStatusHistory();
        history.order = updatedOrder;
        history.status = newStatus;
        history.changedBy = changedBy;
        await this.statusHistoryRepository.save(history);
        if (newStatus === enums_1.OrderStatus.PENDING) {
            await this.whatsappService.triggerNotification(updatedOrder, 'Order Created (Pending)');
        }
        else if (newStatus === enums_1.OrderStatus.READY_TO_DELIVER) {
            await this.whatsappService.triggerNotification(updatedOrder, 'Ready to Deliver');
        }
        else if (newStatus === enums_1.OrderStatus.DELIVERED) {
            await this.whatsappService.triggerNotification(updatedOrder, 'Order Delivered (Payment Confirmed)');
        }
        return updatedOrder;
    }
};
exports.OrdersService = OrdersService;
exports.OrdersService = OrdersService = __decorate([
    (0, common_1.Injectable)(),
    __param(1, (0, typeorm_1.InjectRepository)(order_entity_1.Order)),
    __param(2, (0, typeorm_1.InjectRepository)(customer_entity_1.Customer)),
    __param(3, (0, typeorm_1.InjectRepository)(item_entity_1.Item)),
    __param(4, (0, typeorm_1.InjectRepository)(order_status_history_entity_1.OrderStatusHistory)),
    __metadata("design:paramtypes", [typeorm_2.DataSource,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        whatsapp_service_1.WhatsappService])
], OrdersService);
//# sourceMappingURL=orders.service.js.map