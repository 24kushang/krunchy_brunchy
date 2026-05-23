"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OrdersModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const order_entity_1 = require("../../database/entities/order.entity");
const order_item_entity_1 = require("../../database/entities/order-item.entity");
const order_status_history_entity_1 = require("../../database/entities/order-status-history.entity");
const customer_entity_1 = require("../../database/entities/customer.entity");
const item_entity_1 = require("../../database/entities/item.entity");
const orders_controller_1 = require("./orders.controller");
const orders_service_1 = require("./orders.service");
const whatsapp_module_1 = require("../whatsapp/whatsapp.module");
const customers_module_1 = require("../customers/customers.module");
let OrdersModule = class OrdersModule {
};
exports.OrdersModule = OrdersModule;
exports.OrdersModule = OrdersModule = __decorate([
    (0, common_1.Module)({
        imports: [
            typeorm_1.TypeOrmModule.forFeature([order_entity_1.Order, order_item_entity_1.OrderItem, order_status_history_entity_1.OrderStatusHistory, customer_entity_1.Customer, item_entity_1.Item]),
            whatsapp_module_1.WhatsappModule,
            customers_module_1.CustomersModule,
        ],
        controllers: [orders_controller_1.OrdersController],
        providers: [orders_service_1.OrdersService],
        exports: [orders_service_1.OrdersService],
    })
], OrdersModule);
//# sourceMappingURL=orders.module.js.map