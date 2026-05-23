import { Repository } from 'typeorm';
import { WhatsappLog } from '../../database/entities/whatsapp-log.entity';
import { Order } from '../../database/entities/order.entity';
export declare class WhatsappService {
    private readonly logRepository;
    private readonly logger;
    constructor(logRepository: Repository<WhatsappLog>);
    getLogs(limit?: number, offset?: number): Promise<[WhatsappLog[], number]>;
    getTemplates(): Promise<{
        id: string;
        name: string;
        category: string;
        language: string;
        text: string;
    }[]>;
    triggerNotification(order: Order, eventName: string): Promise<WhatsappLog>;
    retryMessage(id: string): Promise<WhatsappLog>;
    private runMockWorker;
}
