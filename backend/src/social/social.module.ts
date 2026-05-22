import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SocialService } from './social.service';
import { SocialController } from './social.controller';
import { SocialCampaign } from './social-campaign.entity';

@Module({
  imports: [TypeOrmModule.forFeature([SocialCampaign])],
  providers: [SocialService],
  controllers: [SocialController],
  exports: [SocialService],
})
export class SocialModule {}
