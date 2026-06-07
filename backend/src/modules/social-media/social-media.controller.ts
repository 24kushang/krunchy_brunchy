import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
} from '@nestjs/common';
import { SocialMediaService } from './social-media.service';
import { SocialMediaContent } from '../../database/entities/social-media-content.entity';

@Controller('api/social-media')
export class SocialMediaController {
  constructor(private readonly socialMediaService: SocialMediaService) {}

  @Get()
  async findAll() {
    return this.socialMediaService.findAll();
  }

  @Post()
  async create(
    @Body()
    body: {
      title: string;
      caption: string;
      scheduledAt: Date;
      mediaUrl?: string;
      platforms: string[];
      checklist?: Record<string, boolean>;
    },
  ) {
    return this.socialMediaService.create(body);
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() body: Partial<SocialMediaContent>,
  ) {
    return this.socialMediaService.update(id, body);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    await this.socialMediaService.remove(id);
    return { success: true };
  }
}
