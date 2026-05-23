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
exports.WhatsappLog = void 0;
const typeorm_1 = require("typeorm");
const order_entity_1 = require("./order.entity");
const enums_1 = require("./enums");
let WhatsappLog = class WhatsappLog {
    id;
    order;
    recipientName;
    recipientContact;
    triggeringEvent;
    status;
    errorMessage;
    timestamp;
};
exports.WhatsappLog = WhatsappLog;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], WhatsappLog.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => order_entity_1.Order, (order) => order.whatsappLogs, { nullable: true, onDelete: 'SET NULL' }),
    __metadata("design:type", order_entity_1.Order)
], WhatsappLog.prototype, "order", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 150 }),
    __metadata("design:type", String)
], WhatsappLog.prototype, "recipientName", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 50 }),
    __metadata("design:type", String)
], WhatsappLog.prototype, "recipientContact", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 100 }),
    __metadata("design:type", String)
], WhatsappLog.prototype, "triggeringEvent", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'enum', enum: enums_1.WhatsappLogStatus }),
    __metadata("design:type", String)
], WhatsappLog.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", Object)
], WhatsappLog.prototype, "errorMessage", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], WhatsappLog.prototype, "timestamp", void 0);
exports.WhatsappLog = WhatsappLog = __decorate([
    (0, typeorm_1.Entity)('whatsapp_logs')
], WhatsappLog);
//# sourceMappingURL=whatsapp-log.entity.js.map