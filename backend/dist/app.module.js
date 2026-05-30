"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const app_controller_1 = require("./app.controller");
const app_service_1 = require("./app.service");
const database_module_1 = require("./database/database.module");
const customers_module_1 = require("./modules/customers/customers.module");
const items_module_1 = require("./modules/items/items.module");
const orders_module_1 = require("./modules/orders/orders.module");
const whatsapp_module_1 = require("./modules/whatsapp/whatsapp.module");
const social_media_module_1 = require("./modules/social-media/social-media.module");
const upload_module_1 = require("./modules/upload/upload.module");
const order_sources_module_1 = require("./modules/order-sources/order-sources.module");
const inventories_module_1 = require("./modules/inventories/inventories.module");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule.forRoot({
                isGlobal: true,
            }),
            database_module_1.DatabaseModule,
            customers_module_1.CustomersModule,
            items_module_1.ItemsModule,
            orders_module_1.OrdersModule,
            whatsapp_module_1.WhatsappModule,
            social_media_module_1.SocialMediaModule,
            upload_module_1.UploadModule,
            order_sources_module_1.OrderSourcesModule,
            inventories_module_1.InventoriesModule,
        ],
        controllers: [app_controller_1.AppController],
        providers: [app_service_1.AppService],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map