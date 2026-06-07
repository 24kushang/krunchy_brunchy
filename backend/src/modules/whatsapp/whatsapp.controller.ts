import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  ParseIntPipe,
} from '@nestjs/common';
import { WhatsappService } from './whatsapp.service';

@Controller('api/whatsapp')
export class WhatsappController {
  constructor(private readonly whatsappService: WhatsappService) {}

  @Get('logs')
  async getLogs(
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ) {
    const lim = limit ? Number(limit) : 50;
    const off = offset ? Number(offset) : 0;
    const [data, total] = await this.whatsappService.getLogs(lim, off);
    return { data, total };
  }

  @Get('templates')
  async getTemplates() {
    return this.whatsappService.getTemplates();
  }

  @Post('logs/:id/retry')
  async retryMessage(@Param('id') id: string) {
    const updatedLog = await this.whatsappService.retryMessage(id);
    return { success: true, log: updatedLog };
  }
}
