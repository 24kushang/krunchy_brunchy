import { WhatsappService } from './whatsapp.service';
export declare class WhatsappController {
    private readonly whatsappService;
    constructor(whatsappService: WhatsappService);
    getLogs(limit?: number, offset?: number): Promise<{
        data: import("../../database/entities/whatsapp-log.entity").WhatsappLog[];
        total: number;
    }>;
    getTemplates(): Promise<{
        id: string;
        name: string;
        category: string;
        language: string;
        text: string;
    }[]>;
    retryMessage(id: string): Promise<{
        success: boolean;
        log: import("../../database/entities/whatsapp-log.entity").WhatsappLog;
    }>;
}
