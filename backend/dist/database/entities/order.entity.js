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
Object.defineProperty(exports, "__esModule", { value: true });
exports.Order = void 0;
const typeorm_1 = require("typeorm");
const customer_entity_1 = require("./customer.entity");
const order_item_entity_1 = require("./order-item.entity");
const order_status_history_entity_1 = require("./order-status-history.entity");
const whatsapp_log_entity_1 = require("./whatsapp-log.entity");
const enums_1 = require("./enums");
const order_source_entity_1 = require("./order-source.entity");
const inventory_location_entity_1 = require("./inventory-location.entity");
let Order = class Order {
    id;
    orderNumber;
    source;
    paymentStatus;
    paymentMode;
    cashCollectionDetails;
    paymentUpdatedAt;
    fulfillmentHub;
    expectedDeliveryDate;
    deliveryLocation;
    customer;
    status;
    totalAmount;
    items;
    statusHistory;
    whatsappLogs;
    createdAt;
    updatedAt;
};
exports.Order = Order;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], Order.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 50, unique: true }),
    __metadata("design:type", String)
], Order.prototype, "orderNumber", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => order_source_entity_1.OrderSource, { eager: true, nullable: true, onDelete: 'SET NULL' }),
    (0, typeorm_1.JoinColumn)({ name: 'sourceId' }),
    __metadata("design:type", Object)
], Order.prototype, "source", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'enum', enum: enums_1.PaymentStatus, default: enums_1.PaymentStatus.UNPAID }),
    __metadata("design:type", String)
], Order.prototype, "paymentStatus", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'enum', enum: enums_1.PaymentMode, nullable: true }),
    __metadata("design:type", Object)
], Order.prototype, "paymentMode", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", Object)
], Order.prototype, "cashCollectionDetails", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamp', nullable: true }),
    __metadata("design:type", Object)
], Order.prototype, "paymentUpdatedAt", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => inventory_location_entity_1.InventoryLocation, { eager: true, nullable: true, onDelete: 'SET NULL' }),
    (0, typeorm_1.JoinColumn)({ name: 'fulfillmentHubId' }),
    __metadata("design:type", Object)
], Order.prototype, "fulfillmentHub", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamp', nullable: true }),
    __metadata("design:type", Object)
], Order.prototype, "expectedDeliveryDate", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 255, nullable: true }),
    __metadata("design:type", Object)
], Order.prototype, "deliveryLocation", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => customer_entity_1.Customer, (customer) => customer.orders, { eager: true, onDelete: 'CASCADE' }),
    __metadata("design:type", customer_entity_1.Customer)
], Order.prototype, "customer", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'enum', enum: enums_1.OrderStatus, default: enums_1.OrderStatus.PENDING }),
    __metadata("design:type", String)
], Order.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 10, scale: 2, transformer: {
            to: (value) => value,
            from: (value) => parseFloat(value),
        } }),
    __metadata("design:type", Number)
], Order.prototype, "totalAmount", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => order_item_entity_1.OrderItem, (orderItem) => orderItem.order, { cascade: true }),
    __metadata("design:type", Array)
], Order.prototype, "items", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => order_status_history_entity_1.OrderStatusHistory, (history) => history.order, { cascade: true }),
    __metadata("design:type", Array)
], Order.prototype, "statusHistory", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => whatsapp_log_entity_1.WhatsappLog, (log) => log.order),
    __metadata("design:type", Array)
], Order.prototype, "whatsappLogs", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], Order.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)(),
    __metadata("design:type", Date)
], Order.prototype, "updatedAt", void 0);
exports.Order = Order = __decorate([
    (0, typeorm_1.Entity)('orders')
], Order);
//# sourceMappingURL=order.entity.js.map