import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SocialCampaign } from './social-campaign.entity';

export interface CampaignDto {
  campaign_name: string;
  notes?: string;
  caption?: string;
  scheduled_date: string;
  platforms: string[];
  image_url?: string;
  attachment_name?: string;
  status?: string;
}

@Injectable()
export class SocialService {
  constructor(
    @InjectRepository(SocialCampaign)
    private readonly campaignRepository: Repository<SocialCampaign>,
  ) {}

  private mapCampaign(campaign: SocialCampaign) {
    if (!campaign) return null;
    return {
      id: campaign.id,
      campaign_name: campaign.campaignName,
      notes: campaign.notes,
      caption: campaign.caption,
      scheduled_date: campaign.scheduledDate,
      platforms: campaign.platforms,
      image_url: campaign.imageUrl,
      attachment_name: campaign.attachmentName,
      status: campaign.status,
      created_at: campaign.createdAt,
    };
  }

  async getAllCampaigns() {
    const campaigns = await this.campaignRepository.find({ order: { scheduledDate: 'ASC' } });
    return campaigns.map(c => this.mapCampaign(c));
  }

  async createCampaign(dto: CampaignDto) {
    const { campaign_name, notes, caption, scheduled_date, platforms, image_url, attachment_name } = dto;
    const campaign = this.campaignRepository.create({
      campaignName: campaign_name,
      notes: notes || '',
      caption: caption || '',
      scheduledDate: new Date(scheduled_date),
      platforms,
      imageUrl: image_url || '',
      attachmentName: attachment_name || '',
      status: 'Scheduled',
    });
    const saved = await this.campaignRepository.save(campaign);
    return this.mapCampaign(saved);
  }

  async updateCampaign(id: number, dto: CampaignDto) {
    const { campaign_name, notes, caption, scheduled_date, platforms, image_url, attachment_name, status } = dto;
    const campaign = await this.campaignRepository.findOne({ where: { id } });
    if (!campaign) {
      return null;
    }

    campaign.campaignName = campaign_name;
    campaign.notes = notes || '';
    campaign.caption = caption || '';
    campaign.scheduledDate = new Date(scheduled_date);
    campaign.platforms = platforms;
    campaign.imageUrl = image_url || '';
    campaign.attachmentName = attachment_name || '';
    campaign.status = (status || 'Scheduled') as any;

    const saved = await this.campaignRepository.save(campaign);
    return this.mapCampaign(saved);
  }

  async deleteCampaign(id: number) {
    const result = await this.campaignRepository.delete(id);
    return typeof result.affected === 'number' && result.affected > 0;
  }
}
