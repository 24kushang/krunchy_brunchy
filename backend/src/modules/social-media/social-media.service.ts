import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SocialMediaContent } from '../../database/entities/social-media-content.entity';

@Injectable()
export class SocialMediaService {
  constructor(
    @InjectRepository(SocialMediaContent)
    private readonly socialMediaRepository: Repository<SocialMediaContent>,
  ) {}

  async findAll(): Promise<SocialMediaContent[]> {
    return this.socialMediaRepository.find({
      order: { scheduledAt: 'ASC' },
    });
  }

  async findOne(id: string): Promise<SocialMediaContent> {
    const post = await this.socialMediaRepository.findOne({ where: { id } });
    if (!post) {
      throw new NotFoundException(`Social media post with ID ${id} not found`);
    }
    return post;
  }

  async create(data: {
    title: string;
    caption: string;
    scheduledAt: Date;
    mediaUrl?: string;
    platforms: string[];
    checklist?: Record<string, boolean>;
  }): Promise<SocialMediaContent> {
    const post = new SocialMediaContent();
    post.title = data.title;
    post.caption = data.caption;
    post.scheduledAt = new Date(data.scheduledAt);
    post.mediaUrl = data.mediaUrl || null;
    post.platforms = data.platforms;
    post.checklist = data.checklist || {
      'Graphic Design': false,
      'Caption Drafted': false,
      'Approval': false,
      'Published': false,
    };

    return this.socialMediaRepository.save(post);
  }

  async update(id: string, data: Partial<SocialMediaContent>): Promise<SocialMediaContent> {
    const post = await this.findOne(id);

    if (data.title !== undefined) post.title = data.title;
    if (data.caption !== undefined) post.caption = data.caption;
    if (data.scheduledAt !== undefined) post.scheduledAt = new Date(data.scheduledAt);
    if (data.mediaUrl !== undefined) post.mediaUrl = data.mediaUrl;
    if (data.platforms !== undefined) post.platforms = data.platforms;
    if (data.checklist !== undefined) post.checklist = data.checklist;

    return this.socialMediaRepository.save(post);
  }

  async remove(id: string): Promise<void> {
    const post = await this.findOne(id);
    await this.socialMediaRepository.remove(post);
  }
}
