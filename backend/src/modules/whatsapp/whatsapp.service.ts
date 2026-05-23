import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WhatsappLog } from '../../database/entities/whatsapp-log.entity';
import { WhatsappLogStatus } from '../../database/entities/enums';
import { Order } from '../../database/entities/order.entity';

@Injectable()
export class WhatsappService {
  private readonly logger = new Logger(WhatsappService.name);

  constructor(
    @InjectRepository(WhatsappLog)
    private readonly logRepository: Repository<WhatsappLog>,
  ) {}

  async getLogs(limit = 100, offset = 0): Promise<[WhatsappLog[], number]> {
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

  // Triggered when order status transitions
  async triggerNotification(order: Order, eventName: string): Promise<WhatsappLog> {
    const log = new WhatsappLog();
    log.order = order;
    log.recipientName = order.customer.name;
    log.recipientContact = order.customer.contact;
    log.triggeringEvent = eventName;
    log.status = WhatsappLogStatus.SENT; // initial sent status
    
    const savedLog = await this.logRepository.save(log);
    
    // Async worker queue simulation
    this.runMockWorker(savedLog.id);

    return savedLog;
  }

  // Action button to retry a failed message
  async retryMessage(id: string): Promise<WhatsappLog> {
    const log = await this.logRepository.findOne({ where: { id }, relations: { order: true } });
    if (!log) {
      throw new NotFoundException(`WhatsApp log with ID ${id} not found`);
    }

    log.status = WhatsappLogStatus.SENT;
    log.errorMessage = null;
    log.timestamp = new Date(); // Reset timestamp to current retry time
    const updatedLog = await this.logRepository.save(log);

    this.logger.log(`Retrying WhatsApp message dispatch for Log ID ${id}...`);
    this.runMockWorker(updatedLog.id, true); // Force success on retry

    return updatedLog;
  }

  // Simulates dispatch queue worker
  private runMockWorker(logId: string, forceSuccess = false) {
    // 2-second delay to represent async network call
    setTimeout(async () => {
      try {
        const log = await this.logRepository.findOne({ where: { id: logId } });
        if (!log) return;

        // 5% chance to fail, unless forced to succeed (retry case)
        const isFailed = !forceSuccess && Math.random() < 0.05;

        if (isFailed) {
          log.status = WhatsappLogStatus.FAILED;
          log.errorMessage = 'Meta Cloud API Endpoint Timeout (504)';
          this.logger.warn(`WhatsApp notification delivery failed for Log ID ${logId}`);
        } else {
          log.status = WhatsappLogStatus.DELIVERED;
          this.logger.log(`WhatsApp notification delivered successfully for Log ID ${logId}`);
        }

        await this.logRepository.save(log);
      } catch (err) {
        this.logger.error(`Error in WhatsApp mock worker: ${err.message}`);
      }
    }, 2000);
  }
}
