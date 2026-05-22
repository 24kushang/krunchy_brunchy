import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('social_campaigns')
export class SocialCampaign {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'campaign_name', length: 255 })
  campaignName: string;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @Column({ type: 'text', nullable: true })
  caption: string;

  @Column({ type: 'timestamp', name: 'scheduled_date' })
  scheduledDate: Date;

  @Column('varchar', { array: true })
  platforms: string[];

  @Column({ type: 'text', name: 'image_url', nullable: true })
  imageUrl: string;

  @Column({ name: 'attachment_name', length: 255, nullable: true })
  attachmentName: string;

  @Column({ 
    type: 'varchar', 
    length: 50, 
    default: 'Scheduled'
  })
  status: 'Scheduled' | 'Published' | 'Draft';

  @CreateDateColumn({ type: 'timestamp with time zone', name: 'created_at' })
  createdAt: Date;
}
