import { Controller, Get, Post, Put, Delete, Param, Body, HttpException, HttpStatus } from '@nestjs/common';
import { SocialService, CampaignDto } from './social.service';

@Controller('api/social-campaigns')
export class SocialController {
  constructor(private readonly socialService: SocialService) {}

  @Get()
  async getCampaigns() {
    try {
      return await this.socialService.getAllCampaigns();
    } catch (err: any) {
      throw new HttpException(err.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Post()
  async createCampaign(@Body() body: CampaignDto) {
    const { campaign_name, scheduled_date, platforms } = body;
    if (!campaign_name || !scheduled_date || !platforms || platforms.length === 0) {
      throw new HttpException('Campaign name, scheduled date, and platforms are required', HttpStatus.BAD_REQUEST);
    }

    try {
      return await this.socialService.createCampaign(body);
    } catch (err: any) {
      throw new HttpException(err.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Put(':id')
  async updateCampaign(@Param('id') id: string, @Body() body: CampaignDto) {
    try {
      const updated = await this.socialService.updateCampaign(parseInt(id, 10), body);
      if (!updated) {
        throw new HttpException('Post not found', HttpStatus.NOT_FOUND);
      }
      return updated;
    } catch (err: any) {
      if (err instanceof HttpException) {
        throw err;
      }
      throw new HttpException(err.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Delete(':id')
  async deleteCampaign(@Param('id') id: string) {
    try {
      const deleted = await this.socialService.deleteCampaign(parseInt(id, 10));
      if (!deleted) {
        throw new HttpException('Post not found', HttpStatus.NOT_FOUND);
      }
      return { success: true, message: 'Post cancelled and deleted' };
    } catch (err: any) {
      if (err instanceof HttpException) {
        throw err;
      }
      throw new HttpException(err.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}
