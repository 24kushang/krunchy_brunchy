import { Order } from './order.entity';
import { WhatsappLogStatus } from './enums';
export declare class WhatsappLog {
    id: string;
    order: Order;
    recipientName: string;
    recipientContact: string;
    triggeringEvent: string;
    status: WhatsappLogStatus;
    errorMessage: string | null;
    timestamp: Date;
}
