import { SocialMediaService } from './social-media.service';
import { SocialMediaContent } from '../../database/entities/social-media-content.entity';
export declare class SocialMediaController {
    private readonly socialMediaService;
    constructor(socialMediaService: SocialMediaService);
    findAll(): Promise<SocialMediaContent[]>;
    create(body: {
        title: string;
        caption: string;
        scheduledAt: Date;
        mediaUrl?: string;
        platforms: string[];
        checklist?: Record<string, boolean>;
    }): Promise<SocialMediaContent>;
    update(id: string, body: Partial<SocialMediaContent>): Promise<SocialMediaContent>;
    remove(id: string): Promise<{
        success: boolean;
    }>;
}
