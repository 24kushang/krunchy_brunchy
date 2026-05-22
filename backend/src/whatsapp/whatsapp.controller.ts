import { Controller, Get, Post, Body, HttpException, HttpStatus } from '@nestjs/common';
import { WhatsappService } from './whatsapp.service';

@Controller('api/whatsapp-logs')
export class WhatsappController {
  constructor(private readonly whatsappService: WhatsappService) {}

  @Get()
  async getLogs() {
    try {
      return await this.whatsappService.getLogs();
    } catch (err: any) {
      throw new HttpException(err.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Post('promotion')
  async sendPromotion(@Body() body: { contacts: string[]; message: string }) {
    const { contacts, message } = body;
    if (!contacts || contacts.length === 0 || !message) {
      throw new HttpException('Recipients list and message content are required', HttpStatus.BAD_REQUEST);
    }

    try {
      const deliveryResults = [];
      for (const contact of contacts) {
        const waRes = await this.whatsappService.sendMessage({
          recipient: contact,
          message,
          templateType: 'Promotion',
        });
        deliveryResults.push({
          contact,
          status: waRes.status,
          success: waRes.success,
        });
      }

      return {
        success: true,
        results: deliveryResults,
      };
    } catch (err: any) {
      throw new HttpException(err.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}
