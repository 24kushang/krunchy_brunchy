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
var WhatsappService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.WhatsappService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const whatsapp_log_entity_1 = require("../../database/entities/whatsapp-log.entity");
const enums_1 = require("../../database/entities/enums");
let WhatsappService = WhatsappService_1 = class WhatsappService {
    logRepository;
    logger = new common_1.Logger(WhatsappService_1.name);
    constructor(logRepository) {
        this.logRepository = logRepository;
    }
    async getLogs(limit = 100, offset = 0) {
        return this.logRepository.findAndCount({
            relations: { order: true },
            order: { timestamp: 'DESC' },
            take: limit,
            skip: offset,
        });
    }
    async getTemplates() {
        return [
            {
                id: 'order_confirmation',
                name: 'Order Confirmation',
                category: 'Utility',
                language: 'English (US)',
                text: 'Hi {{1}}, thank you for ordering with Krunchy Brunchy! Your order #{{2}} has been successfully received and is currently Pending. Total: Rs. {{3}}.',
            },
            {
                id: 'order_preparing',
                name: 'Order Production Start',
                category: 'Utility',
                language: 'English (US)',
                text: 'Hi {{1}}, we have started preparing your Krunchy Brunchy order #{{2}}! It will be ready to deliver shortly.',
            },
            {
                id: 'ready_to_deliver',
                name: 'Ready for Dispatch',
                category: 'Utility',
                language: 'English (US)',
                text: 'Hi {{1}}, your order #{{2}} has been successfully prepared and is Ready to Deliver! Total due: Rs. {{3}}.',
            },
            {
                id: 'order_delivered',
                name: 'Delivery Completion',
                category: 'Utility',
                language: 'English (US)',
                text: 'Hi {{1}}, your Krunchy Brunchy order #{{2}} has been safely delivered! Thank you for your purchase. Crunch on!',
            },
        ];
    }
    async triggerNotification(order, eventName) {
        const log = new whatsapp_log_entity_1.WhatsappLog();
        log.order = order;
        log.recipientName = order.customer.name;
        log.recipientContact = order.customer.contact;
        log.triggeringEvent = eventName;
        log.status = enums_1.WhatsappLogStatus.SENT;
        const savedLog = await this.logRepository.save(log);
        this.runMockWorker(savedLog.id);
        return savedLog;
    }
    async retryMessage(id) {
        const log = await this.logRepository.findOne({ where: { id }, relations: { order: true } });
        if (!log) {
            throw new common_1.NotFoundException(`WhatsApp log with ID ${id} not found`);
        }
        log.status = enums_1.WhatsappLogStatus.SENT;
        log.errorMessage = null;
        log.timestamp = new Date();
        const updatedLog = await this.logRepository.save(log);
        this.logger.log(`Retrying WhatsApp message dispatch for Log ID ${id}...`);
        this.runMockWorker(updatedLog.id, true);
        return updatedLog;
    }
    runMockWorker(logId, forceSuccess = false) {
        setTimeout(async () => {
            try {
                const log = await this.logRepository.findOne({ where: { id: logId } });
                if (!log)
                    return;
                const isFailed = !forceSuccess && Math.random() < 0.05;
                if (isFailed) {
                    log.status = enums_1.WhatsappLogStatus.FAILED;
                    log.errorMessage = 'Meta Cloud API Endpoint Timeout (504)';
                    this.logger.warn(`WhatsApp notification delivery failed for Log ID ${logId}`);
                }
                else {
                    log.status = enums_1.WhatsappLogStatus.DELIVERED;
                    this.logger.log(`WhatsApp notification delivered successfully for Log ID ${logId}`);
                }
                await this.logRepository.save(log);
            }
            catch (err) {
                this.logger.error(`Error in WhatsApp mock worker: ${err.message}`);
            }
        }, 2000);
    }
};
exports.WhatsappService = WhatsappService;
exports.WhatsappService = WhatsappService = WhatsappService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(whatsapp_log_entity_1.WhatsappLog)),
    __metadata("design:paramtypes", [typeorm_2.Repository])
], WhatsappService);
//# sourceMappingURL=whatsapp.service.js.map