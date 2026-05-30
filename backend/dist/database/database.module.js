"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DatabaseModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const config_1 = require("@nestjs/config");
const customer_entity_1 = require("./entities/customer.entity");
const item_entity_1 = require("./entities/item.entity");
const item_price_history_entity_1 = require("./entities/item-price-history.entity");
const order_entity_1 = require("./entities/order.entity");
const order_item_entity_1 = require("./entities/order-item.entity");
const order_status_history_entity_1 = require("./entities/order-status-history.entity");
const whatsapp_log_entity_1 = require("./entities/whatsapp-log.entity");
const social_media_content_entity_1 = require("./entities/social-media-content.entity");
const order_source_entity_1 = require("./entities/order-source.entity");
const inventory_location_entity_1 = require("./entities/inventory-location.entity");
const item_inventory_entity_1 = require("./entities/item-inventory.entity");
let DatabaseModule = class DatabaseModule {
};
exports.DatabaseModule = DatabaseModule;
exports.DatabaseModule = DatabaseModule = __decorate([
    (0, common_1.Module)({
        imports: [
            typeorm_1.TypeOrmModule.forRootAsync({
                imports: [config_1.ConfigModule],
                inject: [config_1.ConfigService],
                useFactory: (configService) => ({
                    type: 'postgres',
                    host: configService.get('DATABASE_HOST', 'localhost'),
                    port: configService.get('DATABASE_PORT', 5432),
                    username: configService.get('DATABASE_USER', 'admin'),
                    password: configService.get('DATABASE_PASSWORD', 'development_password'),
                    database: configService.get('DATABASE_NAME', 'oms_db'),
                    entities: [
                        customer_entity_1.Customer,
                        item_entity_1.Item,
                        item_price_history_entity_1.ItemPriceHistory,
                        order_entity_1.Order,
                        order_item_entity_1.OrderItem,
                        order_status_history_entity_1.OrderStatusHistory,
                        whatsapp_log_entity_1.WhatsappLog,
                        social_media_content_entity_1.SocialMediaContent,
                        order_source_entity_1.OrderSource,
                        inventory_location_entity_1.InventoryLocation,
                        item_inventory_entity_1.ItemInventory,
                    ],
                    migrations: [__dirname + '/migrations/*{.ts,.js}'],
                    synchronize: false,
                    migrationsRun: true,
                    logging: true,
                }),
            }),
        ],
    })
], DatabaseModule);
//# sourceMappingURL=database.module.js.map