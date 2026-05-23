import { Repository } from 'typeorm';
import { SocialMediaContent } from '../../database/entities/social-media-content.entity';
export declare class SocialMediaService {
    private readonly socialMediaRepository;
    constructor(socialMediaRepository: Repository<SocialMediaContent>);
    findAll(): Promise<SocialMediaContent[]>;
    findOne(id: string): Promise<SocialMediaContent>;
    create(data: {
        title: string;
        caption: string;
        scheduledAt: Date;
        mediaUrl?: string;
        platforms: string[];
        checklist?: Record<string, boolean>;
    }): Promise<SocialMediaContent>;
    update(id: string, data: Partial<SocialMediaContent>): Promise<SocialMediaContent>;
    remove(id: string): Promise<void>;
}
