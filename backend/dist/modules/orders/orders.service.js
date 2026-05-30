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
const order_source_entity_1 = require("../../database/entities/order-source.entity");
const inventory_location_entity_1 = require("../../database/entities/inventory-location.entity");
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
            .leftJoinAndSelect('order.source', 'source')
            .leftJoinAndSelect('order.fulfillmentHub', 'fulfillmentHub')
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
                customer.address = data.customerAddress || null;
                customer = await manager.save(customer_entity_1.Customer, customer);
            }
            else {
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
                    customer = await manager.save(customer_entity_1.Customer, customer);
                }
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
            order.status = data.status || enums_1.OrderStatus.PENDING;
            order.paymentStatus = enums_1.PaymentStatus.UNPAID;
            order.totalAmount = 0;
            if (data.sourceId) {
                let sourceObj = null;
                if (data.sourceId.match(/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/)) {
                    sourceObj = await manager.findOne(order_source_entity_1.OrderSource, { where: { id: data.sourceId } });
                }
                else {
                    sourceObj = await manager.findOne(order_source_entity_1.OrderSource, { where: { name: data.sourceId } });
                    if (!sourceObj) {
                        sourceObj = new order_source_entity_1.OrderSource();
                        sourceObj.name = data.sourceId;
                        sourceObj = await manager.save(order_source_entity_1.OrderSource, sourceObj);
                    }
                }
                if (sourceObj) {
                    order.source = sourceObj;
                }
            }
            if (data.fulfillmentHubId) {
                let hubObj = null;
                if (data.fulfillmentHubId.match(/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/)) {
                    hubObj = await manager.findOne(inventory_location_entity_1.InventoryLocation, { where: { id: data.fulfillmentHubId } });
                }
                else {
                    hubObj = await manager.findOne(inventory_location_entity_1.InventoryLocation, { where: { name: data.fulfillmentHubId } });
                    if (!hubObj) {
                        hubObj = new inventory_location_entity_1.InventoryLocation();
                        hubObj.name = data.fulfillmentHubId;
                        hubObj = await manager.save(inventory_location_entity_1.InventoryLocation, hubObj);
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
            history.status = finalizedOrder.status;
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
    async updatePayment(id, paymentStatus, paymentMode, cashDetails) {
        const order = await this.findOne(id);
        order.paymentStatus = paymentStatus;
        if (paymentStatus === enums_1.PaymentStatus.PAID) {
            order.paymentMode = paymentMode || null;
            order.cashCollectionDetails = paymentMode === enums_1.PaymentMode.CASH ? cashDetails || null : null;
            order.paymentUpdatedAt = new Date();
        }
        else {
            order.paymentMode = null;
            order.cashCollectionDetails = null;
            order.paymentUpdatedAt = null;
        }
        return this.orderRepository.save(order);
    }
    async getRevenueMetrics() {
        const paidOrders = await this.orderRepository.find({
            where: { paymentStatus: enums_1.PaymentStatus.PAID },
            relations: { customer: true },
            order: { paymentUpdatedAt: 'DESC' },
        });
        const unpaidOrders = await this.orderRepository.find({
            where: { paymentStatus: enums_1.PaymentStatus.UNPAID },
        });
        const totalPaidRevenue = paidOrders.reduce((sum, o) => sum + Number(o.totalAmount), 0);
        const totalPendingRevenue = unpaidOrders.reduce((sum, o) => sum + Number(o.totalAmount), 0);
        const modeBreakdown = {};
        paidOrders.forEach((o) => {
            const mode = o.paymentMode || 'Unknown';
            modeBreakdown[mode] = (modeBreakdown[mode] || 0) + Number(o.totalAmount);
        });
        const cashLogs = paidOrders
            .filter((o) => o.paymentMode === enums_1.PaymentMode.CASH)
            .map((o) => ({
            orderId: o.id,
            orderNumber: o.orderNumber,
            customerName: o.customer?.name || 'Walk-in',
            amount: o.totalAmount,
            collectedAt: o.cashCollectionDetails || 'N/A',
            timestamp: o.paymentUpdatedAt,
        }));
        const timelineData = {};
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
    async importOrders(csvText) {
        const lines = csvText.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
        if (lines.length < 2) {
            return { successCount: 0, errors: ['CSV content is empty or contains no data rows'] };
        }
        const parseCSVLine = (line) => {
            const row = [];
            let insideQuote = false;
            let entry = '';
            for (let i = 0; i < line.length; i++) {
                const char = line[i];
                if (char === '"') {
                    insideQuote = !insideQuote;
                }
                else if (char === ',' && !insideQuote) {
                    row.push(entry.trim());
                    entry = '';
                }
                else {
                    entry += char;
                }
            }
            row.push(entry.trim());
            return row;
        };
        const headers = parseCSVLine(lines[0]).map(h => h.toLowerCase().replace(/[\s_]+/g, ''));
        const headerIndices = {};
        headers.forEach((h, idx) => {
            headerIndices[h] = idx;
        });
        const getVal = (row, key) => {
            const idx = headerIndices[key];
            if (idx === undefined || idx >= row.length)
                return '';
            return row[idx];
        };
        const errors = [];
        let successCount = 0;
        for (let rowIndex = 1; rowIndex < lines.length; rowIndex++) {
            const row = parseCSVLine(lines[rowIndex]);
            if (row.length === 0 || (row.length === 1 && !row[0]))
                continue;
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
            let status;
            if (Object.values(enums_1.OrderStatus).map(v => v.toLowerCase()).includes(orderStatusStr.toLowerCase())) {
                status = Object.values(enums_1.OrderStatus).find(v => v.toLowerCase() === orderStatusStr.toLowerCase());
            }
            else {
                errors.push(`${label}Invalid Order Status '${orderStatusStr}'`);
                continue;
            }
            let paymentStatus;
            if (paymentStatusStr.toLowerCase() === 'paid') {
                paymentStatus = enums_1.PaymentStatus.PAID;
            }
            else if (paymentStatusStr.toLowerCase() === 'unpaid') {
                paymentStatus = enums_1.PaymentStatus.UNPAID;
            }
            else {
                errors.push(`${label}Invalid Payment Status '${paymentStatusStr}' (must be Paid or Unpaid)`);
                continue;
            }
            let paymentMode = null;
            if (paymentStatus === enums_1.PaymentStatus.PAID && paymentModeStr) {
                if (Object.values(enums_1.PaymentMode).map(v => v.toLowerCase()).includes(paymentModeStr.toLowerCase())) {
                    paymentMode = Object.values(enums_1.PaymentMode).find(v => v.toLowerCase() === paymentModeStr.toLowerCase());
                }
                else {
                    errors.push(`${label}Invalid Payment Mode '${paymentModeStr}'`);
                    continue;
                }
            }
            let customerGender = enums_1.Gender.MALE;
            if (gender.toLowerCase() === 'female') {
                customerGender = enums_1.Gender.FEMALE;
            }
            else if (gender.toLowerCase() === 'other') {
                customerGender = enums_1.Gender.OTHER;
            }
            const itemsList = [];
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
                    where: { name: (0, typeorm_2.Like)(`%${itemName}%`) }
                });
                if (!itemObj) {
                    errors.push(`${label}Item '${itemName}' not found in Snacking Catalog`);
                    itemsError = true;
                    break;
                }
                itemsList.push({ itemId: itemObj.id, name: itemObj.name, quantity: qtyVal });
            }
            if (itemsError)
                continue;
            try {
                await this.dataSource.transaction(async (manager) => {
                    let customer = await manager.findOne(customer_entity_1.Customer, { where: { contact } });
                    if (!customer) {
                        customer = new customer_entity_1.Customer();
                        customer.contact = contact;
                        customer.name = name;
                        customer.gender = customerGender;
                        customer.location = location;
                        customer.address = address || null;
                        customer = await manager.save(customer_entity_1.Customer, customer);
                    }
                    else {
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
                            customer = await manager.save(customer_entity_1.Customer, customer);
                        }
                    }
                    let sourceObj = await manager.findOne(order_source_entity_1.OrderSource, { where: { name: (0, typeorm_2.Like)(`%${sourceName}%`) } });
                    if (!sourceObj) {
                        sourceObj = new order_source_entity_1.OrderSource();
                        sourceObj.name = sourceName;
                        sourceObj = await manager.save(order_source_entity_1.OrderSource, sourceObj);
                    }
                    let hubObj = null;
                    if (hubName) {
                        hubObj = await manager.findOne(inventory_location_entity_1.InventoryLocation, { where: { name: (0, typeorm_2.Like)(`%${hubName}%`) } });
                    }
                    if (!hubObj) {
                        hubObj = await manager.findOne(inventory_location_entity_1.InventoryLocation, { order: { name: 'ASC' } });
                    }
                    let resolvedOrderNumber = orderNumber;
                    if (resolvedOrderNumber) {
                        const existingOrder = await manager.findOne(order_entity_1.Order, { where: { orderNumber: resolvedOrderNumber } });
                        if (existingOrder) {
                            throw new Error(`Order Number '${resolvedOrderNumber}' already exists`);
                        }
                    }
                    else {
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
                        resolvedOrderNumber = `KB-${nextSerial}`;
                    }
                    const order = new order_entity_1.Order();
                    order.orderNumber = resolvedOrderNumber;
                    order.customer = customer;
                    order.status = status;
                    order.paymentStatus = paymentStatus;
                    order.paymentMode = paymentMode;
                    order.cashCollectionDetails = paymentMode === enums_1.PaymentMode.CASH ? cashDetails || null : null;
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
                    if (paymentStatus === enums_1.PaymentStatus.PAID) {
                        order.paymentUpdatedAt = orderDateStr ? new Date(orderDateStr) : new Date();
                    }
                    order.totalAmount = 0;
                    const savedOrder = await manager.save(order_entity_1.Order, order);
                    let totalAmount = 0;
                    for (const itemReq of itemsList) {
                        const itemObj = await manager.findOne(item_entity_1.Item, {
                            where: { id: itemReq.itemId },
                            relations: { priceHistory: true }
                        });
                        if (!itemObj)
                            throw new Error(`Item ${itemReq.name} not found`);
                        const sortedHistory = [...itemObj.priceHistory].sort((a, b) => b.changedAt.getTime() - a.changedAt.getTime());
                        const priceAtOrder = sortedHistory.length > 0 ? parseFloat(sortedHistory[0].price) : 0;
                        const orderItem = new order_item_entity_1.OrderItem();
                        orderItem.order = savedOrder;
                        orderItem.item = itemObj;
                        orderItem.quantity = itemReq.quantity;
                        orderItem.priceAtOrder = priceAtOrder;
                        await manager.save(order_item_entity_1.OrderItem, orderItem);
                        totalAmount += priceAtOrder * itemReq.quantity;
                    }
                    if (totalAmountStr && !isNaN(parseFloat(totalAmountStr))) {
                        savedOrder.totalAmount = parseFloat(totalAmountStr);
                    }
                    else {
                        savedOrder.totalAmount = Math.round(totalAmount * 100) / 100;
                    }
                    const finalizedOrder = await manager.save(order_entity_1.Order, savedOrder);
                    const history = new order_status_history_entity_1.OrderStatusHistory();
                    history.order = finalizedOrder;
                    history.status = status;
                    history.changedBy = 'Import Manager';
                    if (orderDateStr) {
                        history.changedAt = new Date(orderDateStr);
                    }
                    await manager.save(order_status_history_entity_1.OrderStatusHistory, history);
                });
                successCount++;
            }
            catch (err) {
                errors.push(`${label}${err.message || err}`);
            }
        }
        return { successCount, errors };
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